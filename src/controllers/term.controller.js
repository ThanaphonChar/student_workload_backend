/**
 * Academic Term Controller
 * HTTP request/response handling only - no business logic
 * Delegates to service layer for all operations
 */

import * as termService from '../services/term.service.js';
import { ValidationError, BusinessError } from '../utils/termValidation.js';

/**
 * @route   POST /api/terms
 * @desc    Create new academic term
 * @access  Protected (Academic staff only)
 */
export async function createTerm(req, res) {
    try {
        console.log('[createTerm] Received request body:', JSON.stringify(req.body, null, 2));
        console.log('[createTerm] subject_ids:', req.body.subject_ids);

        const term = await termService.createTerm(req.body, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Term created successfully',
            data: term,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms
 * @desc    Get all terms with optional filters
 * @access  Protected
 * @query   academic_year, academic_sector, status
 */
export async function getAllTerms(req, res) {
    try {
        const filters = {
            academic_year: req.query.academic_year ? parseInt(req.query.academic_year) : undefined,
            academic_sector: req.query.academic_sector ? parseInt(req.query.academic_sector) : undefined,
            status: req.query.status,
        };

        const terms = await termService.getAllTerms(filters);

        res.status(200).json({
            success: true,
            count: terms.length,
            data: terms,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/active
 * @desc    Get active (ongoing) terms
 * @access  Protected
 */
export async function getActiveTerms(req, res) {
    try {
        const terms = await termService.getActiveTerms();

        res.status(200).json({
            success: true,
            count: terms.length,
            data: terms,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/ended
 * @desc    Get ended terms
 * @access  Protected
 */
export async function getEndedTerms(req, res) {
    try {
        const terms = await termService.getEndedTerms();

        res.status(200).json({
            success: true,
            count: terms.length,
            data: terms,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/:id
 * @desc    Get term by ID
 * @access  Protected
 */
export async function getTermById(req, res) {
    try {
        const termId = parseInt(req.params.id);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        const term = await termService.getTermById(termId);

        res.status(200).json({
            success: true,
            data: term,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   PUT /api/terms/:id
 * @desc    Update term
 * @access  Protected (Academic staff only)
 */
export async function updateTerm(req, res) {
    try {
        const termId = parseInt(req.params.id);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        console.log('[updateTerm] Term ID:', termId);
        console.log('[updateTerm] Received request body:', JSON.stringify(req.body, null, 2));
        console.log('[updateTerm] subject_ids:', req.body.subject_ids);

        const term = await termService.updateTerm(termId, req.body, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Term updated successfully',
            data: term,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   DELETE /api/terms/:id
 * @desc    Delete term
 * @access  Protected (Academic staff only)
 */
export async function deleteTerm(req, res) {
    try {
        const termId = parseInt(req.params.id);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        await termService.deleteTerm(termId);

        res.status(200).json({
            success: true,
            message: 'Term deleted successfully',
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * @route   GET /api/terms/:id/subjects
 * @desc    Get all subjects in a term
 * @access  Protected
 */
export async function getTermSubjects(req, res) {
    try {
        const termId = parseInt(req.params.id);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        const subjects = await termService.getTermSubjects(termId);

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
 * @route   PUT /api/terms/:id/subjects
 * @desc    Update subjects in a term (replace all)
 * @access  Protected (Academic staff only)
 */
export async function updateTermSubjects(req, res) {
    try {
        const termId = parseInt(req.params.id);

        if (isNaN(termId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid term ID',
            });
        }

        const { subject_ids } = req.body;

        if (!Array.isArray(subject_ids)) {
            return res.status(400).json({
                success: false,
                message: 'subject_ids must be an array',
            });
        }

        const subjects = await termService.updateTermSubjects(termId, subject_ids, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Term subjects updated successfully',
            count: subjects.length,
            data: subjects,
        });
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * Centralized error handler
 * Maps error types to appropriate HTTP responses
 */
function handleError(res, error) {
    console.error('[Term Controller] Error:', error.message);

    if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            field: error.field,
            details: error.details,
        });
    }

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
            message: 'Term with this year and sector already exists',
            code: 'DUPLICATE_TERM',
        });
    }

    // PostgreSQL foreign key violation
    if (error.code === '23503') {
        console.error('[handleError] Foreign key violation:', {
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            table: error.table,
            column: error.column,
        });

        return res.status(400).json({
            success: false,
            message: 'หนึ่งหรือมากกว่านั้นในรายวิชาที่เลือกไม่มีอยู่ในระบบ (One or more selected subjects do not exist in the database)',
            code: 'FOREIGN_KEY_VIOLATION',
            detail: error.detail || 'Invalid subject reference',
        });
    }

    // Default 500 error
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
}
