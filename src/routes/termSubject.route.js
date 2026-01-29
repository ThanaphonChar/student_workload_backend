/**
 * Term Subject Routes
 * RESTful API endpoints for term subject management and lecturer assignments
 */

import express from 'express';
import * as termSubjectController from '../controllers/termSubject.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * Term Subject CRUD Operations
 */

/**
 * @route   POST /api/term-subjects
 * @desc    Add subject to term
 * @access  Protected (Academic staff only)
 */
router.post('/', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.addSubjectToTerm);

/**
 * @route   GET /api/term-subjects/term/:termId
 * @desc    Get all subjects in a term
 * @access  Protected (All authenticated users)
 */
router.get('/term/:termId', termSubjectController.getTermSubjects);

/**
 * @route   GET /api/term-subjects/:id
 * @desc    Get term subject by ID
 * @access  Protected (All authenticated users)
 */
router.get('/:id', termSubjectController.getTermSubjectById);

/**
 * @route   PUT /api/term-subjects/:id
 * @desc    Update term subject
 * @access  Protected (Academic staff only)
 */
router.put('/:id', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.updateTermSubject);

/**
 * @route   DELETE /api/term-subjects/:id
 * @desc    Remove subject from term
 * @access  Protected (Academic staff only)
 */
router.delete('/:id', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.removeSubjectFromTerm);

/**
 * Lecturer Assignment Operations
 */

/**
 * @route   GET /api/term-subjects/:id/lecturers
 * @desc    Get all lecturers for term subject
 * @access  Protected (All authenticated users)
 */
router.get('/:id/lecturers', termSubjectController.getTermSubjectLecturers);

/**
 * @route   POST /api/term-subjects/:id/lecturers
 * @desc    Assign lecturer to term subject
 * @access  Protected (Academic staff only)
 */
router.post('/:id/lecturers', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.assignLecturer);

/**
 * @route   GET /api/term-subjects/:id/lecturers/responsible
 * @desc    Get responsible lecturer for term subject
 * @access  Protected (All authenticated users)
 */
router.get('/:id/lecturers/responsible', termSubjectController.getResponsibleLecturer);

/**
 * @route   PUT /api/term-subjects/:id/lecturers/responsible
 * @desc    Change responsible lecturer
 * @access  Protected (Academic staff only)
 */
router.put('/:id/lecturers/responsible', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.changeResponsibleLecturer);

/**
 * @route   PATCH /api/term-subjects/lecturers/:assignmentId
 * @desc    Update lecturer assignment notes
 * @access  Protected (Academic staff only)
 */
router.patch('/lecturers/:assignmentId', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.updateLecturerNotes);

/**
 * @route   DELETE /api/term-subjects/lecturers/:assignmentId
 * @desc    Remove lecturer from term subject
 * @access  Protected (Academic staff only)
 */
router.delete('/lecturers/:assignmentId', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.removeLecturer);

export default router;
