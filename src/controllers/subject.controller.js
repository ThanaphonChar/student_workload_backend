import * as subjectService from '../services/subject.service.js';

/**
 * Subject Controller
 * Handles HTTP requests for subject CRUD operations
 */

/**
 * Create a new subject
 * POST /api/subjects
 */
export async function createSubject(req, res) {
    try {
        console.log('[Subject] 📥 Request body:', req.body);
        console.log('[Subject] 👤 User from token:', req.user);

        const {
            code_th,
            code_eng,
            name_th,
            name_eng,
            program_id,
            credit,
            outline,
            student_year_id,
            count_workload,
            is_active,
        } = req.body;

        // Validate required fields
        if (!code_th || !name_th || !program_id || !student_year_id || credit === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: code_th, name_th, program_id, student_year_id, credit',
            });
        }

        // Validate credit is a number
        if (typeof credit !== 'number' || credit < 0) {
            return res.status(400).json({
                success: false,
                message: 'Credit must be a non-negative number',
            });
        }

        // Check if program exists
        const programExistsCheck = await subjectService.programExists(program_id);
        if (!programExistsCheck) {
            return res.status(404).json({
                success: false,
                message: `Program with id ${program_id} not found`,
            });
        }

        // Check if student year exists
        const studentYearExistsCheck = await subjectService.studentYearExists(student_year_id);
        if (!studentYearExistsCheck) {
            return res.status(404).json({
                success: false,
                message: `Student year with id ${student_year_id} not found`,
            });
        }

        // Create subject
        const subject = await subjectService.createSubject({
            code_th,
            code_eng,
            name_th,
            name_eng,
            program_id,
            credit,
            outline,
            student_year_id,
            count_workload,
            is_active,
        });

        console.log('[Subject] ✅ Subject created:', subject.id);

        res.status(201).json({
            success: true,
            subject,
        });
    } catch (error) {
        console.error('[Subject] ❌ Create error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subject',
            error: error.message,
        });
    }
}

/**
 * Get all subjects with optional filters
 * GET /api/subjects?program_id=1&student_year_id=2&is_active=true
 */
export async function getAllSubjects(req, res) {
    try {
        const filters = {};

        // Parse query parameters
        if (req.query.program_id) {
            filters.program_id = parseInt(req.query.program_id, 10);
        }

        if (req.query.student_year_id) {
            filters.student_year_id = parseInt(req.query.student_year_id, 10);
        }

        if (req.query.is_active !== undefined) {
            filters.is_active = req.query.is_active === 'true';
        }

        const subjects = await subjectService.getAllSubjects(filters);

        console.log('[Subject] ✅ Retrieved subjects:', subjects.length);

        res.status(200).json({
            success: true,
            count: subjects.length,
            subjects,
        });
    } catch (error) {
        console.error('[Subject] ❌ Get all error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subjects',
            error: error.message,
        });
    }
}

/**
 * Get subject by ID
 * GET /api/subjects/:id
 */
export async function getSubjectById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject ID',
            });
        }

        const subject = await subjectService.getSubjectById(id);

        if (!subject) {
            return res.status(404).json({
                success: false,
                message: `Subject with id ${id} not found`,
            });
        }

        console.log('[Subject] ✅ Retrieved subject:', id);

        res.status(200).json({
            success: true,
            subject,
        });
    } catch (error) {
        console.error('[Subject] ❌ Get by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subject',
            error: error.message,
        });
    }
}

/**
 * Update subject by ID
 * PUT /api/subjects/:id
 */
export async function updateSubject(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject ID',
            });
        }

        // Check if subject exists
        const existingSubject = await subjectService.getSubjectById(id);
        if (!existingSubject) {
            return res.status(404).json({
                success: false,
                message: `Subject with id ${id} not found`,
            });
        }

        const updateData = req.body;

        // Validate credit if provided
        if (updateData.credit !== undefined) {
            if (typeof updateData.credit !== 'number' || updateData.credit < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Credit must be a non-negative number',
                });
            }
        }

        // Validate foreign keys if provided
        if (updateData.program_id) {
            const programExistsCheck = await subjectService.programExists(updateData.program_id);
            if (!programExistsCheck) {
                return res.status(404).json({
                    success: false,
                    message: `Program with id ${updateData.program_id} not found`,
                });
            }
        }

        if (updateData.student_year_id) {
            const studentYearExistsCheck = await subjectService.studentYearExists(updateData.student_year_id);
            if (!studentYearExistsCheck) {
                return res.status(404).json({
                    success: false,
                    message: `Student year with id ${updateData.student_year_id} not found`,
                });
            }
        }

        // Update subject
        const updatedSubject = await subjectService.updateSubject(id, updateData);

        console.log('[Subject] ✅ Subject updated:', id);

        res.status(200).json({
            success: true,
            subject: updatedSubject,
        });
    } catch (error) {
        console.error('[Subject] ❌ Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subject',
            error: error.message,
        });
    }
}

/**
 * Soft delete subject (set is_active = false)
 * DELETE /api/subjects/:id
 */
export async function deleteSubject(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject ID',
            });
        }

        // Check if subject exists
        const existingSubject = await subjectService.getSubjectById(id);
        if (!existingSubject) {
            return res.status(404).json({
                success: false,
                message: `Subject with id ${id} not found`,
            });
        }

        // Soft delete
        await subjectService.deleteSubject(id);

        console.log('[Subject] ✅ Subject soft deleted:', id);

        res.status(200).json({
            success: true,
            message: `Subject with id ${id} has been deactivated`,
        });
    } catch (error) {
        console.error('[Subject] ❌ Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete subject',
            error: error.message,
        });
    }
}
