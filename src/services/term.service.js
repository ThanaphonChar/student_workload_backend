/**
 * Academic Term Service
 * Business logic and orchestration layer
 * Handles validation, status computation, and transactions
 */

import { pool } from '../config/db.js';
import * as termRepo from '../repositories/term.repository.js';
import * as termSubjectRepo from '../repositories/termSubject.repository.js';
import {
    validateTermData,
    normalizeTermData,
    computeTermStatus,
    ValidationError,
    BusinessError,
} from '../utils/termValidation.js';

/**
 * Create new academic term
 * @param {Object} termData - Term data from request
 * @param {Number} userId - ID of user creating the term
 * @returns {Promise<Object>} Created term with computed status
 */
export async function createTerm(termData, userId) {
    // Step 1: Validate and normalize data
    const normalized = normalizeTermData(termData);
    validateTermData(normalized);

    // Extract subject_ids if provided
    const subjectIds = termData.subject_ids || [];
    console.log('[createTerm Service] Extracted subject_ids:', subjectIds);
    console.log('[createTerm Service] Is array?', Array.isArray(subjectIds));
    console.log('[createTerm Service] Length:', subjectIds.length);

    // Step 2: Check for duplicate term
    const client = await pool.connect();
    try {
        const existing = await termRepo.findTermByYearAndSector(
            client,
            normalized.academic_year,
            normalized.academic_sector
        );

        if (existing) {
            throw new BusinessError(
                `Academic term ${normalized.academic_year}/${normalized.academic_sector} already exists`,
                'DUPLICATE_TERM',
                409
            );
        }

        // Step 3: Insert term and subjects within transaction
        await client.query('BEGIN');

        const term = await termRepo.insertTerm(client, normalized, userId);
        console.log('[createTerm Service] Term created with ID:', term.id);

        // Step 4: Add subjects if provided
        if (subjectIds.length > 0) {
            console.log('[createTerm Service] Calling bulkInsertTermSubjects with:', { termId: term.id, subjectIds, userId });
            const inserted = await termSubjectRepo.bulkInsertTermSubjects(client, term.id, subjectIds, userId);
            console.log('[createTerm Service] Inserted term_subjects:', inserted.length);
        } else {
            console.log('[createTerm Service] No subjects to insert');
        }

        await client.query('COMMIT');
        console.log('[createTerm Service] Transaction committed successfully');

        // Step 5: Add computed status before returning
        return enrichTermWithStatus(term);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all terms with optional filters
 * @param {Object} filters - Filter criteria (academic_year, academic_sector, status)
 * @returns {Promise<Array>} List of terms with computed status
 */
export async function getAllTerms(filters = {}) {
    const terms = await termRepo.findAllTerms(filters);
    
    // Add computed status to each term
    return terms.map(enrichTermWithStatus);
}

/**
 * Get term by ID
 * @param {number} termId - Term ID
 * @returns {Promise<Object>} Term with computed status and stats
 */
export async function getTermById(termId) {
    const term = await termRepo.findTermWithStats(termId);

    if (!term) {
        throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
    }

    return enrichTermWithStatus(term);
}

/**
 * Update term
 * @param {number} termId - Term ID
 * @param {Object} termData - Updated term data
 * @param {Number} userId - ID of user updating the term
 * @returns {Promise<Object>} Updated term with computed status
 */
export async function updateTerm(termId, termData, userId) {
    const client = await pool.connect();
    try {
        // Step 1: Check if term exists
        const existing = await termRepo.findTermById(client, termId);
        if (!existing) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        // Step 2: Validate and normalize data
        const normalized = normalizeTermData(termData);
        validateTermData(normalized);

        // Extract subject_ids if provided
        const subjectIds = termData.subject_ids;
        console.log('[updateTerm Service] Term ID:', termId);
        console.log('[updateTerm Service] Extracted subject_ids:', subjectIds);
        console.log('[updateTerm Service] Is array?', Array.isArray(subjectIds));
        if (subjectIds) {
            console.log('[updateTerm Service] Length:', subjectIds.length);
        }

        // Step 3: Check for duplicate if year/sector changed
        if (
            normalized.academic_year !== existing.academic_year ||
            normalized.academic_sector !== existing.academic_sector
        ) {
            const duplicate = await termRepo.findTermByYearAndSector(
                client,
                normalized.academic_year,
                normalized.academic_sector
            );

            if (duplicate && duplicate.id !== termId) {
                throw new BusinessError(
                    `Academic term ${normalized.academic_year}/${normalized.academic_sector} already exists`,
                    'DUPLICATE_TERM',
                    409
                );
            }
        }

        // Step 4: Update term and subjects within transaction
        await client.query('BEGIN');

        const updated = await termRepo.updateTerm(client, termId, normalized, userId);
        console.log('[updateTerm Service] Term updated');

        // Step 5: Update subjects if provided
        if (subjectIds !== undefined) {
            console.log('[updateTerm Service] Calling replaceTermSubjects with:', { termId, subjectIds, userId });
            const replaced = await termSubjectRepo.replaceTermSubjects(client, termId, subjectIds, userId);
            console.log('[updateTerm Service] Replaced term_subjects:', replaced.length);
        } else {
            console.log('[updateTerm Service] subject_ids is undefined, not updating subjects');
        }

        await client.query('COMMIT');
        console.log('[updateTerm Service] Transaction committed successfully');

        return enrichTermWithStatus(updated);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Delete term
 * @param {number} termId - Term ID
 * @returns {Promise<void>}
 */
export async function deleteTerm(termId) {
    const client = await pool.connect();
    try {
        // Step 1: Check if term exists
        const existing = await termRepo.findTermById(client, termId);
        if (!existing) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        // Step 2: Delete term within transaction
        await client.query('BEGIN');

        await termRepo.deleteTerm(client, termId);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get active terms (ongoing)
 * @returns {Promise<Array>} List of active terms
 */
export async function getActiveTerms() {
    const terms = await termRepo.findActiveTerms();
    return terms.map(enrichTermWithStatus);
}

/**
 * Get ended terms
 * @returns {Promise<Array>} List of ended terms
 */
export async function getEndedTerms() {
    const terms = await termRepo.findEndedTerms();
    return terms.map(enrichTermWithStatus);
}

/**
 * Get all subjects in a term
 * @param {number} termId - Term ID
 * @returns {Promise<Array>} List of subjects in the term
 */
export async function getTermSubjects(termId) {
    const client = await pool.connect();
    try {
        // Check if term exists
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
 * Update subjects in a term (replace all)
 * @param {number} termId - Term ID
 * @param {Array<number>} subjectIds - Array of subject IDs
 * @param {number} userId - ID of user updating
 * @returns {Promise<Array>} Updated list of subjects
 */
export async function updateTermSubjects(termId, subjectIds, userId) {
    const client = await pool.connect();
    try {
        // Check if term exists
        const term = await termRepo.findTermById(client, termId);
        if (!term) {
            throw new BusinessError('Term not found', 'TERM_NOT_FOUND', 404);
        }

        await client.query('BEGIN');

        // Replace all subjects
        await termSubjectRepo.replaceTermSubjects(client, termId, subjectIds, userId);

        await client.query('COMMIT');

        // Return updated list
        return await termSubjectRepo.findTermSubjectsByTermId(client, termId);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Helper: Add computed status to term object
 * Does NOT mutate original object
 */
function enrichTermWithStatus(term) {
    return {
        ...term,
        status: computeTermStatus(term.term_end_date),
        term_name: `${term.academic_sector}/${term.academic_year}`,
        // Convert count to number if exists
        subject_count: term.subject_count ? parseInt(term.subject_count) : 0,
    };
}
