import { pool, query } from '../config/db.js';

let _junctionTableExists = null;

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
        student_year_ids,
        count_workload,
        is_active,
    } = subjectData;

    // Validate FK: program must exist
    const programOk = await programExists(program_id);
    if (!programOk) {
        const err = new Error(`ไม่พบหลักสูตรที่มี ID = ${program_id}`);
        err.statusCode = 404;
        throw err;
    }

    // Validate FK: all student years must exist
    if (student_year_ids && student_year_ids.length > 0) {
        for (const yearId of student_year_ids) {
            const yearOk = await studentYearExists(yearId);
            if (!yearOk) {
                const err = new Error(`ไม่พบชั้นปีที่มี ID = ${yearId}`);
                err.statusCode = 404;
                throw err;
            }
        }
    }

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
        code_th,
        code_eng || null,
        name_th,
        name_eng || null,
        program_id,
        credit,
        outline || null,
        count_workload !== undefined ? count_workload : true,
        is_active !== undefined ? is_active : true,
    ];

    const hasJunctionTable = await checkJunctionTableExists();

    if (!hasJunctionTable || !student_year_ids || student_year_ids.length === 0) {
        // No junction records needed — single query is fine
        const result = await query(sql, values);
        const subject = result.rows[0];
        return { ...subject, student_year_ids: student_year_ids || [] };
    }

    // Wrap subject insert + junction inserts in a single transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(sql, values);
        const subject = result.rows[0];

        await insertSubjectStudentYearsWithClient(client, subject.id, student_year_ids);

        await client.query('COMMIT');
        return { ...subject, student_year_ids };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all subjects with JOIN
 * @param {Object} filters - Filter options (program_id, student_year_id, is_active)
 * @returns {Promise<Array>} Array of subjects
 */
export async function getAllSubjects(filters = {}) {
    const hasJunctionTable = await checkJunctionTableExists();

    let sql;

    if (hasJunctionTable) {
        // ใช้ junction table (หลัง migration)
        sql = `
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
            LEFT JOIN subjects_student_years ssy ON s.id = ssy.subject_id
            LEFT JOIN student_years sy ON ssy.student_year_id = sy.id
            WHERE 1=1
        `;
    } else {
        // ไม่มี junction table - return subjects โดยไม่มี student_years
        sql = `
            SELECT 
                s.*,
                p.program_year,
                '[]'::json as student_years
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.id
            WHERE 1=1
        `;
    }

    const values = [];
    let paramCount = 1;

    // Apply filters
    if (filters.program_id) {
        sql += ` AND s.program_id = $${paramCount}`;
        values.push(filters.program_id);
        paramCount++;
    }

    if (filters.student_year_id) {
        if (hasJunctionTable) {
            sql += ` AND EXISTS (
                SELECT 1 FROM subjects_student_years ssy2 
                WHERE ssy2.subject_id = s.id 
                AND ssy2.student_year_id = $${paramCount}
            )`;
            values.push(filters.student_year_id);
            paramCount++;
        }
        // ถ้าไม่มี junction table ให้ skip filter นี้
    }

    if (filters.is_active !== undefined) {
        sql += ` AND s.is_active = $${paramCount}`;
        values.push(filters.is_active);
        paramCount++;
    }

    if (hasJunctionTable) {
        sql += ` GROUP BY s.id, p.program_year`;
    }
    // ไม่ต้อง GROUP BY ถ้าไม่มี junction table

    sql += ` ORDER BY s.created_at DESC`;

    const result = await query(sql, values);

    // Transform student_years to student_year_ids array
    return result.rows.map(row => ({
        ...row,
        student_year_ids: row.student_years.map(sy => sy.id).filter(id => id),
        student_years: row.student_years.filter(sy => sy.id),
    }));
}

/**
 * Get subject by ID with JOIN
 * @param {number} id - Subject ID
 * @returns {Promise<Object|null>} Subject or null if not found
 */
export async function getSubjectById(id) {
    const hasJunctionTable = await checkJunctionTableExists();

    let sql;

    if (hasJunctionTable) {
        sql = `
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
            LEFT JOIN subjects_student_years ssy ON s.id = ssy.subject_id
            LEFT JOIN student_years sy ON ssy.student_year_id = sy.id
            WHERE s.id = $1
            GROUP BY s.id, p.program_year
        `;
    } else {
        // ไม่มี junction table - return subject โดยไม่มี student_years
        sql = `
            SELECT 
                s.*,
                p.program_year,
                '[]'::json as student_years
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.id
            WHERE s.id = $1
        `;
    }

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    const subject = result.rows[0];
    return {
        ...subject,
        student_year_ids: subject.student_years.map(sy => sy.id).filter(id => id),
    };
}

/**
 * Update subject by ID
 * @param {number} id - Subject ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated subject or null if not found
 */
export async function updateSubject(id, updateData) {
    // Validate FK: program must exist if provided
    if (updateData.program_id) {
        const programOk = await programExists(updateData.program_id);
        if (!programOk) {
            const err = new Error(`ไม่พบหลักสูตรที่มี ID = ${updateData.program_id}`);
            err.statusCode = 404;
            throw err;
        }
    }

    // Validate FK: student years must exist if provided
    if (updateData.student_year_ids && updateData.student_year_ids.length > 0) {
        for (const yearId of updateData.student_year_ids) {
            const yearOk = await studentYearExists(yearId);
            if (!yearOk) {
                const err = new Error(`ไม่พบชั้นปีที่มี ID = ${yearId}`);
                err.statusCode = 404;
                throw err;
            }
        }
    }

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

    // Extract student_year_ids separately
    const { student_year_ids, ...otherUpdates } = updateData;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(otherUpdates).forEach((key) => {
        if (allowedFields.includes(key)) {
            updates.push(`${key} = $${paramCount}`);
            values.push(otherUpdates[key]);
            paramCount++;
        }
    });

    if (updates.length === 0 && !student_year_ids) {
        throw new Error('No valid fields to update');
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length > 1) {
        const sql = `
            UPDATE subjects
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(id);
        await query(sql, values);
    }

    // Update junction table if student_year_ids provided
    const hasJunctionTable = await checkJunctionTableExists();

    if (hasJunctionTable && student_year_ids) {
        try {
            await deleteSubjectStudentYears(id);
            await insertSubjectStudentYears(id, student_year_ids);
        } catch (error) {
            console.error('[Subject Service] ❌ Failed to update junction records:', error.message);
            console.warn('[Subject Service] ⚠️ Please run migration.sql');
        }
    } else if (!hasJunctionTable && student_year_ids) {
        console.warn('[Subject Service] ⚠️ Junction table not found. Cannot update student_year_ids. Run migration.sql');
    }

    // Return updated subject with student_year_ids
    return getSubjectById(id);
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
 * Check if junction table exists
 * @returns {Promise<boolean>}
 */
async function checkJunctionTableExists() {
    if (_junctionTableExists !== null) return _junctionTableExists;
    try {
        const sql = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'subjects_student_years'
            )
        `;
        const result = await query(sql, []);
        _junctionTableExists = result.rows[0].exists;
        return _junctionTableExists;
    } catch (error) {
        return false;
    }
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

/**
 * Get student year IDs for a subject
 * @param {number} subjectId - Subject ID
 * @returns {Promise<Array<number>>} Array of student year IDs
 */
export async function getSubjectStudentYears(subjectId) {
    const sql = `
        SELECT sy.id
        FROM subjects_student_years ssy
        JOIN student_years sy ON ssy.student_year_id = sy.id
        WHERE ssy.subject_id = $1
        ORDER BY sy.student_year ASC
    `;
    const result = await query(sql, [subjectId]);
    return result.rows.map(row => row.id);
}

/**
 * Insert subject-student_year relationships
 * @param {number} subjectId - Subject ID
 * @param {Array<number>} studentYearIds - Array of Student Year IDs
 * @returns {Promise<void>}
 */
async function insertSubjectStudentYearsWithClient(client, subjectId, studentYearIds) {
    if (!studentYearIds || studentYearIds.length === 0) return;
    const yearIds = studentYearIds.map(id => parseInt(id, 10));
    const valuePlaceholders = yearIds.map((_, index) => `($1, $${index + 2})`).join(', ');
    const sql = `INSERT INTO subjects_student_years (subject_id, student_year_id) VALUES ${valuePlaceholders}`;
    await client.query(sql, [subjectId, ...yearIds]);
}

async function insertSubjectStudentYears(subjectId, studentYearIds) {
    if (!studentYearIds || studentYearIds.length === 0) {
        return;
    }

    try {
        // แปลง array เป็น integers ก่อน
        const yearIds = studentYearIds.map(id => parseInt(id, 10));
        console.log('[Subject Service] 📝 Inserting junction records:', { subjectId, yearIds });

        const values = yearIds
            .map((_, index) => `($1, $${index + 2})`)
            .join(', ');

        const sql = `
            INSERT INTO subjects_student_years (subject_id, student_year_id)
            VALUES ${values}
        `;

        console.log('[Subject Service] 📝 SQL:', sql);
        console.log('[Subject Service] 📝 Values:', [subjectId, ...yearIds]);

        await query(sql, [subjectId, ...yearIds]);
        console.log('[Subject Service] ✅ Inserted', yearIds.length, 'junction records');
    } catch (error) {
        console.error('[Subject Service] ❌ Insert junction error:', error.message);
        throw error;
    }
}

/**
 * Delete all subject-student_year relationships for a subject
 * @param {number} subjectId - Subject ID
 * @returns {Promise<void>}
 */
async function deleteSubjectStudentYears(subjectId) {
    const sql = 'DELETE FROM subjects_student_years WHERE subject_id = $1';
    await query(sql, [subjectId]);
}
