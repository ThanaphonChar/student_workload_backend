/**
 * My Subjects Routes
 * API endpoints for professor's assigned subjects
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
 * @route   GET /api/my-subjects
 * @desc    Get all subjects assigned to the logged-in professor
 * @access  Protected (Professor only)
 */
router.get('/', authorizeRoles(ROLES.PROFESSOR), termSubjectController.getMySubjects);

export default router;
