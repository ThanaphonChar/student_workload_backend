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
        student_year_ids,
        count_workload,
        is_active,
    } = subjectData;

    // Insert subject without student_year_id (will use junction table)
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

    const result = await query(sql, values);
    const subject = result.rows[0];

    console.log('[Subject Service] 📊 Received student_year_ids:', student_year_ids);
    console.log('[Subject Service] 📊 Type:', Array.isArray(student_year_ids), 'Length:', student_year_ids?.length);

    // Insert junction table records for each student year
    const hasJunctionTable = await checkJunctionTableExists();

    if (hasJunctionTable && student_year_ids && student_year_ids.length > 0) {
        console.log('[Subject Service] ✅ Junction table exists, inserting records...');
        try {
            await insertSubjectStudentYears(subject.id, student_year_ids);
            console.log('[Subject Service] ✅ Junction records inserted successfully');
        } catch (error) {
            console.error('[Subject Service] ❌ Failed to insert junction records:', error.message);
            // ถ้า junction table ล้มเหลว แต่ subject สร้างสำเร็จแล้ว ให้ส่ง warning
            console.warn('[Subject Service] ⚠️ Subject created but junction table failed. Run migration.sql');
        }
    } else if (!hasJunctionTable) {
        console.warn('[Subject Service] ⚠️ Junction table not found. Please run migration.sql');
    } else if (!student_year_ids || student_year_ids.length === 0) {
        console.warn('[Subject Service] ⚠️ No student_year_ids provided');
    }

    // Return subject with student_year_ids array
    return {
        ...subject,
        student_year_ids: student_year_ids || [],
    };
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

    let sql;
    if (updates.length > 1) {
        sql = `
            UPDATE subjects
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(id);
        const result = await query(sql, values);
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
    // ไม่ใช้ cache เพื่อให้ตรวจสอบทุกครั้ง (กรณี migrate ระหว่างรัน server)
    try {
        const sql = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'subjects_student_years'
            )
        `;
        const result = await query(sql, []);
        const exists = result.rows[0].exists;
        console.log('[Subject Service] 🔍 Junction table check:', exists);
        return exists;
    } catch (error) {
        console.warn('[Subject Service] ⚠️ Cannot check junction table:', error.message);
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
 * Insert subject-student_year relationships
 * @param {number} subjectId - Subject ID
 * @param {Array<number>} studentYearIds - Array of Student Year IDs
 * @returns {Promise<void>}
 */
async function insertSubjectStudentYears(subjectId, studentYearIds) {
    if (!studentYearIds || studentYearIds.length === 0) {
        return;
    }

    try {
        // แปลง array เป็น integers ก่อน
        const yearIds = studentYearIds.map(id => parseInt(id, 10));
        console.log('[Subject Service] 📝 Inserting junction records:', { subjectId, yearIds });

        const values = yearIds
            .map((_, index) => `($1, $${index + 2}, NOW())`)
            .join(', ');

        const sql = `
            INSERT INTO subjects_student_years (subject_id, student_year_id, created_at)
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
