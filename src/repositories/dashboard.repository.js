/**
 * Dashboard Repository
 * จัดการ queries ที่ซับซ้อนสำหรับ Dashboard
 * - Summary statistics (รายวิชาทั้งหมด, เค้าโครง, ภาระงาน, รายงาน)
 * - Average workload per year level
 * - Workload chart data per week
 */

import { pool } from '../config/db.js';

/**
 * ดึงข้อมูล Summary Statistics สำหรับ Dashboard
 * @param {Object} client - Database client
 * @param {number} termId - ID ของ term ที่ต้องการดูข้อมูล
 * @returns {Promise<Object>} สถิติรวมทั้งหมด
 */
export async function getSummaryStats(client, termId) {
    const query = `
        SELECT
            -- 1 รายวิชาทั้งหมด: นับจำนวน term_subjects
            COUNT(ts.id) AS total_subjects,

            -- 2 เค้าโครงรายวิชา: นับวิชาที่มี outline_status = true
            COUNT(CASE
                WHEN ts.outline_status = true THEN 1
            END) AS outline_submitted_count,

            -- 3 ภาระงาน: นับวิชาที่มี workload_status = true
            COUNT(CASE
                WHEN ts.workload_status = true THEN 1
            END) AS workload_filled_count,

            -- 4 รายงานผล: นับวิชาที่มี report_status = true
            COUNT(CASE
                WHEN ts.report_status = true THEN 1
            END) AS report_submitted_count

        FROM term_subjects ts
        WHERE ts.term_id = $1
    `;

    const result = await client.query(query, [termId]);
    const row = result.rows[0];

    return {
        totalSubjects: parseInt(row.total_subjects) || 0,
        outlineSubmitted: parseInt(row.outline_submitted_count) || 0,
        workloadFilled: parseInt(row.workload_filled_count) || 0,
        reportSubmitted: parseInt(row.report_submitted_count) || 0
    };
}

/**
 * ดึงค่าเฉลี่ยภาระงาน (hours_per_week) แยกตามปีการศึกษา (year_level)
 * @param {Object} client - Database client
 * @param {number} termId - ID ของ term
 * @returns {Promise<Array>} Array ของ {yearLevel, avgHours}
 */
export async function getAverageWorkloadByYear(client, termId) {
    const query = `
        SELECT
            ssy.student_year AS year_level,
            COALESCE(ROUND(AVG(wd.hours_per_week)::numeric, 1), 0) AS avg_hours
        FROM term_subjects ts

        -- JOIN กับ subjects เพื่อดึงรายวิชา
        INNER JOIN subjects s
            ON ts.subject_id = s.id

        -- JOIN กับ subjects_student_years เพื่อดึงชั้นปี
        INNER JOIN subjects_student_years ssy_link
            ON s.id = ssy_link.subject_id

        -- JOIN กับ student_years เพื่อดึงเลขชั้นปี
        INNER JOIN student_years ssy
            ON ssy_link.student_year_id = ssy.id

        -- LEFT JOIN กับ work_details
        LEFT JOIN work_details wd
            ON ts.id = wd.term_subject_id

        WHERE ts.term_id = $1

        GROUP BY ssy.student_year
        ORDER BY ssy.student_year ASC
    `;

    const result = await client.query(query, [termId]);

    // สร้าง result สำหรับปี 1-4 (ถ้าไม่มีข้อมูลให้ 0)
    const yearData = [1, 2, 3, 4].map(year => {
        const found = result.rows.find(row => row.year_level === year);
        return {
            yearLevel: year,
            avgHours: found ? parseFloat(found.avg_hours) : 0
        };
    });

    return yearData;
}

/**
 * ดึงข้อมูล Workload Chart แยกตามสัปดาห์
 * สามารถ filter ตาม year_levels ได้
 *
 * @param {Object} client - Database client
 * @param {number} termId - ID ของ term
 * @param {Array<number>} yearLevels - Array ของ year levels ที่ต้องการดู เช่น [1, 2] หรือ [1,2,3,4]
 * @returns {Promise<Array>} Array ของ {week, totalHours}
 */
export async function getWorkloadChartData(client, termId, yearLevels = [1, 2, 3, 4]) {
    // สร้าง placeholder สำหรับ year_levels
    const placeholders = yearLevels.map((_, idx) => `$${idx + 2}`).join(',');

    const query = `
        WITH RECURSIVE weeks AS (
            -- สร้างตารางสัปดาห์ 1-15
            SELECT 1 AS week_number
            UNION ALL
            SELECT week_number + 1
            FROM weeks
            WHERE week_number < 15
        ),
        filtered_workloads AS (
            -- ดึงข้อมูล work_details ที่ filter แล้ว
            SELECT
                wd.hours_per_week,
                wd.start_date,
                wd.end_date,
                t.term_start_date
            FROM work_details wd
            INNER JOIN term_subjects ts ON wd.term_subject_id = ts.id
            INNER JOIN terms t ON ts.term_id = t.id
            INNER JOIN subjects s ON ts.subject_id = s.id
            INNER JOIN subjects_student_years ssy_link ON s.id = ssy_link.subject_id
            INNER JOIN student_years ssy ON ssy_link.student_year_id = ssy.id
            WHERE ts.term_id = $1
              AND ssy.student_year IN (${placeholders})
        )
        SELECT
            w.week_number,
            COALESCE(SUM(
                CASE
                    -- ตรวจสอบว่า work นี้อยู่ในสัปดาห์ที่เท่าไหร่
                    WHEN fw.start_date <= (fw.term_start_date + ((w.week_number) * INTERVAL '7 days'))
                     AND fw.end_date >= (fw.term_start_date + ((w.week_number - 1) * INTERVAL '7 days'))
                    THEN fw.hours_per_week
                    ELSE 0
                END
            ), 0) AS total_hours
        FROM weeks w
        LEFT JOIN filtered_workloads fw ON 1=1
        GROUP BY w.week_number
        ORDER BY w.week_number ASC
    `;

    const params = [termId, ...yearLevels];
    const result = await client.query(query, params);

    return result.rows.map(row => ({
        week: row.week_number,
        totalHours: parseFloat(row.total_hours) || 0
    }));
}

/**
 * ดึงข้อมูล Active Term (Hybrid approach)
 * 1. หา term ที่ถูก set is_active = true
 * 2. fallback: หา term ที่วันปัจจุบันอยู่ในช่วง term_start_date ถึง term_end_date
 * 3. fallback: เอา term ล่าสุด
 * @param {Object} client - Database client
 * @returns {Promise<Object|null>} ข้อมูล term หรือ null ถ้าไม่มี
 */
export async function getActiveTerm(client) {
    // 1 หา term ที่ถูก set active
    const activeQuery = `
        SELECT
            id,
            academic_year,
            academic_sector,
            term_start_date,
            term_end_date
        FROM terms
        WHERE is_active = true
        ORDER BY academic_year DESC, academic_sector DESC
        LIMIT 1
    `;

    const activeResult = await client.query(activeQuery);
    if (activeResult.rows[0]) {
        return activeResult.rows[0];
    }

    // 2 fallback: ใช้วันที่
    const dateQuery = `
        SELECT
            id,
            academic_year,
            academic_sector,
            term_start_date,
            term_end_date
        FROM terms
        WHERE CURRENT_DATE BETWEEN term_start_date AND term_end_date
        ORDER BY academic_year DESC, academic_sector DESC
        LIMIT 1
    `;

    const dateResult = await client.query(dateQuery);
    if (dateResult.rows[0]) {
        return dateResult.rows[0];
    }

    // 3 fallback: term ล่าสุด
    const fallbackQuery = `
        SELECT
            id,
            academic_year,
            academic_sector,
            term_start_date,
            term_end_date
        FROM terms
        ORDER BY academic_year DESC, academic_sector DESC
        LIMIT 1
    `;

    const fallbackResult = await client.query(fallbackQuery);
    return fallbackResult.rows[0] || null;
}

/**
 * ดึง term subjects พร้อม workload รวมต่อสัปดาห์สำหรับ student dashboard
 * Single query — no N+1
 * Returns all subjects in the term with workload computed server-side
 *
 * @param {Object} client - Database client
 * @param {number} termId - Term ID
 * @returns {Promise<Array>} List of subjects with workload data
 */
export async function getStudentSubjectsWithWorkload(client, termId) {
    // Simple approach: fetch subjects first, then fetch works and calculate weekly_hours in JS
    // This avoids complex SQL and is more maintainable

    console.log('[getStudentSubjectsWithWorkload] Starting for termId:', termId);

    const subjectsQuery = `
        SELECT
            ts.id,
            ts.subject_id,
            s.code_eng,
            s.code_th,
            s.name_th,
            s.name_eng,
            s.credit AS credits,
            t.term_start_date,
            COALESCE(
                jsonb_agg(DISTINCT sy.student_year) FILTER (WHERE sy.id IS NOT NULL),
                '[]'::jsonb
            ) AS student_year_ids
        FROM term_subjects ts
        INNER JOIN subjects s ON s.id = ts.subject_id
        INNER JOIN terms t ON t.id = ts.term_id
        LEFT JOIN subjects_student_years ssy ON ssy.subject_id = s.id
        LEFT JOIN student_years sy ON sy.id = ssy.student_year_id
        WHERE ts.term_id = $1 AND ts.is_active = true
        GROUP BY ts.id, s.id, t.term_start_date
        ORDER BY COALESCE(s.code_eng, s.code_th) ASC
    `;

    console.log('[getStudentSubjectsWithWorkload] Executing subjects query...');
    const subjectsResult = await client.query(subjectsQuery, [termId]);
    const subjects = subjectsResult.rows;
    console.log('[getStudentSubjectsWithWorkload] Got', subjects.length, 'subjects');

    // Fetch all works for this term in one query
    const worksQuery = `
        SELECT
            wd.term_subject_id,
            wd.start_date,
            wd.end_date,
            wd.hours_per_week
        FROM work_details wd
        INNER JOIN term_subjects ts ON ts.id = wd.term_subject_id
        WHERE ts.term_id = $1
    `;

    console.log('[getStudentSubjectsWithWorkload] Executing works query...');
    const worksResult = await client.query(worksQuery, [termId]);
    const worksMap = new Map();

    // Group works by term_subject_id
    worksResult.rows.forEach(work => {
        if (!worksMap.has(work.term_subject_id)) {
            worksMap.set(work.term_subject_id, []);
        }
        worksMap.get(work.term_subject_id).push(work);
    });
    console.log('[getStudentSubjectsWithWorkload] Got', worksResult.rows.length, 'works');

    // Calculate weekly hours for each subject
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    const WEEKS = 15;

    const result = subjects.map(subject => {
        const termStartDate = new Date(subject.term_start_date);
        const weeklyHours = Array(WEEKS).fill(0);
        const works = worksMap.get(subject.id) || [];
        let totalHours = 0;

        works.forEach(work => {
            const hpw = Number(work.hours_per_week) || 0;
            if (!hpw) return;

            const workStart = new Date(work.start_date);
            const workEnd = new Date(work.end_date);
            const startWeek = Math.max(0, Math.floor((workStart - termStartDate) / MS_PER_WEEK));
            const endWeek = Math.min(WEEKS - 1, Math.floor((workEnd - termStartDate) / MS_PER_WEEK));

            for (let w = startWeek; w <= endWeek; w++) {
                weeklyHours[w] += hpw;
                totalHours += hpw;
            }
        });

        return {
            id: subject.id,
            subject_id: subject.subject_id,
            code_eng: subject.code_eng,
            code_th: subject.code_th,
            name_th: subject.name_th,
            name_eng: subject.name_eng,
            credits: Number(subject.credits) || 0,
            student_year_ids: subject.student_year_ids || [],
            workload_count: works.length,
            weekly_hours: weeklyHours,
            total_hours: totalHours,
        };
    });

    console.log('[getStudentSubjectsWithWorkload] Returning', result.length, 'subjects with computed hours');
    return result;
}

export default {
    getSummaryStats,
    getAverageWorkloadByYear,
    getWorkloadChartData,
    getActiveTerm,
    getStudentSubjectsWithWorkload
};
