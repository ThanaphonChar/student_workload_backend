/**
 * Email Repository
 * บันทึกผลการส่ง email ลงในตาราง email_logs
 */

import { pool } from '../config/db.js';

/**
 * บันทึก log ผล email
 * @param {Object} client                  - pg client (default: pool)
 * @param {Object} data
 * @param {string} data.recipient
 * @param {string} data.emailType          - 'review_notification' | 'reminder'
 * @param {string|null} data.subjectRef
 * @param {string} data.status             - 'sent' | 'failed'
 * @param {string|null} data.errorMessage
 * @returns {Promise<{id: number}>}
 */
export async function insertEmailLog(client = pool, { recipient, emailType, subjectRef = null, status, errorMessage = null }) {
    const sql = `
        INSERT INTO email_logs (recipient, email_type, subject_ref, status, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
    `;
    const result = await client.query(sql, [recipient, emailType, subjectRef, status, errorMessage]);
    return result.rows[0];
}
