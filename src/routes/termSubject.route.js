/**
 * Term Subject Routes
 * RESTful API endpoints for term subject management and lecturer assignments
 */

import express from 'express';
import * as termSubjectController from '../controllers/termSubject.controller.js';
import * as workController from '../controllers/work.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middlewares/role.middleware.js';
import { uploadSingleFile } from '../middlewares/upload.middleware.js';

const router = express.Router();

/**
 * Upload routes - ต้องอยู่ก่อน authMiddleware และ express.json()
 * เพราะ multer ต้อง parse multipart/form-data เอง
 */
router.post(
    '/:id/upload',
    uploadSingleFile,
    authMiddleware,
    authorizeRoles(ROLES.PROFESSOR),
    termSubjectController.uploadDocument
);

router.get('/:id/documents', authMiddleware, termSubjectController.getDocuments);
router.get('/:id/documents/latest', authMiddleware, termSubjectController.getLatestDocuments);

/**
 * All other routes require authentication
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
 * @route   GET /api/term-subjects/:id/detail
 * @desc    ดึงข้อมูล term subject โดยละเอียด พร้อมเช็คสิทธิ์
 * @access  Protected (Academic staff or assigned professor)
 */
router.get('/:id/detail', termSubjectController.getTermSubjectDetail);

/**
 * @route   POST /api/term-subjects/:id/assign-professor
 * @desc    มอบหมายอาจารย์ให้สอนวิชา
 * @access  Protected (Academic Officer only)
 */
router.post('/:id/assign-professor', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.assignProfessor);

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

/**
 * ==========================================
 * Workload Submission Management Routes
 * ==========================================
 */

/**
 * @route   POST /api/term-subjects/:termSubjectId/submit-workload
 * @desc    Submit workload for approval (Professor only)
 * @access  Protected (Professor)
 */
router.post('/:termSubjectId/submit-workload', authorizeRoles(ROLES.PROFESSOR), termSubjectController.submitWorkload);

/**
 * @route   POST /api/term-subjects/:termSubjectId/approve-workload
 * @desc    Approve workload submission (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
router.post('/:termSubjectId/approve-workload', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.approveWorkload);

/**
 * @route   POST /api/term-subjects/:termSubjectId/reject-workload
 * @desc    Reject workload submission (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
router.post('/:termSubjectId/reject-workload', authorizeRoles(ROLES.ACADEMIC_OFFICER), termSubjectController.rejectWorkload);

/**
 * ==========================================
 * Workload Details Management Routes (NEW)
 * ==========================================
 * 
 * เพิ่มรายละเอียดภาระงาน (work_details) โดย Academic Officer
 * ใช้สำหรับการกำหนดรายละเอียดภาระงานให้กับแต่ละ term_subject
 */

/**
 * @route   POST /api/term-subjects/:termSubjectId/works
 * @desc    สร้างรายละเอียดภาระงานใหม่ (Academic Officer only)
 * @access  Protected (Academic Officer)
 * 
 * Body:
 * {
 *   "work_title": "string (required)",
 *   "description": "string (optional)",
 *   "start_date": "YYYY-MM-DD (required)",
 *   "end_date": "YYYY-MM-DD (required)",
 *   "hours_per_week": "integer (required, > 0)"
 * }
 */
router.post(
    '/:termSubjectId/works',
    authMiddleware,
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    workController.createWork
);

/**
 * @route   GET /api/term-subjects/:termSubjectId/works
 * @desc    ดึงรายละเอียดภาระงานของ term_subject
 * @access  Protected
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": { workload object } หรือ null ถ้าไม่มี
 * }
 */
router.get(
    '/:termSubjectId/works',
    authMiddleware,
    workController.getWorkByTermSubject
);

/**
 * @route   PUT /api/term-subjects/:termSubjectId/works/:workId
 * @desc    อัพเดทรายละเอียดภาระงาน (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
router.put(
    '/:termSubjectId/works/:workId',
    authMiddleware,
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    workController.updateWork
);

/**
 * @route   DELETE /api/term-subjects/:termSubjectId/works/:workId
 * @desc    ลบรายละเอียดภาระงาน (Academic Officer only)
 * @access  Protected (Academic Officer)
 */
router.delete(
    '/:termSubjectId/works/:workId',
    authMiddleware,
    authorizeRoles(ROLES.ACADEMIC_OFFICER),
    workController.deleteWork
);

export default router;
