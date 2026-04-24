/**
 * Email Service
 * Nodemailer Gmail SMTP + HTML template rendering
 *
 * Prerequisites: npm install nodemailer
 *
 * .env variables required:
 *   EMAIL_USER=xxx@gmail.com
 *   EMAIL_PASS=xxxx          (Gmail App Password)
 *   EMAIL_FROM="SCITU System <xxx@gmail.com>"
 *   FRONTEND_URL=https://your-frontend.com  (optional — used in reminder CTA button)
 */

import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/db.js';
import { insertEmailLog } from '../repositories/email.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');

const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * แทนที่ {{key}} ทั้งหมดในเทมเพลต HTML
 * @param {string} filename  - ชื่อไฟล์ใน src/templates/
 * @param {Object} variables - { key: value }
 * @returns {Promise<string>} HTML string
 */
async function renderTemplate(filename, variables) {
    const raw = await readFile(join(TEMPLATES_DIR, filename), 'utf-8');
    console.log('[Email] renderTemplate variables:', variables);
    const result = Object.entries(variables).reduce(
        (html, [key, value]) => {
            console.log(`[Email] Replacing {{${key}}} with:`, value);
            return html.replaceAll(`{{${key}}}`, value ?? '');
        },
        raw,
    );
    return result;
}

/**
 * ส่ง email แจ้งผลการ review เอกสาร (อนุมัติ / ปฏิเสธ)
 * Fire-and-forget: ไม่ throw — log error เท่านั้น
 *
 * @param {Object} data
 * @param {string}      data.to
 * @param {string}      data.instructorName
 * @param {string}      data.documentType    - 'เค้าโครงรายวิชา' | 'รายงานผล'
 * @param {string}      data.action          - 'approved' | 'rejected'
 * @param {string|null} data.note
 * @param {string|null} data.reason
 * @param {string}      data.subjectName
 * @returns {Promise<{success: boolean}>}
 */
export async function sendReviewNotification({ to, instructorName, documentType, action, note, reason, subjectName, subjectCode }) {
    const isApproved = action === 'approved';
    const templateFile = isApproved ? 'reviewApproved.html' : 'reviewRejected.html';

    // Debug logging
    console.log('[Email] Sending review notification:', {
        to,
        instructorName,
        documentType,
        action,
        subjectCode,
        subjectName,
    });

    const subject = isApproved
        ? `[SCITU] เอกสาร${documentType}ของท่านได้รับการอนุมัติแล้ว`
        : `[SCITU] เอกสาร${documentType}ของท่านไม่ได้รับการอนุมัติ`;

    const noteSection = note
        ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:12px 16px;margin:16px 0;">
             <p style="margin:0;color:#0369a1;font-size:14px;"><strong>หมายเหตุ:</strong> ${note}</p>
           </div>`
        : '';

    const reasonSection = reason
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:16px 0;">
             <p style="margin:0;color:#dc2626;font-size:14px;"><strong>เหตุผล:</strong> ${reason}</p>
           </div>`
        : '';

    let status = 'sent';
    let errorMessage = null;

    try {
        console.log('[Email] renderTemplate inputs:', {
            templateFile,
            instructorName,
            documentType,
            subjectCode,
            subjectName,
        });

        const html = await renderTemplate(templateFile, {
            instructorName,
            documentType,
            subjectCode,
            subjectName,
            noteSection,
            reasonSection,
        });

        await transport.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
        });
    } catch (err) {
        console.error('[Email] sendReviewNotification failed for', to, ':', err.message);
        status = 'failed';
        errorMessage = err.message;
    }

    try {
        await insertEmailLog(pool, {
            recipient: to,
            emailType: 'review_notification',
            subjectRef: null,
            status,
            errorMessage,
        });
    } catch (logErr) {
        console.error('[Email] Failed to write review_notification log:', logErr.message);
    }

    return { success: status === 'sent' };
}

/**
 * ส่ง reminder email รายเดี่ยว
 * Fire-and-forget: ไม่ throw — log error เท่านั้น
 *
 * @param {Object}      data
 * @param {string}      data.to
 * @param {string}      data.instructorName
 * @param {string}      data.subjectName
 * @param {string}      data.subjectCode
 * @param {string}      data.termLabel
 * @param {Date|string} data.deadline        - term_start_date
 * @returns {Promise<{success: boolean}>}
 */
export async function sendReminderEmail({ to, instructorName, subjectName, subjectCode, termLabel, deadline }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - deadlineDate) / (1000 * 60 * 60 * 24));

    let daysLeftText;
    if (diffDays < 0) {
        daysLeftText = `อีก ${Math.abs(diffDays)} วันก่อนถึงวันเปิดเทอม`;
    } else if (diffDays === 0) {
        daysLeftText = 'วันนี้เป็นวันเปิดเทอม — กรุณาส่งเอกสารโดยด่วน';
    } else {
        daysLeftText = `เกินวันเปิดเทอมมาแล้ว ${diffDays} วัน — กรุณาส่งเอกสารทันที`;
    }

    const deadlineFormatted = deadlineDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const loginUrl = process.env.FRONTEND_URL || '#';

    let status = 'sent';
    let errorMessage = null;

    try {
        const html = await renderTemplate('reminder.html', {
            instructorName,
            subjectName,
            subjectCode,
            termLabel,
            deadline: deadlineFormatted,
            daysLeft: daysLeftText,
            loginUrl,
        });

        await transport.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject: `[SCITU] แจ้งเตือน: กรุณาส่งเอกสารเค้าโครงรายวิชา ${subjectCode}`,
            html,
        });
    } catch (err) {
        console.error('[Email] sendReminderEmail failed for', to, ':', err.message);
        status = 'failed';
        errorMessage = err.message;
    }

    try {
        await insertEmailLog(pool, {
            recipient: to,
            emailType: 'reminder',
            subjectRef: subjectCode,
            status,
            errorMessage,
        });
    } catch (logErr) {
        console.error('[Email] Failed to write reminder log:', logErr.message);
    }

    return { success: status === 'sent' };
}
