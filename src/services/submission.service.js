/**
 * Submission Service
 * Business logic + transaction management
 */

import { pool } from '../config/db.js';
import * as submissionRepository from '../repositories/submission.repository.js';
import * as emailService from './email.service.js';

function parsePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function createHttpError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function validateDocumentType(documentType) {
    if (!['outline', 'report'].includes(documentType)) {
        throw createHttpError('ประเภทเอกสารไม่ถูกต้อง', 400);
    }
}

function validateReviewAction(action, reason) {
    if (!['approved', 'rejected'].includes(action)) {
        throw createHttpError('การดำเนินการไม่ถูกต้อง', 400);
    }

    if (action === 'rejected' && (!reason || !String(reason).trim())) {
        throw createHttpError('กรุณาระบุเหตุผลการปฏิเสธ', 400);
    }
}

export async function getMySubjectsWithStatus(termId, instructorId) {
    const parsedTermId = parsePositiveInt(termId);
    if (!parsedTermId) {
        throw createHttpError('รหัสภาคการศึกษาไม่ถูกต้อง', 400);
    }

    const parsedInstructorId = parsePositiveInt(instructorId);
    if (!parsedInstructorId) {
        throw createHttpError('ข้อมูลผู้ใช้งานไม่ถูกต้อง', 401);
    }

    const client = await pool.connect();
    try {
        return await submissionRepository.getMySubjectsWithStatus(client, parsedTermId, parsedInstructorId);
    } finally {
        client.release();
    }
}

export async function createSubmission(payload, submittedBy) {
    const termSubjectId = parsePositiveInt(payload?.term_subject_id);
    if (!termSubjectId) {
        throw createHttpError('รหัสรายวิชาในภาคการศึกษาไม่ถูกต้อง', 400);
    }

    const documentType = payload?.document_type;
    validateDocumentType(documentType);

    const fileUrl = payload?.file_url ? String(payload.file_url).trim() : '';
    const originalName = payload?.original_name ? String(payload.original_name).trim() : '';

    if (!fileUrl || !originalName) {
        throw createHttpError('ข้อมูลไฟล์ไม่ครบถ้วน', 400);
    }

    const parsedSubmittedBy = parsePositiveInt(submittedBy);
    if (!parsedSubmittedBy) {
        throw createHttpError('ข้อมูลผู้ใช้งานไม่ถูกต้อง', 401);
    }

    const client = await pool.connect();
    try {
        const hasSubmitter = await submissionRepository.userExists(client, parsedSubmittedBy);
        if (!hasSubmitter) {
            throw createHttpError('ไม่พบข้อมูลผู้ใช้งาน', 401);
        }

        await client.query('BEGIN');

        const created = await submissionRepository.createSubmission(client, {
            termSubjectId,
            documentType,
            fileUrl,
            originalName,
            submittedBy: parsedSubmittedBy,
        });

        await submissionRepository.markTermSubjectSubmissionPending(
            client,
            termSubjectId,
            documentType
        );

        await client.query('COMMIT');
        return created;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function reviewSubmission(submissionId, payload, reviewerId) {
    const parsedSubmissionId = parsePositiveInt(submissionId);
    if (!parsedSubmissionId) {
        throw createHttpError('รหัสการส่งเอกสารไม่ถูกต้อง', 400);
    }

    const parsedReviewerId = parsePositiveInt(reviewerId);
    if (!parsedReviewerId) {
        throw createHttpError('ข้อมูลผู้ตรวจสอบไม่ถูกต้อง', 401);
    }

    const action = payload?.action;
    const note = payload?.note;
    const reason = payload?.reason;

    validateReviewAction(action, reason);

    const client = await pool.connect();
    try {
        const hasReviewer = await submissionRepository.userExists(client, parsedReviewerId);
        if (!hasReviewer) {
            throw createHttpError('ไม่พบข้อมูลผู้ตรวจสอบ', 401);
        }

        await client.query('BEGIN');

        const reviewed = await submissionRepository.reviewSubmission(client, parsedSubmissionId, {
            action,
            note,
            reason,
            reviewerId: parsedReviewerId,
        });

        if (!reviewed) {
            throw createHttpError('ไม่พบรายการส่งเอกสาร', 404);
        }

        await submissionRepository.updateTermSubjectApproval(
            client,
            reviewed.submission.term_subject_id,
            reviewed.submission.document_type,
            action
        );

        await client.query('COMMIT');

        // ดึงข้อมูล email ก่อน release client (ภายหลัง transaction commit แล้ว)
        try {
            const emailDetails = await submissionRepository.getSubmissionEmailDetails(
                client,
                parsedSubmissionId
            );

            console.log('[Service] emailDetails from DB:', emailDetails);

            if (emailDetails?.email) {
                console.log('[Service] Calling sendReviewNotification with:', {
                    to: emailDetails.email,
                    subjectCode: emailDetails.subject_code
                });
                // ไม่ await — fire-and-forget, ไม่ block response
                emailService.sendReviewNotification({
                    to: emailDetails.email,
                    instructorName: emailDetails.instructor_name,
                    documentType: emailDetails.document_type === 'outline'
                        ? 'เค้าโครงรายวิชา'
                        : 'รายงานผล',
                    action,
                    note: note || null,
                    reason: reason || null,
                    subjectCode: emailDetails.subject_code,
                    subjectName: emailDetails.subject_name,
                }).catch(err => console.error('[Email] review notification failed:', err));
            }
        } catch (err) {
            console.error('[Email] Failed to fetch email details for submission', parsedSubmissionId, ':', err.message);
        }

        return reviewed;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function getSubmissionHistory(termSubjectId, documentType) {
    const parsedTermSubjectId = parsePositiveInt(termSubjectId);
    if (!parsedTermSubjectId) {
        throw createHttpError('รหัสรายวิชาในภาคการศึกษาไม่ถูกต้อง', 400);
    }

    validateDocumentType(documentType);

    const client = await pool.connect();
    try {
        return await submissionRepository.getSubmissionHistory(client, parsedTermSubjectId, documentType);
    } finally {
        client.release();
    }
}
