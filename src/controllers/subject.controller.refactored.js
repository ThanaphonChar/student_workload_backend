/**
 * Subject Controller (New Architecture)
 * รับผิดชอบ HTTP request/response เท่านั้น
 * ไม่มี business logic, ไม่มี validation logic
 * เรียก service layer แล้วแปลง result เป็น HTTP response
 */

import * as subjectService from '../services/subject.service.refactored.js';
import { ValidationError } from '../utils/subjectValidation.js';
import { BusinessError } from '../services/subject.service.refactored.js';

/**
 * สร้าง subject ใหม่
 * POST /api/subjects
 * 
 * @param {Object} req.body - ข้อมูล subject
 * @param {string} req.body.code_th - รหัสวิชาภาษาไทย (required)
 * @param {string} req.body.name_th - ชื่อวิชาภาษาไทย (required)
 * @param {number} req.body.program_id - ID ของ program (required)
 * @param {Array<number>} req.body.student_year_ids - Array ของ student_year IDs (required)
 * @param {number} req.body.credit - จำนวนหน่วยกิต (required)
 */
export async function createSubject(req, res) {
    try {
        console.log('[Subject Controller] 📥 Create request:', req.body);

        const subject = await subjectService.createSubject(req.body);

        return res.status(201).json({
            success: true,
            message: 'สร้าง subject สำเร็จ',
            subject,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * ดึงข้อมูล subject ทั้งหมด (พร้อม filter)
 * GET /api/subjects?program_id=1&student_year_id=2&is_active=true
 * 
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.program_id - Filter by program (optional)
 * @param {number} req.query.student_year_id - Filter by student year (optional)
 * @param {boolean} req.query.is_active - Filter by active status (optional)
 */
export async function getAllSubjects(req, res) {
    try {
        const filters = parseFilters(req.query);

        const subjects = await subjectService.getAllSubjects(filters);

        return res.status(200).json({
            success: true,
            count: subjects.length,
            subjects,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * ดึงข้อมูล subject ตาม ID
 * GET /api/subjects/:id
 * 
 * @param {number} req.params.id - Subject ID
 */
export async function getSubjectById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID ต้องเป็นตัวเลขที่มากกว่า 0',
            });
        }

        const subject = await subjectService.getSubjectById(id);

        return res.status(200).json({
            success: true,
            subject,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * อัปเดต subject
 * PUT /api/subjects/:id
 * 
 * @param {number} req.params.id - Subject ID
 * @param {Object} req.body - ข้อมูลที่ต้องการอัปเดต
 */
export async function updateSubject(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID ต้องเป็นตัวเลขที่มากกว่า 0',
            });
        }

        console.log('[Subject Controller] 📝 Update request:', { id, data: req.body });

        const subject = await subjectService.updateSubject(id, req.body);

        return res.status(200).json({
            success: true,
            message: 'อัปเดต subject สำเร็จ',
            subject,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * Soft delete subject
 * DELETE /api/subjects/:id
 * 
 * @param {number} req.params.id - Subject ID
 */
export async function deleteSubject(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID ต้องเป็นตัวเลขที่มากกว่า 0',
            });
        }

        console.log('[Subject Controller] 🗑️ Delete request:', id);

        await subjectService.deleteSubject(id);

        return res.status(200).json({
            success: true,
            message: 'ลบ subject สำเร็จ',
        });

    } catch (error) {
        return handleError(res, error);
    }
}

// ============================================
// Helper Functions
// ============================================

/**
 * แปลง query string เป็น filter object
 * @param {Object} query - req.query
 * @returns {Object} filter object
 */
function parseFilters(query) {
    const filters = {};

    if (query.program_id) {
        const programId = parseInt(query.program_id, 10);
        if (!isNaN(programId)) {
            filters.program_id = programId;
        }
    }

    if (query.student_year_id) {
        const studentYearId = parseInt(query.student_year_id, 10);
        if (!isNaN(studentYearId)) {
            filters.student_year_id = studentYearId;
        }
    }

    if (query.is_active !== undefined) {
        filters.is_active = query.is_active === 'true';
    }

    return filters;
}

/**
 * จัดการ error และแปลงเป็น HTTP response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
function handleError(res, error) {
    console.error('[Subject Controller] ❌ Error:', error);

    // Validation Error
    if (error instanceof ValidationError) {
        return res.status(400).json({
            success: false,
            message: error.message,
            errors: error.errors || null,
        });
    }

    // Business Error
    if (error instanceof BusinessError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    // Database Error
    if (error.code) {
        // PostgreSQL error codes
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                message: 'ข้อมูลซ้ำกับที่มีอยู่ในระบบ',
            });
        }

        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลอ้างอิงไม่ถูกต้อง',
            });
        }
    }

    // Unknown Error
    return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในระบบ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
}

/**
 * Validate subject IDs
 * POST /api/subjects/validate-ids
 * Body: { subject_ids: [1, 2, 3] }
 */
export async function validateSubjectIds(req, res) {
    try {
        const { subject_ids } = req.body;

        if (!Array.isArray(subject_ids)) {
            return res.status(400).json({
                success: false,
                message: 'subject_ids must be an array',
            });
        }

        console.log('[Subject Controller] 🔍 Validating subject IDs:', subject_ids);

        const existingSubjects = await subjectService.findSubjectsByIds(subject_ids);
        const existingIds = existingSubjects.map(s => s.id);
        const invalidIds = subject_ids.filter(id => !existingIds.includes(id));

        console.log('[Subject Controller] Found:', existingIds);
        console.log('[Subject Controller] Invalid:', invalidIds);

        return res.status(200).json({
            success: true,
            valid: invalidIds.length === 0,
            existing_ids: existingIds,
            invalid_ids: invalidIds,
            subjects: existingSubjects,
        });
    } catch (error) {
        return handleError(res, error);
    }
}
