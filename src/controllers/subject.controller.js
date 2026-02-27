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
            student_year_ids,
            count_workload,
            is_active,
        } = req.body;

        // Validate required fields
        if (!code_th || !name_th || !program_id || !student_year_ids || credit === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: code_th, name_th, program_id, student_year_ids, credit',
            });
        }

        // Validate student_year_ids is an array
        if (!Array.isArray(student_year_ids) || student_year_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'student_year_ids must be a non-empty array',
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

        // Check if all student years exist
        for (const yearId of student_year_ids) {
            const studentYearExistsCheck = await subjectService.studentYearExists(yearId);
            if (!studentYearExistsCheck) {
                return res.status(404).json({
                    success: false,
                    message: `Student year with id ${yearId} not found`,
                });
            }
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
            student_year_ids,
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

        if (updateData.student_year_ids) {
            // Validate it's an array
            if (!Array.isArray(updateData.student_year_ids) || updateData.student_year_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'student_year_ids must be a non-empty array',
                });
            }

            // Validate all student years exist
            for (const yearId of updateData.student_year_ids) {
                const studentYearExistsCheck = await subjectService.studentYearExists(yearId);
                if (!studentYearExistsCheck) {
                    return res.status(404).json({
                        success: false,
                        message: `Student year with id ${yearId} not found`,
                    });
                }
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

        console.log('[Subject] 🔍 Validating subject IDs:', subject_ids);

        const existingSubjects = await subjectService.findSubjectsByIds(subject_ids);
        const existingIds = existingSubjects.map(s => s.id);
        const invalidIds = subject_ids.filter(id => !existingIds.includes(id));

        console.log('[Subject] Found:', existingIds);
        console.log('[Subject] Invalid:', invalidIds);

        res.status(200).json({
            success: true,
            valid: invalidIds.length === 0,
            existing_ids: existingIds,
            invalid_ids: invalidIds,
            subjects: existingSubjects,
        });
    } catch (error) {
        console.error('[Subject] ❌ Validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate subject IDs',
            error: error.message,
        });
    }
}

/**
 * Get student years for a subject
 * GET /api/subjects/:id/student-years
 */
export async function getSubjectStudentYears(req, res) {
    try {
        const { id } = req.params;

        console.log('[Subject] 🔍 Getting student years for subject:', id);

        const studentYearIds = await subjectService.getSubjectStudentYears(parseInt(id));

        res.status(200).json({
            success: true,
            data: studentYearIds,
        });
    } catch (error) {
        console.error('[Subject] ❌ Get student years error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get student years',
            error: error.message,
        });
    }
}
