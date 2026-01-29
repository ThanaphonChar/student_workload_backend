/**
 * Term Subject Service
 * Business logic for term subjects and lecturer assignments
 * Handles validation, transactions, and orchestration
 */

import { pool } from '../config/db.js';
import * as termSubjectRepo from '../repositories/termSubject.repository.js';
import * as termRepo from '../repositories/term.repository.js';
import { BusinessError } from '../utils/termValidation.js';

/**
 * Add subject to term
 */
export async function addSubjectToTerm(termSubjectData, userId) {
    const { term_id, subject_id } = termSubjectData;

    const client = await pool.connect();
    try {
        // Validate term exists
        const term = await termRepo.findTermById(client, term_id);
        if (!term) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        // Check for duplicate
        const existing = await termSubjectRepo.findTermSubjectByTermAndSubject(client, term_id, subject_id);
        if (existing) {
            throw new BusinessError(
                'This subject is already added to this term',
                'DUPLICATE_TERM_SUBJECT',
                409
            );
        }

        await client.query('BEGIN');

        const termSubject = await termSubjectRepo.insertTermSubject(client, termSubjectData, userId);

        await client.query('COMMIT');
        return termSubject;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all subjects in a term
 */
export async function getTermSubjects(termId) {
    const client = await pool.connect();
    try {
        const term = await termRepo.findTermById(client, termId);
        if (!term) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        return await termSubjectRepo.findTermSubjectsByTermId(client, termId);
    } finally {
        client.release();
    }
}

/**
 * Get term subject by ID
 */
export async function getTermSubjectById(termSubjectId) {
    const client = await pool.connect();
    try {
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        return termSubject;
    } finally {
        client.release();
    }
}

/**
 * Update term subject
 */
export async function updateTermSubject(termSubjectId, data, userId) {
    const client = await pool.connect();
    try {
        const existing = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!existing) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        await client.query('BEGIN');

        const updated = await termSubjectRepo.updateTermSubject(client, termSubjectId, data, userId);

        await client.query('COMMIT');
        return updated;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Remove subject from term
 */
export async function removeSubjectFromTerm(termSubjectId) {
    const client = await pool.connect();
    try {
        const existing = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!existing) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        await client.query('BEGIN');

        // Cascade delete will handle professor assignments
        await termSubjectRepo.deleteTermSubject(client, termSubjectId);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * ==========================================
 * Professor Assignment Operations
 * ==========================================
 */

/**
 * Assign professor to term subject
 */
export async function assignProfessor(termSubjectId, userId, createdBy) {
    const client = await pool.connect();
    try {
        // Validate term subject exists
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        await client.query('BEGIN');

        const assignment = await termSubjectRepo.assignProfessor(client, termSubjectId, userId, createdBy);

        await client.query('COMMIT');
        return assignment;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all professors for term subject
 */
export async function getTermSubjectProfessors(termSubjectId) {
    const client = await pool.connect();
    try {
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        return await termSubjectRepo.findProfessorsByTermSubject(client, termSubjectId);
    } finally {
        client.release();
    }
}

/**
 * Remove professor from term subject
 */
export async function removeProfessor(termSubjectId, userId) {
    const client = await pool.connect();
    try {
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        await client.query('BEGIN');

        await termSubjectRepo.removeProfessor(client, termSubjectId, userId);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function changeResponsibleLecturer(termSubjectId, newResponsibleUserId) {
    // Validate term subject exists
    const termSubject = await termSubjectRepo.findTermSubjectById(termSubjectId);
    if (!termSubject) {
        throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
    }

    // Validate new responsible lecturer is assigned
    const lecturerAssignment = await termSubjectRepo.findLecturerAssignment(termSubjectId, newResponsibleUserId);
    if (!lecturerAssignment) {
        throw new BusinessError(
            'Lecturer must be assigned to this subject before being set as responsible',
            'LECTURER_NOT_ASSIGNED',
            400
        );
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear all responsible lecturers
        await termSubjectRepo.clearResponsibleLecturers(client, termSubjectId);

        // Set new responsible lecturer
        const updated = await termSubjectRepo.updateLecturerAssignment(client, lecturerAssignment.id, {
            is_responsible: true,
            notes: lecturerAssignment.notes,
        });

        await client.query('COMMIT');
        return updated;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update lecturer assignment notes
 */
export async function updateLecturerNotes(assignmentId, notes) {
    const assignment = await termSubjectRepo.findLecturerAssignmentById(assignmentId);
    if (!assignment) {
        throw new BusinessError('Lecturer assignment not found', 'ASSIGNMENT_NOT_FOUND', 404);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updated = await termSubjectRepo.updateLecturerAssignment(client, assignmentId, {
            is_responsible: assignment.is_responsible,
            notes,
        });

        await client.query('COMMIT');
        return updated;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Remove lecturer from term subject
 */
export async function removeLecturer(assignmentId) {
    const assignment = await termSubjectRepo.findLecturerAssignmentById(assignmentId);
    if (!assignment) {
        throw new BusinessError('Lecturer assignment not found', 'ASSIGNMENT_NOT_FOUND', 404);
    }

    // Check if this is the responsible lecturer
    if (assignment.is_responsible) {
        const lecturerCount = await termSubjectRepo.countLecturers(assignment.term_subject_id);
        if (lecturerCount > 1) {
            throw new BusinessError(
                'Cannot remove responsible lecturer. Please assign another responsible lecturer first.',
                'CANNOT_REMOVE_RESPONSIBLE',
                400
            );
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await termSubjectRepo.deleteLecturerAssignment(client, assignmentId);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get responsible lecturer for term subject
 */
export async function getResponsibleLecturer(termSubjectId) {
    const termSubject = await termSubjectRepo.findTermSubjectById(termSubjectId);
    if (!termSubject) {
        throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
    }

    return await termSubjectRepo.findResponsibleLecturer(termSubjectId);
}

/**
 * ดึงข้อมูลสถานะรายวิชาในเทอม
 * รองรับการแสดงผลแยกตาม role: 
 * - Academic Officer / Program Chair: ดูได้ทั้งหมด
 * - Professor: ดูเฉพาะวิชาที่สอน
 * 
 * @param {number} termId - Term ID
 * @param {Object} user - ข้อมูล user จาก req.user (มี id และ roles)
 * @returns {Promise<Array>} รายการรายวิชาพร้อมสถานะ
 */
export async function getTermSubjectsStatus(termId, user) {
    const client = await pool.connect();
    try {
        // ตรวจสอบว่า term มีอยู่จริง
        const term = await termRepo.findTermById(client, termId);
        if (!term) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        // ตรวจสอบ role เพื่อดึงข้อมูล
        const userRoles = user.roles || [];
        const isAcademicStaff = userRoles.includes('Academic Officer') || userRoles.includes('Program Chair');

        let subjects;
        if (isAcademicStaff) {
            // Academic staff ดูได้ทั้งหมด
            subjects = await termSubjectRepo.findTermSubjectsWithStatus(client, termId);
        } else {
            // Professor ดูเฉพาะวิชาที่สอน
            subjects = await termSubjectRepo.findTermSubjectsByProfessor(client, termId, user.id);
        }

        return subjects;
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูลสถานะรายวิชาในเทอมที่ active อยู่
 * ใช้สำหรับ tab "สถานะรายวิชา" ที่แสดงเฉพาะ current term
 * 
 * @param {Object} user - ข้อมูล user จาก req.user
 * @returns {Promise<Array>} รายการรายวิชาใน active term
 */
export async function getActiveTermSubjectsStatus(user) {
    const client = await pool.connect();
    try {
        // ตรวจสอบว่ามี active term หรือไม่
        const activeTerm = await termRepo.findActiveTerms(client);
        if (!activeTerm || activeTerm.length === 0) {
            throw new BusinessError('No active term found', 'NO_ACTIVE_TERM', 404);
        }

        // ตรวจสอบ role
        const userRoles = user.roles || [];
        const isProfessor = userRoles.includes('Professor') &&
            !userRoles.includes('Academic Officer') &&
            !userRoles.includes('Program Chair');

        // ดึงข้อมูลตาม role
        const subjects = await termSubjectRepo.findActiveTermSubjectsWithStatus(
            client,
            user.id,
            isProfessor
        );

        return {
            term: activeTerm[0], // ส่งข้อมูล term กลับไปด้วย
            subjects: subjects,
        };
    } finally {
        client.release();
    }
}

/**
 * มอบหมายอาจารย์ให้สอนวิชา
 * เฉพาะ Academic Officer เท่านั้นที่ทำได้
 * 
 * @param {number} termSubjectId - Term Subject ID
 * @param {number} professorId - User ID ของอาจารย์
 * @param {number} createdBy - User ID ของคนที่ทำการมอบหมาย
 * @returns {Promise<Object>} ข้อมูลการมอบหมาย
 */
export async function assignProfessorToSubject(termSubjectId, professorId, createdBy) {
    const client = await pool.connect();
    try {
        // ตรวจสอบว่า term subject มีอยู่จริง
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        // ตรวจสอบว่าอาจารย์ถูก assign ไปแล้วหรือยัง
        const existingAssignment = await termSubjectRepo.findProfessorsByTermSubject(client, termSubjectId);
        const alreadyAssigned = existingAssignment.some(p => p.user_id === professorId);

        if (alreadyAssigned) {
            throw new BusinessError(
                'Professor already assigned to this subject',
                'ALREADY_ASSIGNED',
                409
            );
        }

        await client.query('BEGIN');

        // เพิ่มการ assign
        const assignment = await termSubjectRepo.assignProfessor(client, termSubjectId, professorId, createdBy);

        await client.query('COMMIT');

        return assignment;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูล term subject โดยละเอียด พร้อมเช็คสิทธิ์
 * Professor ดูได้เฉพาะวิชาที่ตัวเองสอน
 * 
 * @param {number} termSubjectId - Term Subject ID
 * @param {Object} user - ข้อมูล user จาก req.user
 * @returns {Promise<Object>} ข้อมูล term subject
 */
export async function getTermSubjectDetail(termSubjectId, user) {
    const client = await pool.connect();
    try {
        const termSubject = await termSubjectRepo.findTermSubjectById(client, termSubjectId);
        if (!termSubject) {
            throw new BusinessError('Term subject not found', 'TERM_SUBJECT_NOT_FOUND', 404);
        }

        // ตรวจสอบสิทธิ์
        const userRoles = user.roles || [];
        const isAcademicStaff = userRoles.includes('Academic Officer') || userRoles.includes('Program Chair');

        // ถ้าไม่ใช่ academic staff ต้องเช็คว่าเป็นอาจารย์ที่สอนวิชานี้หรือไม่
        if (!isAcademicStaff) {
            const professors = await termSubjectRepo.findProfessorsByTermSubject(client, termSubjectId);
            const isProfessorOfSubject = professors.some(p => p.user_id === user.id);

            if (!isProfessorOfSubject) {
                throw new BusinessError(
                    'You do not have permission to view this subject',
                    'PERMISSION_DENIED',
                    403
                );
            }
        }

        // ดึงข้อมูลอาจารย์ผู้สอน
        const professors = await termSubjectRepo.findProfessorsByTermSubject(client, termSubjectId);
        termSubject.professors = professors;

        return termSubject;
    } finally {
        client.release();
    }
}
