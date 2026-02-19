/**
 * Work Routes
 * 
 * RESTful API endpoints สำหรับ workload management
 * 
 * Endpoints:
 * POST   /api/term-subjects/:termSubjectId/works         - สร้าง workload ใหม่
 * GET    /api/term-subjects/:termSubjectId/works         - ดึง workload ของ term_subject
 * GET    /api/works/:workId                              - ดึง workload by ID
 * PUT    /api/works/:workId                              - อัพเดท workload
 * DELETE /api/works/:workId                              - ลบ workload
 * GET    /api/terms/:termId/works                        - ดึง workload ทั้งหมดของ term
 */

import express from 'express';
import * as workController from '../controllers/work.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * POST /api/term-subjects/:termSubjectId/works
 * สร้าง workload ใหม่
 * ต้องมี role = "Academic Officer"
 */
router.post(
    '/:termSubjectId/works',
    authMiddleware,
    authorizeRoles('Academic Officer'),
    workController.createWork
);

/**
 * GET /api/term-subjects/:termSubjectId/works
 * ดึง workload ของ term_subject
 */
router.get(
    '/:termSubjectId/works',
    authMiddleware,
    workController.getWorkByTermSubject
);

/**
 * GET /api/works/:workId
 * ดึง workload by ID (โดยอ้างอิง work_id)
 * 
 * หมายเหตุ: เป็น nested route ที่อยู่นอก term-subjects scope
 * จึงต้องใช้ router ในไฟล์ index.js
 */
// router.get('/:workId', authMiddleware, workController.getWork);

/**
 * PUT /api/works/:workId
 * อัพเดท workload
 * ต้องมี role = "Academic Officer"
 */
// router.put('/:workId', authMiddleware, authorizeRoles('Academic Officer'), workController.updateWork);

/**
 * DELETE /api/works/:workId
 * ลบ workload
 * ต้องมี role = "Academic Officer"
 */
// router.delete('/:workId', authMiddleware, authorizeRoles('Academic Officer'), workController.deleteWork);

/**
 * GET /api/terms/:termId/works
 * ดึง workload ทั้งหมดของ term
 * 
 * หมายเหตุ: เป็น nested route ที่อยู่ในส่วน term scope
 * จึงต้องใช้ router ในไฟล์ term.route.js
 */
// router.get('/term/:termId/works', authMiddleware, workController.getWorksByTerm);

export default router;
