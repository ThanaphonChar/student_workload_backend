/**
 * Term Subject Repository
 * Manages subjects within academic terms
 * Uses existing 'term_subjects' table with approval status tracking
 */

import { pool } from '../config/db.js';

/**
 * Insert new term subject
 */
export async function insertTermSubject(client, termSubjectData, userId) {
    const sql = `
        INSERT INTO term_subjects (
            term_id,
            subject_id,
            is_active,
            outline_status,
            outline_approved,
            workload_status,
            report_status,
            report_approved,
            created_at,
            created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        RETURNING *
    `;

    const values = [
        termSubjectData.term_id,
        termSubjectData.subject_id,
        termSubjectData.is_active !== undefined ? termSubjectData.is_active : true,
        termSubjectData.outline_status || false,
        termSubjectData.outline_approved || 'pending',
        termSubjectData.workload_status || false,
        termSubjectData.report_status || false,
        termSubjectData.report_approved || 'pending',
        userId
    ];

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * Find all term subjects by term ID
 */
export async function findTermSubjectsByTermId(client, termId) {
    const sql = `
        SELECT 
            ts.*,
            s.code_th,
            s.code_eng,
            s.name_th,
            s.name_eng,
            s.credit
        FROM term_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        WHERE ts.term_id = $1
        ORDER BY s.code_eng
    `;
    const result = await client.query(sql, [termId]);
    return result.rows;
}

/**
 * Find term subject by ID
 */
export async function findTermSubjectById(client, termSubjectId) {
    const sql = `
        SELECT 
            ts.*,
            s.code_th,
            s.code_eng,
            s.name_th,
            s.name_eng,
            s.credit
        FROM term_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        WHERE ts.id = $1
    `;
    const result = await client.query(sql, [termSubjectId]);
    return result.rows[0];
}

/**
 * Check if term-subject combination exists
 */
export async function findTermSubjectByTermAndSubject(client, termId, subjectId) {
    const sql = `
        SELECT * FROM term_subjects
        WHERE term_id = $1 AND subject_id = $2
    `;
    const result = await client.query(sql, [termId, subjectId]);
    return result.rows[0];
}

/**
 * Update term subject
 */
export async function updateTermSubject(client, termSubjectId, updateData, userId) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.is_active !== undefined) {
        fields.push(`is_active = $${paramCount}`);
        values.push(updateData.is_active);
        paramCount++;
    }

    if (updateData.outline_status !== undefined) {
        fields.push(`outline_status = $${paramCount}`);
        values.push(updateData.outline_status);
        paramCount++;
    }

    if (updateData.outline_approved !== undefined) {
        fields.push(`outline_approved = $${paramCount}`);
        values.push(updateData.outline_approved);
        paramCount++;
    }

    if (updateData.workload_status !== undefined) {
        fields.push(`workload_status = $${paramCount}`);
        values.push(updateData.workload_status);
        paramCount++;
    }

    if (updateData.report_status !== undefined) {
        fields.push(`report_status = $${paramCount}`);
        values.push(updateData.report_status);
        paramCount++;
    }

    if (updateData.report_approved !== undefined) {
        fields.push(`report_approved = $${paramCount}`);
        values.push(updateData.report_approved);
        paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${paramCount}`);
    values.push(userId);
    paramCount++;

    values.push(termSubjectId);

    const sql = `
        UPDATE term_subjects
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `;

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * Delete term subject
 */
export async function deleteTermSubject(client, termSubjectId) {
    const sql = 'DELETE FROM term_subjects WHERE id = $1 RETURNING *';
    const result = await client.query(sql, [termSubjectId]);
    return result.rows[0];
}

/**
 * Assign professor to term subject
 */
export async function assignProfessor(client, termSubjectId, userId, createdBy) {
    const sql = `
        INSERT INTO term_subjects_professor (
            term_subject_id,
            user_id,
            created_at,
            created_by
        ) VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (term_subject_id, user_id) DO NOTHING
        RETURNING *
    `;
    const result = await client.query(sql, [termSubjectId, userId, createdBy]);
    return result.rows[0];
}

/**
 * Remove professor from term subject
 */
export async function removeProfessor(client, termSubjectId, userId) {
    const sql = `
        DELETE FROM term_subjects_professor
        WHERE term_subject_id = $1 AND user_id = $2
        RETURNING *
    `;
    const result = await client.query(sql, [termSubjectId, userId]);
    return result.rows[0];
}

/**
 * Get all professors for a term subject
 */
export async function findProfessorsByTermSubject(client, termSubjectId) {
    const sql = `
        SELECT 
            tsp.*,
            u.email,
            u.first_name_th,
            u.last_name_th,
            u.first_name_en,
            u.last_name_en
        FROM term_subjects_professor tsp
        JOIN users u ON tsp.user_id = u.id
        WHERE tsp.term_subject_id = $1
        ORDER BY tsp.created_at
    `;
    const result = await client.query(sql, [termSubjectId]);
    return result.rows;
}

/**
 * Count term subjects by term ID
 */
export async function countTermSubjects(client, termId) {
    const sql = 'SELECT COUNT(*) FROM term_subjects WHERE term_id = $1';
    const result = await client.query(sql, [termId]);
    return parseInt(result.rows[0].count, 10);
}

/**
 * Bulk insert term subjects
 * Insert multiple subjects to a term in one transaction
 */
export async function bulkInsertTermSubjects(client, termId, subjectIds, userId) {
    console.log('[bulkInsertTermSubjects] Called with:', { termId, subjectIds, userId });
    
    if (!subjectIds || subjectIds.length === 0) {
        console.log('[bulkInsertTermSubjects] No subjects to insert, returning empty array');
        return [];
    }

    // Build VALUES clause for bulk insert
    const valuesClauses = [];
    const values = [];
    let paramCount = 1;

    for (const subjectId of subjectIds) {
        valuesClauses.push(
            `($${paramCount}, $${paramCount + 1}, $${paramCount + 2})`
        );
        values.push(termId, subjectId, userId);
        paramCount += 3;
    }
    
    console.log('[bulkInsertTermSubjects] VALUES clauses:', valuesClauses.length);
    console.log('[bulkInsertTermSubjects] Values array:', values);

    const sql = `
        INSERT INTO term_subjects (
            term_id,
            subject_id,
            is_active,
            outline_status,
            outline_approved,
            workload_status,
            report_status,
            report_approved,
            created_at,
            created_by
        ) 
        SELECT 
            vals.term_id::integer,
            vals.subject_id::integer,
            true,
            false,
            'pending',
            false,
            false,
            'pending',
            NOW(),
            vals.created_by::integer
        FROM (VALUES ${valuesClauses.join(', ')}) AS vals(term_id, subject_id, created_by)
        WHERE NOT EXISTS (
            SELECT 1 FROM term_subjects ts
            WHERE ts.term_id = vals.term_id::integer AND ts.subject_id = vals.subject_id::integer
        )
        RETURNING *
    `;

    console.log('[bulkInsertTermSubjects] Executing SQL:', sql);
    console.log('[bulkInsertTermSubjects] With values:', values);

    const result = await client.query(sql, values);
    console.log('[bulkInsertTermSubjects] Inserted rows:', result.rows.length);
    console.log('[bulkInsertTermSubjects] Result:', result.rows);
    
    return result.rows;
}

/**
 * Delete all term subjects by term ID
 * Used when updating term subjects
 */
export async function deleteTermSubjectsByTermId(client, termId) {
    const sql = 'DELETE FROM term_subjects WHERE term_id = $1 RETURNING id';
    const result = await client.query(sql, [termId]);
    return result.rows;
}

/**
 * Replace term subjects (delete old and insert new)
 * Used when updating term's subject list
 */
export async function replaceTermSubjects(client, termId, subjectIds, userId) {
    console.log('[replaceTermSubjects] Called with:', { termId, subjectIds, userId });
    
    // Delete existing term subjects
    const deleted = await deleteTermSubjectsByTermId(client, termId);
    console.log('[replaceTermSubjects] Deleted existing subjects:', deleted.length);

    // Insert new subjects
    if (subjectIds && subjectIds.length > 0) {
        const inserted = await bulkInsertTermSubjects(client, termId, subjectIds, userId);
        console.log('[replaceTermSubjects] Inserted new subjects:', inserted.length);
        return inserted;
    }

    console.log('[replaceTermSubjects] No subjects to insert, returning empty array');
    return [];
}

/**
 * ดึงข้อมูลรายวิชาในเทอมพร้อมสถานะต่างๆ และอาจารย์ผู้สอน
 * ใช้สำหรับหน้า "สถานะรายวิชา"
 * @param {Object} client - Database client
 * @param {number} termId - Term ID
 * @returns {Promise<Array>} รายการรายวิชาพร้อมข้อมูลสถานะครบถ้วน
 */
export async function findTermSubjectsWithStatus(client, termId) {
    const sql = `
        SELECT 
            ts.id,
            ts.term_id,
            ts.subject_id,
            ts.is_active,
            ts.outline_status,
            ts.outline_approved,
            ts.workload_status,
            ts.report_status,
            ts.report_approved,
            
            -- ข้อมูลวิชา
            s.code_th,
            s.code_eng,
            s.name_th,
            s.name_eng,
            s.credit,
            s.program_id,
            
            -- ข้อมูลหลักสูตร
            p.program_year,
            
            -- รายชื่ออาจารย์ผู้สอน (รวมเป็น array)
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'user_id', tsp.user_id,
                        'email', u.email,
                        'first_name_th', u.first_name_th,
                        'last_name_th', u.last_name_th,
                        'first_name_en', u.first_name_en,
                        'last_name_en', u.last_name_en
                    ) ORDER BY tsp.user_id
                ) FILTER (WHERE tsp.user_id IS NOT NULL),
                '[]'
            ) as professors,
            
            -- นับจำนวนเอกสารแต่ละประเภท
            COUNT(DISTINCT CASE WHEN dt.type_name = 'outline' THEN df.id END) as outline_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'workload' THEN df.id END) as workload_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'report' THEN df.id END) as report_file_count
            
        FROM term_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN term_subjects_professor tsp ON ts.id = tsp.term_subject_id
        LEFT JOIN users u ON tsp.user_id = u.id
        LEFT JOIN document_files df ON ts.id = df.term_subject_id
        LEFT JOIN document_types dt ON df.document_type_id = dt.id
        
        WHERE ts.term_id = $1
        
        GROUP BY 
            ts.id, ts.term_id, ts.subject_id, ts.is_active,
            ts.outline_status, ts.outline_approved,
            ts.workload_status, ts.report_status, ts.report_approved,
            s.code_th, s.code_eng, s.name_th, s.name_eng, s.credit, s.program_id,
            p.program_year
            
        ORDER BY s.code_eng, s.code_th
    `;

    const result = await client.query(sql, [termId]);
    return result.rows;
}

/**
 * ดึงข้อมูลรายวิชาที่อาจารย์คนนั้นสอนในเทอมนั้น
 * ใช้สำหรับ Professor role ที่ดูเฉพาะวิชาที่ตัวเองสอน
 * @param {Object} client - Database client
 * @param {number} termId - Term ID
 * @param {number} userId - User ID ของอาจารย์
 * @returns {Promise<Array>} รายการรายวิชาที่อาจารย์สอน
 */
export async function findTermSubjectsByProfessor(client, termId, userId) {
    const sql = `
        SELECT 
            ts.id,
            ts.term_id,
            ts.subject_id,
            ts.is_active,
            ts.outline_status,
            ts.outline_approved,
            ts.workload_status,
            ts.report_status,
            ts.report_approved,
            
            -- ข้อมูลวิชา
            s.code_th,
            s.code_eng,
            s.name_th,
            s.name_eng,
            s.credit,
            s.program_id,
            
            -- ข้อมูลหลักสูตร
            p.program_year,
            
            -- รายชื่ออาจารย์ผู้สอน (รวมเป็น array)
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'user_id', tsp.user_id,
                        'email', u.email,
                        'first_name_th', u.first_name_th,
                        'last_name_th', u.last_name_th,
                        'first_name_en', u.first_name_en,
                        'last_name_en', u.last_name_en
                    ) ORDER BY tsp.user_id
                ) FILTER (WHERE tsp.user_id IS NOT NULL),
                '[]'
            ) as professors,
            
            -- นับจำนวนเอกสารแต่ละประเภท
            COUNT(DISTINCT CASE WHEN dt.type_name = 'outline' THEN df.id END) as outline_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'workload' THEN df.id END) as workload_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'report' THEN df.id END) as report_file_count
            
        FROM term_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN term_subjects_professor tsp ON ts.id = tsp.term_subject_id
        LEFT JOIN users u ON tsp.user_id = u.id
        LEFT JOIN document_files df ON ts.id = df.term_subject_id
        LEFT JOIN document_types dt ON df.document_type_id = dt.id
        
        WHERE ts.term_id = $1
          AND EXISTS (
              SELECT 1 FROM term_subjects_professor tsp2
              WHERE tsp2.term_subject_id = ts.id
              AND tsp2.user_id = $2
          )
        
        GROUP BY 
            ts.id, ts.term_id, ts.subject_id, ts.is_active,
            ts.outline_status, ts.outline_approved,
            ts.workload_status, ts.report_status, ts.report_approved,
            s.code_th, s.code_eng, s.name_th, s.name_eng, s.credit, s.program_id,
            p.program_year
            
        ORDER BY s.code_eng, s.code_th
    `;

    const result = await client.query(sql, [termId, userId]);
    return result.rows;
}

/**
 * ดึงข้อมูลรายวิชาในเทอมที่ active อยู่
 * ใช้สำหรับ tab "สถานะรายวิชา" ที่แสดงเฉพาะ active term
 * @param {Object} client - Database client
 * @param {number} userId - User ID (optional, สำหรับ Professor)
 * @param {boolean} isProfessor - true ถ้า user เป็น Professor
 * @returns {Promise<Array>} รายการรายวิชาใน active term
 */
export async function findActiveTermSubjectsWithStatus(client, userId = null, isProfessor = false) {
    // ถ้าเป็น Professor ต้องกรองเฉพาะวิชาที่สอน
    const professorFilter = isProfessor 
        ? `AND EXISTS (
              SELECT 1 FROM term_subjects_professor tsp2
              WHERE tsp2.term_subject_id = ts.id
              AND tsp2.user_id = $1
          )`
        : '';

    const sql = `
        SELECT 
            ts.id,
            ts.term_id,
            ts.subject_id,
            ts.is_active,
            ts.outline_status,
            ts.outline_approved,
            ts.workload_status,
            ts.report_status,
            ts.report_approved,
            
            -- ข้อมูลเทอม
            t.academic_year,
            t.academic_sector,
            
            -- ข้อมูลวิชา
            s.code_th,
            s.code_eng,
            s.name_th,
            s.name_eng,
            s.credit,
            s.program_id,
            
            -- ข้อมูลหลักสูตร
            p.program_year,
            
            -- รายชื่ออาจารย์ผู้สอน (รวมเป็น array)
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'user_id', tsp.user_id,
                        'email', u.email,
                        'first_name_th', u.first_name_th,
                        'last_name_th', u.last_name_th,
                        'first_name_en', u.first_name_en,
                        'last_name_en', u.last_name_en
                    ) ORDER BY tsp.user_id
                ) FILTER (WHERE tsp.user_id IS NOT NULL),
                '[]'
            ) as professors,
            
            -- นับจำนวนเอกสารแต่ละประเภท
            COUNT(DISTINCT CASE WHEN dt.type_name = 'outline' THEN df.id END) as outline_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'workload' THEN df.id END) as workload_file_count,
            COUNT(DISTINCT CASE WHEN dt.type_name = 'report' THEN df.id END) as report_file_count
            
        FROM terms t
        JOIN term_subjects ts ON t.id = ts.term_id
        JOIN subjects s ON ts.subject_id = s.id
        LEFT JOIN programs p ON s.program_id = p.id
        LEFT JOIN term_subjects_professor tsp ON ts.id = tsp.term_subject_id
        LEFT JOIN users u ON tsp.user_id = u.id
        LEFT JOIN document_files df ON ts.id = df.term_subject_id
        LEFT JOIN document_types dt ON df.document_type_id = dt.id
        
        WHERE t.is_active = true
        ${professorFilter}
        
        GROUP BY 
            ts.id, ts.term_id, ts.subject_id, ts.is_active,
            ts.outline_status, ts.outline_approved,
            ts.workload_status, ts.report_status, ts.report_approved,
            t.academic_year, t.academic_sector,
            s.code_th, s.code_eng, s.name_th, s.name_eng, s.credit, s.program_id,
            p.program_year
            
        ORDER BY s.code_eng, s.code_th
    `;

    const params = isProfessor && userId ? [userId] : [];
    const result = await client.query(sql, params);
    return result.rows;
}
