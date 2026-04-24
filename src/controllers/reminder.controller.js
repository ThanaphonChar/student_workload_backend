/**
 * Reminder Controller
 * Internal endpoint handler — ไม่มี business logic
 */

import { sendPendingReminders } from '../services/reminder.service.js';

export async function sendReminders(req, res) {
    try {
        const result = await sendPendingReminders();
        const date   = new Date().toISOString().split('T')[0];

        return res.status(200).json({
            success: true,
            sent:    result.sent,
            failed:  result.failed,
            date,
        });
    } catch (error) {
        console.error('[Reminder Controller] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่ง reminder',
        });
    }
}
