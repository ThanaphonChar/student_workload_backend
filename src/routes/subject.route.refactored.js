/**
 * Subject Routes (Refactored)
 * ใช้ refactored controller
 */

import express from 'express';
import * as subjectController from '../controllers/subject.controller.refactored.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Protected routes - ต้อง authenticate ทุก endpoint
 */
router.use(authenticateToken);

/**
 * @route   POST /api/subjects
 * @desc    สร้าง subject ใหม่
 * @access  Private (requires JWT)
 */
router.post('/', subjectController.createSubject);

/**
 * @route   GET /api/subjects
 * @desc    ดึงข้อมูล subject ทั้งหมด (พร้อม filter)
 * @access  Private (requires JWT)
 */
router.get('/', subjectController.getAllSubjects);

/**
 * @route   POST /api/subjects/validate-ids
 * @desc    ตรวจสอบว่า subject IDs มีอยู่จริงหรือไม่
 * @access  Private (requires JWT)
 */
router.post('/validate-ids', subjectController.validateSubjectIds);

/**
 * @route   GET /api/subjects/:id
 * @desc    ดึงข้อมูล subject ตาม ID
 * @access  Private (requires JWT)
 */
router.get('/:id', subjectController.getSubjectById);

/**
 * @route   PUT /api/subjects/:id
 * @desc    อัปเดต subject
 * @access  Private (requires JWT)
 */
router.put('/:id', subjectController.updateSubject);

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Soft delete subject (เปลี่ยน is_active = false)
 * @access  Private (requires JWT)
 */
router.delete('/:id', subjectController.deleteSubject);

export default router;
