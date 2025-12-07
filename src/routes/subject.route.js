import express from 'express';
import * as subjectController from '../controllers/subject.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Subject Routes
 * All routes are protected with authentication middleware
 * Base path: /api/subjects
 */

// Apply auth middleware to all subject routes
router.use(authMiddleware);

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject
 * @access  Protected
 * @body    { code_th, code_eng, name_th, name_eng, program_id, credit, outline, student_year_id, count_workload, is_active }
 */
router.post('/', subjectController.createSubject);

/**
 * @route   GET /api/subjects
 * @desc    Get all subjects with optional filters
 * @access  Protected
 * @query   program_id, student_year_id, is_active
 */
router.get('/', subjectController.getAllSubjects);

/**
 * @route   GET /api/subjects/:id
 * @desc    Get subject by ID
 * @access  Protected
 */
router.get('/:id', subjectController.getSubjectById);

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update subject by ID
 * @access  Protected
 * @body    Any fields from subject schema
 */
router.put('/:id', subjectController.updateSubject);

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Soft delete subject (set is_active = false)
 * @access  Protected
 */
router.delete('/:id', subjectController.deleteSubject);

export default router;
