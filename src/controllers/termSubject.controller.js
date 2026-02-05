/**
 * Term Subject Controller
 * HTTP handlers for term subjects and lecturer assignments
 */

import * as termSubjectService from '../services/termSubject.service.js';
import { BusinessError } from '../utils/termValidation.js';

/**
 * @route   POST /api/term-subjects
 * @desc    Add subject to term
 * @access  Protected (Academic staff)
 */
export async function addSubjectToTerm(req, res) {
    try {
        const termSubject = await termSubjectService.addSubjectToTerm(req.body);

        res.status(201).json({
            success: true,
            message: 'Subject added to term successfully',
            data: termSubject,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/term/:termId
 * @desc    Get all subjects in a term
 * @access  Protected
 */
export async function getTermSubjects(req, res) {
    try {
        const termId = parseInt(req.params.termId);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        const subjects = await termSubjectService.getTermSubjects(termId);

        res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/:id
 * @desc    Get term subject by ID
 * @access  Protected
 */
export async function getTermSubjectById(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const termSubject = await termSubjectService.getTermSubjectById(termSubjectId);

        res.status(200).json({
            success: true,
            data: termSubject,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   PUT /api/term-subjects/:id
 * @desc    Update term subject
 * @access  Protected (Academic staff)
 */
export async function updateTermSubject(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const updated = await termSubjectService.updateTermSubject(termSubjectId, req.body);

        res.status(200).json({
            success: true,
            message: 'Term subject updated successfully',
            data: updated,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   DELETE /api/term-subjects/:id
 * @desc    Remove subject from term
 * @access  Protected (Academic staff)
 */
export async function removeSubjectFromTerm(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        await termSubjectService.removeSubjectFromTerm(termSubjectId);

        res.status(200).json({
            success: true,
            message: 'Subject removed from term successfully',
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * ==========================================
 * Lecturer Assignment Endpoints
 * ==========================================
 */

/**
 * @route   POST /api/term-subjects/:id/lecturers
 * @desc    Assign lecturer to term subject
 * @access  Protected (Academic staff)
 */
export async function assignLecturer(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const assignment = await termSubjectService.assignLecturer({
            term_subject_id: termSubjectId,
            ...req.body,
            assigned_by: req.user?.id, // From auth middleware
        });

        res.status(201).json({
            success: true,
            message: 'Lecturer assigned successfully',
            data: assignment,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/:id/lecturers
 * @desc    Get all lecturers for term subject
 * @access  Protected
 */
export async function getTermSubjectLecturers(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const lecturers = await termSubjectService.getTermSubjectLecturers(termSubjectId);

        res.status(200).json({
            success: true,
            count: lecturers.length,
            data: lecturers,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/:id/lecturers/responsible
 * @desc    Get responsible lecturer for term subject
 * @access  Protected
 */
export async function getResponsibleLecturer(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const lecturer = await termSubjectService.getResponsibleLecturer(termSubjectId);

        if (!lecturer) {
            return res.status(404).json({
                success: false,
                message: 'No responsible lecturer assigned',
            });
        }

        res.status(200).json({
            success: true,
            data: lecturer,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   PUT /api/term-subjects/:id/lecturers/responsible
 * @desc    Change responsible lecturer
 * @access  Protected (Academic staff)
 */
export async function changeResponsibleLecturer(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);
        const { user_id } = req.body;

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required',
            });
        }

        const updated = await termSubjectService.changeResponsibleLecturer(termSubjectId, user_id);

        res.status(200).json({
            success: true,
            message: 'Responsible lecturer changed successfully',
            data: updated,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   PATCH /api/term-subjects/lecturers/:assignmentId
 * @desc    Update lecturer assignment notes
 * @access  Protected (Academic staff)
 */
export async function updateLecturerNotes(req, res) {
    try {
        const assignmentId = parseInt(req.params.assignmentId);
        const { notes } = req.body;

        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID',
            });
        }

        const updated = await termSubjectService.updateLecturerNotes(assignmentId, notes);

        res.status(200).json({
            success: true,
            message: 'Notes updated successfully',
            data: updated,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   DELETE /api/term-subjects/lecturers/:assignmentId
 * @desc    Remove lecturer from term subject
 * @access  Protected (Academic staff)
 */
export async function removeLecturer(req, res) {
    try {
        const assignmentId = parseInt(req.params.assignmentId);

        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID',
            });
        }

        await termSubjectService.removeLecturer(assignmentId);

        res.status(200).json({
            success: true,
            message: 'Lecturer removed successfully',
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/:id/subjects/status
 * @desc    ดึงข้อมูลสถานะรายวิชาในเทอม (แยกตาม role)
 * @access  Protected (All authenticated users)
 */
export async function getCourseStatus(req, res) {
    try {
        console.log('[getCourseStatus] 🔵 Request received for term ID:', req.params.id);
        console.log('[getCourseStatus] 👤 User:', req.user?.id, 'roles:', req.user?.roles);

        const termId = parseInt(req.params.id); // เปลี่ยนจาก termId เป็น id

        if (isNaN(termId)) {
            console.log('[getCourseStatus] ❌ Invalid term ID');
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        // ส่ง user object ไปให้ service ตรวจสอบสิทธิ์
        const subjects = await termSubjectService.getTermSubjectsStatus(termId, req.user);

        console.log('[getCourseStatus] ✅ Success, found', subjects.length, 'subjects');
        res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects,
        });
    } catch (error) {
        console.error('[getCourseStatus] ❌ Error:', error);
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/active/subjects/status
 * @desc    ดึงข้อมูลสถานะรายวิชาในเทอมที่ active อยู่
 * @access  Protected (All authenticated users)
 */
export async function getActiveCourseStatus(req, res) {
    try {
        console.log('[getActiveCourseStatus] 🚀 Starting with user:', req.user?.id);
        const result = await termSubjectService.getActiveTermSubjectsStatus(req.user);
        console.log('[getActiveCourseStatus] ✅ Success, term:', result.term?.id, 'subjects:', result.subjects?.length);

        res.status(200).json({
            success: true,
            term: result.term,
            count: result.subjects.length,
            data: result.subjects,
        });
    } catch (error) {
        console.error('[getActiveCourseStatus] ❌ ERROR Details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name
        });
        handleError(res, error);
    }
}

/**
 * @route   POST /api/term-subjects/:id/assign-professor
 * @desc    มอบหมายอาจารย์ให้สอนวิชา
 * @access  Protected (Academic Officer only)
 */
export async function assignProfessor(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);
        const { professor_id } = req.body;

        console.log('[assignProfessor] 📥 Request:', { termSubjectId, professor_id, userId: req.user?.id });

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        if (!professor_id) {
            return res.status(400).json({
                success: false,
                message: 'Professor ID is required',
            });
        }

        const assignment = await termSubjectService.assignProfessorToSubject(
            termSubjectId,
            professor_id,
            req.user.id
        );

        console.log('[assignProfessor] ✅ Success:', assignment);

        res.status(201).json({
            success: true,
            message: 'Professor assigned successfully',
            data: assignment,
        });
    } catch (error) {
        console.error('[assignProfessor] ❌ Error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        handleError(res, error);
    }
}

/**
 * @route   GET /api/term-subjects/:id/detail
 * @desc    ดึงข้อมูล term subject โดยละเอียด พร้อมเช็คสิทธิ์
 * @access  Protected (Academic staff or assigned professor)
 */
export async function getTermSubjectDetail(req, res) {
    try {
        const termSubjectId = parseInt(req.params.id);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const termSubject = await termSubjectService.getTermSubjectDetail(termSubjectId, req.user);

        res.status(200).json({
            success: true,
            data: termSubject,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/my-subjects
 * @desc    Get all subjects assigned to the logged-in professor
 * @access  Protected (Professor only)
 */
export async function getMySubjects(req, res) {
    try {
        console.log('[Term Subject Controller] 📥 Get my subjects request from user:', req.user.id);

        const subjects = await termSubjectService.getMySubjects(req.user.id);

        return res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * @route   POST /api/term-subjects/:termSubjectId/submit-workload
 * @desc    Submit workload for approval (Professor only)
 * @access  Protected (Professor)
 */
export async function submitWorkload(req, res) {
    try {
        const termSubjectId = parseInt(req.params.termSubjectId);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const userId = req.user.id;

        const updated = await termSubjectService.submitWorkload(termSubjectId, userId);

        res.status(200).json({
            success: true,
            message: 'Workload submitted for approval successfully',
            data: updated,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * @route   POST /api/term-subjects/:termSubjectId/approve-workload
 * @desc    Approve workload submission (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
export async function approveWorkload(req, res) {
    try {
        const termSubjectId = parseInt(req.params.termSubjectId);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const userId = req.user.id;

        const updated = await termSubjectService.approveWorkload(termSubjectId, userId);

        res.status(200).json({
            success: true,
            message: 'Workload approved successfully',
            data: updated,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * @route   POST /api/term-subjects/:termSubjectId/reject-workload
 * @desc    Reject workload submission (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
export async function rejectWorkload(req, res) {
    try {
        const termSubjectId = parseInt(req.params.termSubjectId);

        if (isNaN(termSubjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term subject ID',
            });
        }

        const userId = req.user.id;
        const { reason } = req.body; // Optional rejection reason

        const updated = await termSubjectService.rejectWorkload(termSubjectId, userId, reason);

        res.status(200).json({
            success: true,
            message: 'Workload rejected and status reset to pending',
            data: updated,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * Centralized error handler
 */
function handleError(res, error) {
    console.error('[Term Subject Controller] Error:', error.message);

    if (error instanceof BusinessError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
        });
    }

    // PostgreSQL unique constraint violation
    if (error.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'This record already exists',
            code: 'DUPLICATE_ENTRY',
        });
    }

    // PostgreSQL foreign key violation
    if (error.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referenced data does not exist',
            code: 'FOREIGN_KEY_VIOLATION',
        });
    }

    // Default 500 error
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
}
