/**
 * Work Controller
 * 
 * HTTP request handlers สำหรับ workload management
 * รับ request -> เรียก service -> ส่ง response
 * 
 * Convention:
 * - เฉพาะ HTTP handling เท่านั้น
 * - ไม่มี business logic
 * - ใช้ consistent response structure
 * - Handle error ด้วย handleError function
 */

import * as workService from '../services/work.service.js';
import { WorkValidationError } from '../utils/workValidation.js';

/**
 * Common error handler
 * จัดการการ return response สำหรับ error types ต่าง ๆ
 * 
 * @param {object} res - Express response object
 * @param {Error} error - Error object
 */
function handleError(res, error) {
    console.error('[Work Controller] Error:', {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN',
        statusCode: error.statusCode || 500,
    });

    // WorkValidationError - input ไม่ถูกต้อง
    if (error instanceof WorkValidationError) {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message,
            code: error.code,
            details: error.details || [],
        });
    }

    // BusinessError - ข้อผิดพลาดด้านธุรกิจ
    if (error.name === 'BusinessError') {
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message,
            code: error.code,
        });
    }

    // Generic error - ข้อผิดพลาดอื่น ๆ
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
    });
}

/**
 * @route   POST /api/term-subjects/:termSubjectId/works
 * @desc    เพิ่มภาระงาน (workload) ใหม่
 * @access  Protected (Academic Officer only)
 * 
 * Body:
 * {
 *   "work_title": "string (required)",
 *   "description": "string (optional)",
 *   "start_date": "YYYY-MM-DD (required)",
 *   "end_date": "YYYY-MM-DD (required)",
 *   "hours_per_week": "integer (required, > 0)"
 * }
 * 
 * Response (201):
 * {
 *   "success": true,
 *   "message": "Workload created successfully",
 *   "data": { ...workload object }
 * }
 */
export async function createWork(req, res) {
    try {
        const termSubjectId = parseInt(req.params.termSubjectId);
        const userId = req.user.id; // จาก auth middleware
        const workData = req.body;

        // ตรวจสอบ termSubjectId ถูกต้อง
        if (isNaN(termSubjectId) || termSubjectId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
                code: 'INVALID_TERM_SUBJECT_ID',
            });
        }

        // เรียก service
        const newWork = await workService.createWork(termSubjectId, workData, userId);

        // ส่ง response
        res.status(201).json({
            success: true,
            message: 'Workload created successfully',
            code: 'WORKLOAD_CREATED',
            data: newWork,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/works/:workId
 * @desc    ดึงข้อมูล workload
 * @access  Protected
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "data": { ...workload object with details }
 * }
 */
export async function getWork(req, res) {
    try {
        const workId = parseInt(req.params.workId);

        if (isNaN(workId) || workId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid work ID',
                code: 'INVALID_WORK_ID',
            });
        }

        const work = await workService.getWork(workId);

        res.status(200).json({
            success: true,
            data: work,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/:termSubjectId/works
 * @desc    ดึง workload ทั้งหมดของ term_subject
 * @access  Protected
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "data": [...array ของ workload objects]
 * }
 */
export async function getWorkByTermSubject(req, res) {
    try {
        const termSubjectId = parseInt(req.params.termSubjectId);

        if (isNaN(termSubjectId) || termSubjectId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
                code: 'INVALID_TERM_SUBJECT_ID',
            });
        }

        const works = await workService.getWorkByTermSubject(termSubjectId);

        res.status(200).json({
            success: true,
            data: works,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   PUT /api/works/:workId
 * @desc    อัพเดท workload
 * @access  Protected (Academic Officer only)
 * 
 * Body (partial update):
 * {
 *   "work_title": "string (optional)",
 *   "description": "string (optional)",
 *   "start_date": "YYYY-MM-DD (optional)",
 *   "end_date": "YYYY-MM-DD (optional)",
 *   "hours_per_week": "integer (optional, > 0)"
 * }
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Workload updated successfully",
 *   "data": { ...updated workload object }
 * }
 */
export async function updateWork(req, res) {
    try {
        const workId = parseInt(req.params.workId);
        const userId = req.user.id;
        const updateData = req.body;

        if (isNaN(workId) || workId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid work ID',
                code: 'INVALID_WORK_ID',
            });
        }

        // ตรวจสอบว่าต้อง update อะไร
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_FIELDS_TO_UPDATE',
            });
        }

        const updatedWork = await workService.updateWork(workId, updateData, userId);

        res.status(200).json({
            success: true,
            message: 'Workload updated successfully',
            code: 'WORKLOAD_UPDATED',
            data: updatedWork,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   DELETE /api/works/:workId
 * @desc    ลบ workload
 * @access  Protected (Academic Officer only)
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Workload deleted successfully"
 * }
 */
export async function deleteWork(req, res) {
    try {
        const workId = parseInt(req.params.workId);

        if (isNaN(workId) || workId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid work ID',
                code: 'INVALID_WORK_ID',
            });
        }

        await workService.deleteWork(workId);

        res.status(200).json({
            success: true,
            message: 'Workload deleted successfully',
            code: 'WORKLOAD_DELETED',
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/:termId/works
 * @desc    ดึง workload ทั้งหมดของ term
 * @access  Protected
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "count": number,
 *   "data": [ ...workload objects ]
 * }
 */
export async function getWorksByTerm(req, res) {
    try {
        const termId = parseInt(req.params.termId);

        if (isNaN(termId) || termId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
                code: 'INVALID_TERM_ID',
            });
        }

        const works = await workService.getWorksByTerm(termId);

        res.status(200).json({
            success: true,
            count: works.length,
            data: works,
        });
    } catch (error) {
        handleError(res, error);
    }
}
