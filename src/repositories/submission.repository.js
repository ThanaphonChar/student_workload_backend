/**
 * Submission Repository
 * Data access layer for submission workflow
 */

/**
 * ดึงรายวิชาของ instructor พร้อมสถานะล่าสุดของ outline/report
 */
export async function getMySubjectsWithStatus(client, termId, instructorId) {
    const sql = `
        SELECT
            ts.id AS term_subject_id,
            COALESCE(s.code_eng, s.code_th) AS subject_code,
            COALESCE(s.name_th, s.name_eng) AS subject_name,
            s.program_id,
            outline_latest.submission AS outline,
            report_latest.submission AS report
        FROM term_subjects ts
        INNER JOIN term_subjects_professor tsp ON tsp.term_subject_id = ts.id
        INNER JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN LATERAL (
            SELECT json_build_object(
                'status', ds.status,
                'round_number', ds.round_number,
                'submission_id', ds.id,
                'submitted_at', ds.submitted_at
            ) AS submission
            FROM document_submissions ds
            WHERE ds.term_subject_id = ts.id
              AND ds.document_type = 'outline'
            ORDER BY ds.round_number DESC, ds.submitted_at DESC
            LIMIT 1
        ) outline_latest ON TRUE
        LEFT JOIN LATERAL (
            SELECT json_build_object(
                'status', ds.status,
                'round_number', ds.round_number,
                'submission_id', ds.id,
                'submitted_at', ds.submitted_at
            ) AS submission
            FROM document_submissions ds
            WHERE ds.term_subject_id = ts.id
              AND ds.document_type = 'report'
            ORDER BY ds.round_number DESC, ds.submitted_at DESC
            LIMIT 1
        ) report_latest ON TRUE
        WHERE tsp.user_id = $1
          AND ts.term_id = $2
          AND ts.is_active = true
        ORDER BY COALESCE(s.code_eng, s.code_th) ASC
    `;

    const result = await client.query(sql, [instructorId, termId]);

    const normalizeSubmission = (submission) => {
        if (!submission) return null;

        const parsed = typeof submission === 'string' ? JSON.parse(submission) : submission;

        return {
            status: parsed.status ?? null,
            round_number: parsed.round_number ?? null,
            submission_id: parsed.submission_id ?? null,
            submitted_at: parsed.submitted_at ?? null,
        };
    };

    const rows = result.rows.map((row) => ({
        term_subject_id: row.term_subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        program_id: row.program_id,
        outline: normalizeSubmission(row.outline),
        report: normalizeSubmission(row.report),
    }));

    console.log('[Submission Repository] getMySubjectsWithStatus result:', {
        termId,
        instructorId,
        count: rows.length,
        firstRow: rows[0] || null,
    });

    return rows;
}

/**
 * หาเลขรอบถัดไปของเอกสารในวิชานั้น
 */
export async function getNextRoundNumber(client, termSubjectId, documentType) {
    const sql = `
        SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round_number
        FROM document_submissions
        WHERE term_subject_id = $1
          AND document_type = $2
    `;

    const result = await client.query(sql, [termSubjectId, documentType]);
    return Number(result.rows[0].next_round_number);
}

/**
 * ตรวจสอบว่ามี user id อยู่จริงในระบบ
 */
export async function userExists(client, userId) {
    const sql = `
        SELECT 1
        FROM users
        WHERE id = $1
        LIMIT 1
    `;

    const result = await client.query(sql, [userId]);
    return result.rowCount > 0;
}

/**
 * สร้าง submission ใหม่
 */
export async function createSubmission(
    client,
    { termSubjectId, documentType, fileUrl, originalName, submittedBy }
) {
    const roundNumber = await getNextRoundNumber(client, termSubjectId, documentType);

    const sql = `
        INSERT INTO document_submissions (
            term_subject_id,
            document_type,
            file_url,
            original_name,
            round_number,
            status,
            submitted_at,
            submitted_by
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6)
        RETURNING
            id,
            term_subject_id,
            document_type,
            file_url,
            original_name,
            round_number,
            status,
            submitted_at,
            submitted_by
    `;

    const values = [termSubjectId, documentType, fileUrl, originalName, roundNumber, submittedBy];
    const result = await client.query(sql, values);

    return result.rows[0];
}

/**
 * รีวิว submission (update status + insert review)
 */
export async function reviewSubmission(
    client,
    submissionId,
    { action, note, reason, reviewerId }
) {
    const updateSql = `
        UPDATE document_submissions
        SET status = $1
        WHERE id = $2
        RETURNING id, term_subject_id, document_type, status
    `;

    const updateResult = await client.query(updateSql, [action, submissionId]);
    const submission = updateResult.rows[0] || null;

    if (!submission) {
        return null;
    }

    const reviewSql = `
        INSERT INTO submission_reviews (
            submission_id,
            reviewer_id,
            action,
            note,
            reason,
            reviewed_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, submission_id, reviewer_id, action, note, reason, reviewed_at
    `;

    const reviewResult = await client.query(reviewSql, [
        submissionId,
        reviewerId,
        action,
        note || null,
        reason || null,
    ]);

    return {
        submission,
        review: reviewResult.rows[0],
    };
}

/**
 * update approval field ใน term_subjects ตาม document type
 */
export async function updateTermSubjectApproval(client, termSubjectId, documentType, action) {
    if (documentType === 'outline') {
        const sql = `
            UPDATE term_subjects
            SET outline_approved = $1
            WHERE id = $2
            RETURNING id, outline_approved
        `;
        const result = await client.query(sql, [action, termSubjectId]);
        return result.rows[0] || null;
    }

    if (documentType === 'report') {
        const sql = `
            UPDATE term_subjects
            SET report_approved = $1
            WHERE id = $2
            RETURNING id, report_approved
        `;
        const result = await client.query(sql, [action, termSubjectId]);
        return result.rows[0] || null;
    }

    return null;
}

/**
 * อัปเดตสถานะการส่งเอกสารรอบใหม่ให้เป็น pending
 */
export async function markTermSubjectSubmissionPending(client, termSubjectId, documentType) {
    if (documentType === 'outline') {
        const sql = `
            UPDATE term_subjects
            SET outline_status = true,
                outline_approved = 'pending'
            WHERE id = $1
            RETURNING id, outline_status, outline_approved
        `;

        const result = await client.query(sql, [termSubjectId]);
        return result.rows[0] || null;
    }

    if (documentType === 'report') {
        const sql = `
            UPDATE term_subjects
            SET report_status = true,
                report_approved = 'pending'
            WHERE id = $1
            RETURNING id, report_status, report_approved
        `;

        const result = await client.query(sql, [termSubjectId]);
        return result.rows[0] || null;
    }

    return null;
}

/**
 * ดึงประวัติ submission ตามวิชา + ประเภทเอกสาร
 */
export async function getSubmissionHistory(client, termSubjectId, documentType) {
    const sql = `
        SELECT
            ds.round_number,
            ds.id AS submission_id,
            'submitted' AS event_type,
            ds.submitted_at AS event_time,
            ds.file_url,
            ds.original_name,
            ds.status,
            NULL::text AS action,
            NULL::text AS note,
            NULL::text AS reason,
            NULL::text AS reviewer_name,
            NULL::timestamptz AS reviewed_at,
            COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(ui.first_name_th, ''), ' ', COALESCE(ui.last_name_th, ''))), ''),
                NULLIF(TRIM(CONCAT(COALESCE(ui.first_name_en, ''), ' ', COALESCE(ui.last_name_en, ''))), ''),
                ui.email,
                'อาจารย์'
            ) AS actor_name
        FROM document_submissions ds
        LEFT JOIN users ui ON ui.id = ds.submitted_by
        WHERE ds.term_subject_id = $1
          AND ds.document_type = $2

        UNION ALL

        SELECT
            ds.round_number,
            ds.id AS submission_id,
            'reviewed' AS event_type,
            sr.reviewed_at AS event_time,
            ds.file_url,
            ds.original_name,
            ds.status,
            sr.action::text AS action,
            sr.note,
            sr.reason,
            COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(ur.first_name_th, ''), ' ', COALESCE(ur.last_name_th, ''))), ''),
                NULLIF(TRIM(CONCAT(COALESCE(ur.first_name_en, ''), ' ', COALESCE(ur.last_name_en, ''))), ''),
                ur.email,
                'เจ้าหน้าที่'
            ) AS reviewer_name,
            sr.reviewed_at,
            NULL::text AS actor_name
        FROM document_submissions ds
        INNER JOIN submission_reviews sr ON sr.submission_id = ds.id
        LEFT JOIN users ur ON ur.id = sr.reviewer_id
        WHERE ds.term_subject_id = $1
          AND ds.document_type = $2

        ORDER BY event_time ASC, round_number ASC
    `;

    const result = await client.query(sql, [termSubjectId, documentType]);
    return result.rows.map((row) => ({
        round_number: row.round_number,
        submission_id: row.submission_id,
        event_type: row.event_type,
        event_time: row.event_time,
        file_url: row.file_url,
        original_name: row.original_name,
        status: row.status,
        action: row.action || null,
        note: row.note || null,
        reason: row.reason || null,
        reviewer_name: row.reviewer_name || null,
        actor_name: row.actor_name || null,
    }));
}
