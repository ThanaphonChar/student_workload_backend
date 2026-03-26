/**
 * Submission Routes
 * Routes -> Controller only
 */

import express from 'express';
import * as submissionController from '../controllers/submission.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get(
    '/my-subjects/:termId',
    authorizeRoles(ROLES.PROFESSOR),
    submissionController.getMySubjectsWithStatus
);

router.post(
    '/',
    authorizeRoles(ROLES.PROFESSOR),
    submissionController.createSubmission
);

router.patch(
    '/:submissionId/review',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    submissionController.reviewSubmission
);

router.get(
    '/:termSubjectId/history/:documentType',
    submissionController.getSubmissionHistory
);

export default router;
