/**
 * Reminder Repository
 * Query อาจารย์ที่ต้องได้รับ email reminder เค้าโครงรายวิชา
 */

import { pool } from '../config/db.js';

/**
 * ดึงรายชื่ออาจารย์ที่ยังไม่ส่ง หรือถูก reject เค้าโครงรายวิชา
 * สำหรับ term ที่ term_start_date อยู่ในช่วง CURRENT_DATE ± 7 วัน
 *
 * @param {Object} client - pg client (default: pool)
 * @returns {Promise<Array<{
 *   email: string,
 *   instructor_name: string,
 *   subject_name: string,
 *   subject_code: string,
 *   term_label: string,
 *   term_start_date: Date
 * }>>}
 */
export async function getPendingOutlineRecipients(client = pool) {
    const sql = `
        SELECT
            u.email,
            CONCAT(u.first_name_th, ' ', u.last_name_th)   AS instructor_name,
            COALESCE(s.name_th, s.name_eng)                 AS subject_name,
            COALESCE(s.code_eng, s.code_th)                 AS subject_code,
            t.academic_sector || '/' || t.academic_year     AS term_label,
            t.term_start_date
        FROM terms t
        INNER JOIN term_subjects ts
            ON ts.term_id = t.id
           AND ts.is_active = true
        INNER JOIN term_subjects_professor tsp
            ON tsp.term_subject_id = ts.id
        INNER JOIN users u
            ON u.id = tsp.user_id
        INNER JOIN subjects s
            ON s.id = ts.subject_id
        WHERE
            CURRENT_DATE BETWEEN (t.term_start_date - INTERVAL '7 days')
                              AND (t.term_start_date + INTERVAL '7 days')
          AND (
                ts.outline_approved IS NULL
             OR ts.outline_approved = 'rejected'
          )
          AND u.email IS NOT NULL
        ORDER BY t.term_start_date, u.email, s.code_th
    `;

    const result = await client.query(sql);
    return result.rows;
}
