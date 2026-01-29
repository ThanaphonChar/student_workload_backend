/**
 * Academic Term Routes
 * RESTful API endpoints for term management
 */

import express from 'express';
import * as termController from '../controllers/term.controller.js';
import * as termSubjectController from '../controllers/termSubject.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * @route   GET /api/terms
 * @desc    Get all terms with optional filters
 * @access  Protected (All authenticated users)
 * @query   ?academic_year=2568&academic_sector=1&status=ดำเนินการ
 */
router.get('/', termController.getAllTerms);

/**
 * @route   GET /api/terms/active
 * @desc    Get active (ongoing) terms
 * @access  Protected (All authenticated users)
 */
router.get('/active', termController.getActiveTerms);

/**
 * @route   GET /api/terms/active/subjects/status
 * @desc    ดึงข้อมูลสถานะรายวิชาในเทอมที่ active
 * @access  Protected (All authenticated users)
 */
router.get('/active/subjects/status', termSubjectController.getActiveCourseStatus);

/**
 * @route   GET /api/terms/ended
 * @desc    Get ended terms
 * @access  Protected (All authenticated users)
 */
router.get('/ended', termController.getEndedTerms);

/**
 * @route   GET /api/terms/:id
 * @desc    Get term by ID
 * @access  Protected (All authenticated users)
 */
router.get('/:id', termController.getTermById);

/**
 * @route   POST /api/terms
 * @desc    Create new academic term
 * @access  Protected (Academic staff only)
 */
router.post('/', authorizeRoles(ROLES.ACADEMIC_OFFICER), termController.createTerm);

/**
 * @route   PUT /api/terms/:id
 * @desc    Update term
 * @access  Protected (Academic staff only)
 */
router.put('/:id', authorizeRoles(ROLES.ACADEMIC_OFFICER), termController.updateTerm);

/**
 * @route   DELETE /api/terms/:id
 * @desc    Delete term
 * @access  Protected (Academic staff only)
 */
router.delete('/:id', authorizeRoles(ROLES.ACADEMIC_OFFICER), termController.deleteTerm);

/**
 * @route   GET /api/terms/:id/subjects
 * @desc    Get all subjects in a term
 * @access  Protected (All authenticated users)
 */
router.get('/:id/subjects', termController.getTermSubjects);

/**
 * @route   GET /api/terms/:id/subjects/status
 * @desc    ดึงข้อมูลสถานะรายวิชาในเทอม (แยกตาม role)
 * @access  Protected (All authenticated users)
 */
router.get('/:id/subjects/status', termSubjectController.getCourseStatus);

/**
 * @route   PUT /api/terms/:id/subjects
 * @desc    Update subjects in a term (replace all)
 * @access  Protected (Academic staff only)
 */
router.put('/:id/subjects', authorizeRoles(ROLES.ACADEMIC_OFFICER), termController.updateTermSubjects);

export default router;
