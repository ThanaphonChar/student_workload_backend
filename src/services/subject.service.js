import { query } from '../config/db.js';

/**
 * Subject Service
 * Database operations for subjects with JOIN support for programs and student_years
 */

/**
 * Create a new subject
 * @param {Object} subjectData - Subject data
 * @returns {Promise<Object>} Created subject
 */
export async function createSubject(subjectData) {
    const {
        code_th,
        code_eng,
        name_th,
        name_eng,
        program_id,
        credit,
        outline,
        student_year_id,
        count_workload,
        is_active,
    } = subjectData;

    const sql = `
        INSERT INTO subjects (
            code_th,
            code_eng,
            name_th,
            name_eng,
            program_id,
            credit,
            outline,
            student_year_id,
            count_workload,
            is_active,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
    `;

    const values = [
        code_th,
        code_eng || null,
        name_th,
        name_eng || null,
        program_id,
        credit,
        outline || null,
        student_year_id,
        count_workload !== undefined ? count_workload : true,
        is_active !== undefined ? is_active : true,
    ];

    const result = await query(sql, values);
    return result.rows[0];
}

/**
 * Get all subjects with JOIN
 * @param {Object} filters - Filter options (program_id, student_year_id, is_active)
 * @returns {Promise<Array>} Array of subjects
 */
export async function getAllSubjects(filters = {}) {
    let sql = `
        SELECT 
            s.*,
            p.program_year,
            sy.student_year
        FROM subjects s
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN student_years sy ON s.student_year_id = sy.id
        WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // Apply filters
    if (filters.program_id) {
        sql += ` AND s.program_id = $${paramCount}`;
        values.push(filters.program_id);
        paramCount++;
    }

    if (filters.student_year_id) {
        sql += ` AND s.student_year_id = $${paramCount}`;
        values.push(filters.student_year_id);
        paramCount++;
    }

    if (filters.is_active !== undefined) {
        sql += ` AND s.is_active = $${paramCount}`;
        values.push(filters.is_active);
        paramCount++;
    }

    sql += ` ORDER BY s.created_at DESC`;

    const result = await query(sql, values);
    return result.rows;
}

/**
 * Get subject by ID with JOIN
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Subject or null if not found
 */
export async function getSubjectById(id) {
    const sql = `
        SELECT 
            s.*,
            p.program_year,
            sy.student_year
        FROM subjects s
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN student_years sy ON s.student_year_id = sy.id
        WHERE s.id = $1
    `;

    const result = await query(sql, [id]);
    return result.rows[0] || null;
}

/**
 * Update subject by ID
 * @param {number} id - Subject ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated subject or null if not found
 */
export async function updateSubject(id, updateData) {
    const allowedFields = [
        'code_th',
        'code_eng',
        'name_th',
        'name_eng',
        'program_id',
        'credit',
        'outline',
        'student_year_id',
        'count_workload',
        'is_active',
    ];

    // Build dynamic UPDATE query
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
        throw new Error('No valid fields to update');
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    const sql = `
        UPDATE subjects
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `;

    values.push(id);

    const result = await query(sql, values);
    return result.rows[0] || null;
}

/**
 * Soft delete subject (set is_active = false)
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Updated subject or null if not found
 */
export async function deleteSubject(id) {
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
 * Check if program exists
 * @param {number} programId - Program ID
 * @returns {Promise<boolean>}
 */
export async function programExists(programId) {
    const sql = 'SELECT id FROM programs WHERE id = $1';
    const result = await query(sql, [programId]);
    return result.rows.length > 0;
}

/**
 * Check if student year exists
 * @param {number} studentYearId - Student Year ID
 * @returns {Promise<boolean>}
 */
export async function studentYearExists(studentYearId) {
    const sql = 'SELECT id FROM student_years WHERE id = $1';
    const result = await query(sql, [studentYearId]);
    return result.rows.length > 0;
}
