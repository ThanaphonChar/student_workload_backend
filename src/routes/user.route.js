/**
 * User Routes
 * API endpoints for user management
 */

import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * @route   GET /api/users/professors
 * @desc    Get all users with "Professor" role
 * @access  Protected (Academic Officer only)
 */
router.get('/professors', authorizeRoles(ROLES.ACADEMIC_OFFICER), userController.getProfessors);

export default router;
