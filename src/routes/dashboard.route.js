/**
 * Dashboard Routes
 * API endpoints สำหรับ Dashboard
 */

import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * All dashboard routes require authentication
 */
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard/summary
 * @desc    ดึงข้อมูลสถิติรวมสำหรับ Dashboard
 * @query   termId (optional) - ID ของ term ที่ต้องการดู
 * @access  Protected (Academic Officer only)
 */
router.get(
    '/summary',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    dashboardController.getSummaryStatistics
);

/**
 * @route   GET /api/dashboard/average-workload
 * @desc    ดึงค่าเฉลี่ยภาระงานแยกตามปีการศึกษา
 * @query   termId (optional) - ID ของ term
 * @access  Protected (Academic Officer only)
 */
router.get(
    '/average-workload',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    dashboardController.getAverageWorkload
);

/**
 * @route   GET /api/dashboard/workload-chart
 * @desc    ดึงข้อมูลภาระงานแยกตามสัปดาห์สำหรับสร้าง chart
 * @query   termId (optional) - ID ของ term
 * @query   years (optional) - ระดับชั้นปีที่ต้องการดู เช่น "1,2" (default: "1,2,3,4")
 * @access  Protected (Academic Officer only)
 */
router.get(
    '/workload-chart',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    dashboardController.getWorkloadChart
);

/**
 * @route   GET /api/dashboard/active-term
 * @desc    ดึงข้อมูล active term
 * @access  Protected (Academic Officer only)
 */
router.get(
    '/active-term',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    dashboardController.getActiveTerm
);

export default router;
