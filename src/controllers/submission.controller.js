/**
 * Submission Controller
 * Request/response handling only
 */

import * as submissionService from '../services/submission.service.js';

function handleControllerError(res, error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในระบบ',
    });
}

export async function getMySubjectsWithStatus(req, res) {
    try {
        const data = await submissionService.getMySubjectsWithStatus(req.params.termId, req.user?.id);

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
}

export async function createSubmission(req, res) {
    try {
        const data = await submissionService.createSubmission(req.body, req.user?.id);

        return res.status(201).json({
            success: true,
            message: 'ส่งเอกสารสำเร็จ',
            data,
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
}

export async function reviewSubmission(req, res) {
    try {
        const data = await submissionService.reviewSubmission(
            req.params.submissionId,
            req.body,
            req.user?.id
        );

        return res.status(200).json({
            success: true,
            message: 'บันทึกผลการตรวจสอบสำเร็จ',
            data,
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
}

export async function getSubmissionHistory(req, res) {
    try {
        const data = await submissionService.getSubmissionHistory(
            req.params.termSubjectId,
            req.params.documentType
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return handleControllerError(res, error);
    }
}
