/**
 * Academic Term Repository
 * Pure SQL operations - no business logic, no validation
 * Uses existing 'terms' table with created_by/updated_by tracking
 */

import { pool } from '../config/db.js';

/**
 * Insert new academic term
 */
export async function insertTerm(client, termData, userId) {
    const sql = `
        INSERT INTO terms (
            academic_year,
            academic_sector,
            term_start_date,
            term_end_date,
            midterm_start_date,
            midterm_end_date,
            final_start_date,
            final_end_date,
            created_at,
            created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        RETURNING *
    `;

    const values = [
        termData.academic_year,
        termData.academic_sector,
        termData.term_start_date,
        termData.term_end_date,
        termData.midterm_start_date || null,
        termData.midterm_end_date || null,
        termData.final_start_date || null,
        termData.final_end_date || null,
        userId
    ];

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * Find all terms with optional filters
 */
export async function findAllTerms(filters = {}) {
    let sql = `
        SELECT * FROM terms
        WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    // Filter by academic year
    if (filters.academic_year) {
        sql += ` AND academic_year = $${paramCount}`;
        values.push(filters.academic_year);
        paramCount++;
    }

    // Filter by academic sector
    if (filters.academic_sector) {
        sql += ` AND academic_sector = $${paramCount}`;
        values.push(filters.academic_sector);
        paramCount++;
    }

    // Add ordering
    sql += ' ORDER BY academic_year DESC, academic_sector DESC';

    const result = await pool.query(sql, values);
    return result.rows;
}

/**
 * Find term by ID
 */
export async function findTermById(client, termId) {
    const sql = 'SELECT * FROM terms WHERE id = $1';
    const result = await client.query(sql, [termId]);
    return result.rows[0];
}

/**
 * Update academic term
 */
export async function updateTerm(client, termId, updateData, userId) {
    const sql = `
        UPDATE terms
        SET
            academic_year = $1,
            academic_sector = $2,
            term_start_date = $3,
            term_end_date = $4,
            midterm_start_date = $5,
            midterm_end_date = $6,
            final_start_date = $7,
            final_end_date = $8,
            updated_at = NOW(),
            updated_by = $9
        WHERE id = $10
        RETURNING *
    `;

    const values = [
        updateData.academic_year,
        updateData.academic_sector,
        updateData.term_start_date,
        updateData.term_end_date,
        updateData.midterm_start_date || null,
        updateData.midterm_end_date || null,
        updateData.final_start_date || null,
        updateData.final_end_date || null,
        userId,
        termId
    ];

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * Delete academic term
 */
export async function deleteTerm(client, termId) {
    const sql = 'DELETE FROM terms WHERE id = $1 RETURNING *';
    const result = await client.query(sql, [termId]);
    return result.rows[0];
}

/**
 * Find term by academic year and sector
 */
export async function findTermByYearAndSector(client, academicYear, academicSector) {
    const sql = `
        SELECT * FROM terms
        WHERE academic_year = $1 AND academic_sector = $2
    `;
    const result = await client.query(sql, [academicYear, academicSector]);
    return result.rows[0];
}

/**
 * Find terms by filters (for service layer)
 */
export async function findTermsByFilters(client, filters) {
    let sql = 'SELECT * FROM terms WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.academic_year) {
        sql += ` AND academic_year = $${paramCount}`;
        values.push(filters.academic_year);
        paramCount++;
    }

    if (filters.academic_sector) {
        sql += ` AND academic_sector = $${paramCount}`;
        values.push(filters.academic_sector);
        paramCount++;
    }

    sql += ' ORDER BY academic_year DESC, academic_sector DESC';

    const result = await client.query(sql, values);
    return result.rows;
}

/**
 * Count total terms
 */
export async function countTerms(client) {
    const sql = 'SELECT COUNT(*) FROM terms';
    const result = await client.query(sql);
    return parseInt(result.rows[0].count, 10);
}

/**
 * Find term with statistics (subject count)
 */
export async function findTermWithStats(termId) {
    const sql = `
        SELECT 
            t.*,
            COALESCE(COUNT(ts.id), 0) as subject_count
        FROM terms t
        LEFT JOIN term_subjects ts ON t.id = ts.term_id
        WHERE t.id = $1
        GROUP BY t.id
    `;
    const result = await pool.query(sql, [termId]);
    return result.rows[0];
}

/**
 * Find active (ongoing) terms
 */
export async function findActiveTerms() {
    const sql = `
        SELECT 
            t.*,
            COALESCE(COUNT(ts.id), 0) as subject_count
        FROM terms t
        LEFT JOIN term_subjects ts ON t.id = ts.term_id
        WHERE t.term_end_date >= CURRENT_DATE
        GROUP BY t.id
        ORDER BY t.academic_year DESC, t.academic_sector DESC
    `;
    const result = await pool.query(sql);
    return result.rows;
}

/**
 * Find ended terms
 */
export async function findEndedTerms() {
    const sql = `
        SELECT 
            t.*,
            COALESCE(COUNT(ts.id), 0) as subject_count
        FROM terms t
        LEFT JOIN term_subjects ts ON t.id = ts.term_id
        WHERE t.term_end_date < CURRENT_DATE
        GROUP BY t.id
        ORDER BY t.academic_year DESC, t.academic_sector DESC
    `;
    const result = await pool.query(sql);
    return result.rows;
}
