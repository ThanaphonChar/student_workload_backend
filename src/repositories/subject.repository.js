/**
 * Subject Repository
 * รับผิดชอบการติดต่อกับฐานข้อมูลเท่านั้น - Pure SQL operations
 * ไม่มี business logic, ไม่มี validation
 */

import { query } from '../config/db.js';

/**
 * สร้าง subject ใหม่ในฐานข้อมูล
 * @param {Object} client - Database client (สำหรับ transaction)
 * @param {Object} subjectData - ข้อมูล subject
 * @returns {Promise<Object>} subject ที่สร้างสำเร็จ (พร้อม id)
 */
export async function insertSubject(client, subjectData) {
    const sql = `
        INSERT INTO subjects (
            code_th,
            code_eng,
            name_th,
            name_eng,
            program_id,
            credit,
            outline,
            count_workload,
            is_active,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
    `;

    const values = [
        subjectData.code_th,
        subjectData.code_eng || null,
        subjectData.name_th,
        subjectData.name_eng || null,
        subjectData.program_id,
        subjectData.credit,
        subjectData.outline || null,
        subjectData.count_workload ?? true,
        subjectData.is_active ?? true,
    ];

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * สร้างความสัมพันธ์ระหว่าง subject และ student_years (junction table)
 * @param {Object} client - Database client (สำหรับ transaction)
 * @param {number} subjectId - ID ของ subject
 * @param {Array<number>} studentYearIds - Array ของ student_year IDs
 * @returns {Promise<void>}
 */
export async function insertSubjectStudentYears(client, subjectId, studentYearIds) {
    if (!studentYearIds || studentYearIds.length === 0) {
        return;
    }

    // สร้าง placeholders: ($1, $2), ($1, $3), ($1, $4), ...
    const placeholders = studentYearIds
        .map((_, index) => `($1, $${index + 2})`)
        .join(', ');

    const sql = `
        INSERT INTO subject_student_years (subject_id, student_year_id, created_at)
        VALUES ${placeholders}
    `;

    const values = [subjectId, ...studentYearIds];
    await client.query(sql, values);
}

/**
 * ลบความสัมพันธ์ทั้งหมดระหว่าง subject และ student_years
 * @param {Object} client - Database client (สำหรับ transaction)
 * @param {number} subjectId - ID ของ subject
 * @returns {Promise<void>}
 */
export async function deleteSubjectStudentYears(client, subjectId) {
    const sql = 'DELETE FROM subject_student_years WHERE subject_id = $1';
    await client.query(sql, [subjectId]);
}

/**
 * ดึงข้อมูล subject ทั้งหมด พร้อม student_years
 * @param {Object} filters - Filter options (program_id, student_year_id, is_active)
 * @returns {Promise<Array>} Array ของ subjects
 */
export async function findAllSubjects(filters = {}) {
    let sql = `
        SELECT 
            s.*,
            p.program_year,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', sy.id,
                        'student_year', sy.student_year
                    ) ORDER BY sy.id
                ) FILTER (WHERE sy.id IS NOT NULL),
                '[]'
            ) as student_years
        FROM subjects s
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN subject_student_years ssy ON s.id = ssy.subject_id
        LEFT JOIN student_years sy ON ssy.student_year_id = sy.id
        WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    if (filters.program_id) {
        sql += ` AND s.program_id = $${paramCount}`;
        values.push(filters.program_id);
        paramCount++;
    }

    if (filters.student_year_id) {
        sql += ` AND EXISTS (
            SELECT 1 FROM subject_student_years ssy2 
            WHERE ssy2.subject_id = s.id 
            AND ssy2.student_year_id = $${paramCount}
        )`;
        values.push(filters.student_year_id);
        paramCount++;
    }

    if (filters.is_active !== undefined) {
        sql += ` AND s.is_active = $${paramCount}`;
        values.push(filters.is_active);
        paramCount++;
    }

    sql += ` GROUP BY s.id, p.program_year ORDER BY s.created_at DESC`;

    const result = await query(sql, values);
    return result.rows;
}

/**
 * ดึงข้อมูล subject ตาม ID พร้อม student_years
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Subject object หรือ null ถ้าไม่เจอ
 */
export async function findSubjectById(id) {
    const sql = `
        SELECT 
            s.*,
            p.program_year,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', sy.id,
                        'student_year', sy.student_year
                    ) ORDER BY sy.id
                ) FILTER (WHERE sy.id IS NOT NULL),
                '[]'
            ) as student_years
        FROM subjects s
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN subject_student_years ssy ON s.id = ssy.subject_id
        LEFT JOIN student_years sy ON ssy.student_year_id = sy.id
        WHERE s.id = $1
        GROUP BY s.id, p.program_year
    `;

    const result = await query(sql, [id]);
    return result.rows[0] || null;
}

/**
 * อัปเดตข้อมูล subject
 * @param {Object} client - Database client (สำหรับ transaction)
 * @param {number} id - Subject ID
 * @param {Object} updateData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<Object|null>} Subject ที่อัปเดตแล้ว หรือ null
 */
export async function updateSubject(client, id, updateData) {
    const allowedFields = [
        'code_th',
        'code_eng',
        'name_th',
        'name_eng',
        'program_id',
        'credit',
        'outline',
        'count_workload',
        'is_active',
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
            updates.push(`${key} = $${paramCount}`);
            values.push(updateData[key]);
            paramCount++;
        }
    });

    if (updates.length === 0) {
        return null;
    }

    updates.push(`updated_at = NOW()`);

    const sql = `
        UPDATE subjects
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `;

    values.push(id);

    const result = await client.query(sql, values);
    return result.rows[0] || null;
}

/**
 * Soft delete subject (เปลี่ยน is_active = false)
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Subject ที่ถูก deactivate หรือ null
 */
export async function deactivateSubject(id) {
    const sql = `
        UPDATE subjects
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;

    const result = await query(sql, [id]);
    return result.rows[0] || null;
}

/**
 * ตรวจสอบว่า program มีอยู่จริงหรือไม่
 * @param {number} programId - Program ID
 * @returns {Promise<boolean>}
 */
export async function checkProgramExists(programId) {
    const sql = 'SELECT 1 FROM programs WHERE id = $1 LIMIT 1';
    const result = await query(sql, [programId]);
    return result.rows.length > 0;
}

/**
 * ตรวจสอบว่า student_year มีอยู่จริงหรือไม่
 * @param {number} studentYearId - Student Year ID
 * @returns {Promise<boolean>}
 */
export async function checkStudentYearExists(studentYearId) {
    const sql = 'SELECT 1 FROM student_years WHERE id = $1 LIMIT 1';
    const result = await query(sql, [studentYearId]);
    return result.rows.length > 0;
}

/**
 * ตรวจสอบว่า student_years หลายตัวมีอยู่จริงหรือไม่ (แบบ bulk)
 * @param {Array<number>} studentYearIds - Array ของ Student Year IDs
 * @returns {Promise<Array<number>>} Array ของ IDs ที่มีอยู่จริง
 */
export async function findExistingStudentYearIds(studentYearIds) {
    if (!studentYearIds || studentYearIds.length === 0) {
        return [];
    }

    const placeholders = studentYearIds.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT id FROM student_years WHERE id IN (${placeholders})`;

    const result = await query(sql, studentYearIds);
    return result.rows.map(row => row.id);
}

/**
 * ตรวจสอบว่ามี subject ที่มี code_th นี้อยู่แล้วหรือไม่
 * @param {string} codeTh - รหัสวิชาภาษาไทย
 * @param {number|null} excludeId - ID ที่จะไม่นับรวม (สำหรับ update)
 * @returns {Promise<boolean>}
 */
export async function checkSubjectCodeExists(codeTh, excludeId = null) {
    let sql = 'SELECT 1 FROM subjects WHERE code_th = $1';
    const values = [codeTh];

    if (excludeId) {
        sql += ' AND id != $2';
        values.push(excludeId);
    }

    sql += ' LIMIT 1';

    const result = await query(sql, values);
    return result.rows.length > 0;
}

/**
 * Find subjects by multiple IDs
 * @param {Array<number>} subjectIds - Array of subject IDs
 * @returns {Promise<Array>} Array of existing subjects
 */
export async function findSubjectsByIds(subjectIds) {
    if (!subjectIds || subjectIds.length === 0) {
        return [];
    }

    const placeholders = subjectIds.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT id, code_th, code_eng, name_th, name_eng, is_active
        FROM subjects
        WHERE id IN (${placeholders})
    `;

    const result = await query(sql, subjectIds);
    return result.rows;
}
