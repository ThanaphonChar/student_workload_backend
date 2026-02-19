/**
 * Work Service
 * 
 * Business logic สำหรับ workload management
 * จัดการ validation, transaction, orchestration
 * 
 * Convention:
 * - ใช้ database connection pool โดยตรง
 * - สร้าง transaction เอง
 * - throw custom errors (BusinessError, ValidationError)
 * - Return clean data structure
 */

import { pool } from '../config/db.js';
import * as workRepository from '../repositories/work.repository.js';
import * as termSubjectRepository from '../repositories/termSubject.repository.js';
import { validateCreateWorkInput, validateUpdateWorkInput, WorkValidationError } from '../utils/workValidation.js';

/**
 * Custom BusinessError class
 * ใช้สำหรับแยกประเภทข้อผิดพลาดด้านธุรกิจจากข้อผิดพลาดอื่น ๆ
 */
export class BusinessError extends Error {
    constructor(message, code = 'BUSINESS_ERROR', statusCode = 400) {
        super(message);
        this.name = 'BusinessError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * สร้าง workload ใหม่
 * 
 * Flow:
 * 1. ตรวจสอบ input validation
 * 2. ตรวจสอบ term_subject มีอยู่และ is_active = true
 * 3. ตรวจสอบไม่มี workload เดิมแล้ว
 * 4. บันทึกลงฐานข้อมูล
 * 
 * @param {number} termSubjectId - ID ของ term_subject
 * @param {object} workData - ข้อมูล {work_title, description, start_date, end_date, hours_per_week}
 * @param {number} userId - ID ของผู้สร้าง (academic officer)
 * 
 * @returns {object} workload ที่สร้าง
 * @throws {WorkValidationError} ถ้า input ไม่ถูกต้อง
 * @throws {BusinessError} ถ้าเกิดข้อผิดพลาดด้านธุรกิจ
 */
export async function createWork(termSubjectId, workData, userId) {
    // 1. ตรวจสอบ input validation
    validateCreateWorkInput(workData);

    const client = await pool.connect();
    try {
        // 2. ตรวจสอบ term_subject มีอยู่
        const termSubject = await termSubjectRepository.findTermSubjectById(client, termSubjectId);

        if (!termSubject) {
            throw new BusinessError(
                'Term subject not found',
                'TERM_SUBJECT_NOT_FOUND',
                404
            );
        }

        // ตรวจสอบ term_subject เป็น active
        if (!termSubject.is_active) {
            throw new BusinessError(
                'Term subject is not active',
                'TERM_SUBJECT_NOT_ACTIVE',
                400
            );
        }

        // 3. บันทึกลงฐานข้อมูล ด้วย transaction
        // (ลบการเช็ค duplicate เพราะต้องการให้มีหลาย workload ได้)
        await client.query('BEGIN');

        const newWork = await workRepository.insertWork(
            client,
            termSubjectId,
            workData,
            userId
        );

        await client.query('COMMIT');

        return newWork;
    } catch (error) {
        await client.query('ROLLBACK');
        
        // ถ้าเป็น BusinessError หรือ WorkValidationError ให้ throw ต่อไป
        if (error instanceof BusinessError || error instanceof WorkValidationError) {
            throw error;
        }

        // ถ้า error อื่น ให้ log และ throw generic error
        console.error('[Work Service] Error creating work:', error);
        throw new BusinessError(
            'Failed to create workload',
            'INTERNAL_SERVER_ERROR',
            500
        );
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูล workload
 * 
 * @param {number} workId - ID ของ workload
 * 
 * @returns {object} workload พร้อมข้อมูลเสริม
 * @throws {BusinessError} ถ้า workload ไม่พบ
 */
export async function getWork(workId) {
    const client = await pool.connect();
    try {
        const work = await workRepository.findWorkWithDetails(client, workId);

        if (!work) {
            throw new BusinessError(
                'Workload not found',
                'WORKLOAD_NOT_FOUND',
                404
            );
        }

        return work;
    } finally {
        client.release();
    }
}

/**
 * ดึง workload ของ term_subject
 * 
 * @param {number} termSubjectId - ID ของ term_subject
 * 
 * @returns {object|null} workload object หรือ null ถ้าไม่มี
 */
export async function getWorkByTermSubject(termSubjectId) {
    const client = await pool.connect();
    try {
        const work = await workRepository.findWorkByTermSubjectId(client, termSubjectId);
        return work;
    } finally {
        client.release();
    }
}

/**
 * อัพเดท workload
 * 
 * Flow:
 * 1. ตรวจสอบ input validation
 * 2. ตรวจสอบ workload มีอยู่
 * 3. อัพเดทลงฐานข้อมูล
 * 
 * @param {number} workId - ID ของ workload ที่ต้องแก้ไข
 * @param {object} updateData - ข้อมูลที่ต้องอัพเดท (partial object)
 * @param {number} userId - ID ของผู้แก้ไข
 * 
 * @returns {object} workload ที่อัพเดท
 * @throws {WorkValidationError} ถ้า input ไม่ถูกต้อง
 * @throws {BusinessError} ถ้า workload ไม่พบ
 */
export async function updateWork(workId, updateData, userId) {
    // 1. ตรวจสอบ input validation
    validateUpdateWorkInput(updateData);

    const client = await pool.connect();
    try {
        // 2. ตรวจสอบ workload มีอยู่
        const existingWork = await workRepository.findWorkById(client, workId);

        if (!existingWork) {
            throw new BusinessError(
                'Workload not found',
                'WORKLOAD_NOT_FOUND',
                404
            );
        }

        // 3. อัพเดทลงฐานข้อมูล
        await client.query('BEGIN');

        const updatedWork = await workRepository.updateWork(
            client,
            workId,
            updateData,
            userId
        );

        await client.query('COMMIT');

        return updatedWork;
    } catch (error) {
        await client.query('ROLLBACK');

        if (error instanceof BusinessError || error instanceof WorkValidationError) {
            throw error;
        }

        console.error('[Work Service] Error updating work:', error);
        throw new BusinessError(
            'Failed to update workload',
            'INTERNAL_SERVER_ERROR',
            500
        );
    } finally {
        client.release();
    }
}

/**
 * ลบ workload
 * 
 * @param {number} workId - ID ของ workload ที่ต้องลบ
 * 
 * @returns {boolean} true ถ้าลบสำเร็จ
 * @throws {BusinessError} ถ้า workload ไม่พบ
 */
export async function deleteWork(workId) {
    const client = await pool.connect();
    try {
        // ตรวจสอบ workload มีอยู่
        const existingWork = await workRepository.findWorkById(client, workId);

        if (!existingWork) {
            throw new BusinessError(
                'Workload not found',
                'WORKLOAD_NOT_FOUND',
                404
            );
        }

        // ลบ
        await client.query('BEGIN');

        const deleted = await workRepository.deleteWork(client, workId);

        await client.query('COMMIT');

        return deleted;
    } catch (error) {
        await client.query('ROLLBACK');

        if (error instanceof BusinessError) {
            throw error;
        }

        console.error('[Work Service] Error deleting work:', error);
        throw new BusinessError(
            'Failed to delete workload',
            'INTERNAL_SERVER_ERROR',
            500
        );
    } finally {
        client.release();
    }
}

/**
 * ดึง workload ทั้งหมดของ term
 * 
 * @param {number} termId - ID ของ term
 * 
 * @returns {array} array ของ workload objects
 */
export async function getWorksByTerm(termId) {
    const client = await pool.connect();
    try {
        const works = await workRepository.findWorksByTermId(client, termId);
        return works;
    } finally {
        client.release();
    }
}

/**
 * ตรวจสอบว่า term_subject มี workload หรือไม่
 * 
 * @param {number} termSubjectId - ID ของ term_subject
 * 
 * @returns {boolean} true ถ้ามี workload อยู่
 */
export async function hasWork(termSubjectId) {
    const client = await pool.connect();
    try {
        return await workRepository.existsByTermSubjectId(client, termSubjectId);
    } finally {
        client.release();
    }
}
