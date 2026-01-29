/**
 * Term Subject Service
 * Business logic for term subjects and professor assignments
 * Uses existing 'term_subjects' and 'term_subjects_professor' tables
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
