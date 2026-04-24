/**
 * Reminder Service
 * หาอาจารย์ที่ต้องได้รับ reminder วันนี้ และส่ง batch
 *
 * ตาราง schedule ที่ส่ง (D = term_start_date):
 *   ก่อนเปิดเทอม : D-7, D-4, D-1
 *   วันเปิดเทอม  : D
 *   หลังเปิดเทอม : D+1 ถึง D+7 (ทุกวัน)
 *   นอกจากนั้น   → ไม่ส่ง
 */

import { pool } from '../config/db.js';
import { getPendingOutlineRecipients } from '../repositories/reminder.repository.js';
import { sendReminderEmail } from './email.service.js';

/**
 * เช็คว่าวันนี้ควรส่ง reminder สำหรับ term นี้ไหม
 * @param {Date|string} termStartDate
 * @returns {boolean}
 */
function shouldSendToday(termStartDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const D = new Date(termStartDate);
    D.setHours(0, 0, 0, 0);

    // diffDays > 0 หมายความว่าวันนี้อยู่หลัง D (เปิดเทอมแล้ว)
    // diffDays < 0 หมายความว่าวันนี้อยู่ก่อน D (ยังไม่เปิดเทอม)
    const diffDays = Math.round((today - D) / (1000 * 60 * 60 * 24));

    const preOpenDays = new Set([-7, -4, -1]);
    return preOpenDays.has(diffDays) || (diffDays >= 0 && diffDays <= 7);
}

/**
 * หาอาจารย์ที่ต้องได้รับ reminder วันนี้
 * @returns {Promise<Array>}
 */
export async function getPendingReminders() {
    const client = await pool.connect();
    try {
        const rows = await getPendingOutlineRecipients(client);
        return rows.filter(row => shouldSendToday(row.term_start_date));
    } finally {
        client.release();
    }
}

/**
 * ส่ง reminder batch และ return สถิติ
 * @returns {Promise<{sent: number, failed: number}>}
 */
export async function sendPendingReminders() {
    const recipients = await getPendingReminders();

    let sent   = 0;
    let failed = 0;

    for (const recipient of recipients) {
        const result = await sendReminderEmail({
            to:             recipient.email,
            instructorName: recipient.instructor_name,
            subjectName:    recipient.subject_name,
            subjectCode:    recipient.subject_code,
            termLabel:      recipient.term_label,
            deadline:       recipient.term_start_date,
        });

        if (result.success) {
            sent++;
        } else {
            failed++;
        }
    }

    console.log(`[Reminder] Batch complete — sent: ${sent}, failed: ${failed}, total: ${recipients.length}`);
    return { sent, failed };
}
