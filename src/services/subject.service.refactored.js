/**
 * Subject Service (New Architecture)
 * รับผิดชอบ business logic และ orchestration
 * ใช้ repository สำหรับ database operations
 * ใช้ validation utils สำหรับ input validation
 */

import pool from '../config/db.js';
import * as subjectRepo from '../repositories/subject.repository.js';
import {
    validateCreateSubjectData,
    validateUpdateSubjectData,
    normalizeSubjectData,
    ValidationError
} from '../utils/subjectValidation.js';

/**
 * Business Error สำหรับ error ที่เกิดจาก business rules
 */
export class BusinessError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'BusinessError';
        this.statusCode = statusCode;
    }
}

/**
 * สร้าง subject ใหม่พร้อมกับ student_years (Transaction-safe)
 * 
 * Business Rules:
 * 1. ข้อมูล subject ต้อง valid ทั้งหมด
 * 2. program_id ต้องมีอยู่จริง
 * 3. student_year_ids ทุกตัวต้องมีอยู่จริง
 * 4. code_th ต้องไม่ซ้ำกับที่มีอยู่แล้ว
 * 5. ต้อง insert subject + junction table เป็น transaction เดียวกัน
 * 
 * @param {Object} subjectData - ข้อมูล subject
 * @returns {Promise<Object>} subject ที่สร้างสำเร็จ (พร้อม student_year_ids)
 * @throws {ValidationError} ถ้าข้อมูลไม่ valid
 * @throws {BusinessError} ถ้าผิด business rules
 */
export async function createSubject(subjectData) {
    // Step 1: Validate input
    validateCreateSubjectData(subjectData);

    // Step 2: Normalize data
    const normalizedData = normalizeSubjectData(subjectData);

    // Step 3: ตรวจสอบว่า program มีอยู่จริง
    const programExists = await subjectRepo.checkProgramExists(normalizedData.program_id);
    if (!programExists) {
        throw new BusinessError(
            `ไม่พบ program ที่มี id = ${normalizedData.program_id}`,
            404
        );
    }

    // Step 4: ตรวจสอบว่า student_years ทั้งหมดมีอยู่จริง
    const existingYearIds = await subjectRepo.findExistingStudentYearIds(
        normalizedData.student_year_ids
    );

    const missingYearIds = normalizedData.student_year_ids.filter(
        id => !existingYearIds.includes(id)
    );

    if (missingYearIds.length > 0) {
        throw new BusinessError(
            `ไม่พบ student_year ที่มี id: ${missingYearIds.join(', ')}`,
            404
        );
    }

    // Step 5: ตรวจสอบว่า code_th ซ้ำหรือไม่
    const codeExists = await subjectRepo.checkSubjectCodeExists(normalizedData.code_th);
    if (codeExists) {
        throw new BusinessError(
            `รหัสวิชา ${normalizedData.code_th} มีอยู่ในระบบแล้ว`,
            409
        );
    }

    // Step 6: เริ่ม transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 6.1: Insert subject
        const subject = await subjectRepo.insertSubject(client, normalizedData);

        // Step 6.2: Insert junction table records
        await subjectRepo.insertSubjectStudentYears(
            client,
            subject.id,
            normalizedData.student_year_ids
        );

        await client.query('COMMIT');

        console.log('[Subject Service] ✅ Subject created:', subject.id);

        // Step 7: Return subject พร้อม student_year_ids
        return {
            ...subject,
            student_year_ids: normalizedData.student_year_ids,
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Subject Service] ❌ Transaction failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูล subject ทั้งหมด พร้อม student_years
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array ของ subjects
 */
export async function getAllSubjects(filters = {}) {
    const subjects = await subjectRepo.findAllSubjects(filters);

    // แปลง student_years เป็น student_year_ids array
    return subjects.map(subject => ({
        ...subject,
        student_year_ids: subject.student_years.map(sy => sy.id),
    }));
}

/**
 * ดึงข้อมูล subject ตาม ID พร้อม student_years
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Subject object หรือ null
 * @throws {BusinessError} ถ้าไม่เจอ subject
 */
export async function getSubjectById(id) {
    const subject = await subjectRepo.findSubjectById(id);

    if (!subject) {
        throw new BusinessError(`ไม่พบ subject ที่มี id = ${id}`, 404);
    }

    return {
        ...subject,
        student_year_ids: subject.student_years.map(sy => sy.id),
    };
}

/**
 * อัปเดต subject (Transaction-safe)
 * 
 * Business Rules:
 * 1. Subject ต้องมีอยู่จริง
 * 2. ถ้าอัปเดต program_id → ต้องมีอยู่จริง
 * 3. ถ้าอัปเดต student_year_ids → ทุกตัวต้องมีอยู่จริง
 * 4. ถ้าอัปเดต code_th → ต้องไม่ซ้ำ
 * 5. อัปเดต subject + junction table เป็น transaction เดียวกัน
 * 
 * @param {number} id - Subject ID
 * @param {Object} updateData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<Object>} Subject ที่อัปเดตแล้ว
 * @throws {ValidationError} ถ้าข้อมูลไม่ valid
 * @throws {BusinessError} ถ้าผิด business rules
 */
export async function updateSubject(id, updateData) {
    // Step 1: Validate input
    validateUpdateSubjectData(updateData);

    // Step 2: Normalize data
    const normalizedData = normalizeSubjectData(updateData);

    // Step 3: ตรวจสอบว่า subject มีอยู่จริง
    const existingSubject = await subjectRepo.findSubjectById(id);
    if (!existingSubject) {
        throw new BusinessError(`ไม่พบ subject ที่มี id = ${id}`, 404);
    }

    // Step 4: ตรวจสอบ program_id (ถ้ามี)
    if (normalizedData.program_id) {
        const programExists = await subjectRepo.checkProgramExists(normalizedData.program_id);
        if (!programExists) {
            throw new BusinessError(
                `ไม่พบ program ที่มี id = ${normalizedData.program_id}`,
                404
            );
        }
    }

    // Step 5: ตรวจสอบ student_year_ids (ถ้ามี)
    if (normalizedData.student_year_ids) {
        const existingYearIds = await subjectRepo.findExistingStudentYearIds(
            normalizedData.student_year_ids
        );

        const missingYearIds = normalizedData.student_year_ids.filter(
            id => !existingYearIds.includes(id)
        );

        if (missingYearIds.length > 0) {
            throw new BusinessError(
                `ไม่พบ student_year ที่มี id: ${missingYearIds.join(', ')}`,
                404
            );
        }
    }

    // Step 6: ตรวจสอบ code_th ซ้ำ (ถ้ามี)
    if (normalizedData.code_th) {
        const codeExists = await subjectRepo.checkSubjectCodeExists(
            normalizedData.code_th,
            id // exclude current subject
        );
        if (codeExists) {
            throw new BusinessError(
                `รหัสวิชา ${normalizedData.code_th} มีอยู่ในระบบแล้ว`,
                409
            );
        }
    }

    // Step 7: เริ่ม transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 7.1: แยก student_year_ids ออกจาก updateData
        const { student_year_ids, ...subjectUpdateData } = normalizedData;

        // Step 7.2: อัปเดต subject (ถ้ามีข้อมูลที่ต้องอัปเดต)
        if (Object.keys(subjectUpdateData).length > 0) {
            await subjectRepo.updateSubject(client, id, subjectUpdateData);
        }

        // Step 7.3: อัปเดต junction table (ถ้ามี student_year_ids)
        if (student_year_ids) {
            // ลบ relations เก่าทั้งหมด
            await subjectRepo.deleteSubjectStudentYears(client, id);
            // สร้าง relations ใหม่
            await subjectRepo.insertSubjectStudentYears(client, id, student_year_ids);
        }

        await client.query('COMMIT');

        console.log('[Subject Service] ✅ Subject updated:', id);

        // Step 8: ดึงข้อมูล subject ที่อัปเดตแล้ว
        return getSubjectById(id);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Subject Service] ❌ Transaction failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Soft delete subject (เปลี่ยน is_active = false)
 * @param {number} id - Subject ID
 * @returns {Promise<Object>} Subject ที่ถูก deactivate
 * @throws {BusinessError} ถ้าไม่เจอ subject
 */
export async function deleteSubject(id) {
    const subject = await subjectRepo.deactivateSubject(id);

    if (!subject) {
        throw new BusinessError(`ไม่พบ subject ที่มี id = ${id}`, 404);
    }

    console.log('[Subject Service] ✅ Subject deactivated:', id);
    return subject;
}

/**
 * Find subjects by IDs
 * @param {Array<number>} subjectIds - Array of subject IDs
 * @returns {Promise<Array>} Array of existing subjects
 */
export async function findSubjectsByIds(subjectIds) {
    return await subjectRepo.findSubjectsByIds(subjectIds);
}
