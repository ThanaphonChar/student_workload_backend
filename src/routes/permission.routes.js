import express from 'express';
import * as permissionController from '../controllers/permission.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ACADEMIC_OFFICER));

router.get('/instructors', permissionController.getInstructors);
router.post('/users/bulk', permissionController.bulkCreateUsers);
router.delete('/users/:userId/roles/:roleId', permissionController.removeUserRole);
router.get('/users', permissionController.getUsersGroupedByRole);

export default router;
