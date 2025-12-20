import express from 'express';
import * as subjectController from '../controllers/subject.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * Subject Routes
 * ทุก routes ต้องผ่าน authentication
 * บาง routes มี role-based authorization เพิ่มเติม
 * 
 * Base path: /api/subjects
 * 
 * Role permissions:
 * - View (GET): Professor, Program Chair, Academic Officer
 * - Create/Update/Delete: Program Chair, Academic Officer only
 */

// Apply auth middleware ให้ทุก routes
router.use(authMiddleware);

/**
 * @route   GET /api/subjects
 * @desc    ดึงรายการวิชาทั้งหมด
 * @access  Professor, Program Chair, Academic Officer
 * @query   program_id, student_year_id, is_active
 */
router.get(
    '/',
    authorizeRoles(ROLES.PROFESSOR, ROLES.PROGRAM_CHAIR, ROLES.ACADEMIC_OFFICER, ROLES.STUDENT),
    subjectController.getAllSubjects
);

/**
 * @route   GET /api/subjects/:id
 * @desc    ดึงข้อมูลวิชาตาม ID
 * @access  Professor, Program Chair, Academic Officer
 */
router.get(
    '/:id',
    authorizeRoles(ROLES.PROFESSOR, ROLES.PROGRAM_CHAIR, ROLES.ACADEMIC_OFFICER, ROLES.STUDENT),
    subjectController.getSubjectById
);

/**
 * @route   POST /api/subjects
 * @desc    สร้างวิชาใหม่
 * @access  Program Chair, Academic Officer only
 * @body    { code_th, code_eng, name_th, name_eng, program_id, credit, outline, student_year_id, count_workload, is_active }
 */
router.post(
    '/',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    subjectController.createSubject
);

/**
 * @route   PUT /api/subjects/:id
 * @desc    แก้ไขข้อมูลวิชา
 * @access  Program Chair, Academic Officer only
 * @body    Any fields from subject schema
 */
router.put(
    '/:id',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    subjectController.updateSubject
);

/**
 * @route   DELETE /api/subjects/:id
 * @desc    ลบวิชา (soft delete - set is_active = false)
 * @access  Program Chair, Academic Officer only
 */
router.delete(
    '/:id',
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    subjectController.deleteSubject
);

export default router;
