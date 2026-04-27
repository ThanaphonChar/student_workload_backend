import { jest } from '@jest/globals';
import * as repo from '../../repositories/submission.repository.js';

const mockClient = { query: jest.fn() };

beforeEach(() => mockClient.query.mockReset());

// ---------------------------------------------------------------------------
// getMySubjectsWithStatus
// ---------------------------------------------------------------------------
describe('getMySubjectsWithStatus', () => {
    const baseRow = (overrides = {}) => ({
        term_subject_id: 1,
        subject_code: 'CS101',
        subject_name: 'Intro CS',
        program_id: 2,
        term_start_date: '2024-01-01',
        term_end_date: '2024-05-01',
        outline: null,
        report: null,
        ...overrides,
    });

    test('returns normalized rows with outline/report as objects', async () => {
        const outlineObj = { status: 'approved', round_number: 1, submission_id: 10, submitted_at: '2024-01-10T00:00:00Z' };
        mockClient.query.mockResolvedValueOnce({ rows: [baseRow({ outline: outlineObj })] });

        const result = await repo.getMySubjectsWithStatus(mockClient, 1, 5);

        expect(result).toHaveLength(1);
        expect(result[0].outline).toEqual({
            status: 'approved',
            round_number: 1,
            submission_id: 10,
            submitted_at: '2024-01-10T00:00:00Z',
        });
        expect(result[0].report).toBeNull();
    });

    test('returns empty array when query returns no rows', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });
        const result = await repo.getMySubjectsWithStatus(mockClient, 1, 5);
        expect(result).toEqual([]);
    });

    test('normalizeSubmission returns null when submission is null', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [baseRow({ outline: null, report: null })] });
        const result = await repo.getMySubjectsWithStatus(mockClient, 1, 5);
        expect(result[0].outline).toBeNull();
        expect(result[0].report).toBeNull();
    });

    test('normalizeSubmission parses JSON string correctly', async () => {
        const submissionJson = JSON.stringify({
            status: 'pending',
            round_number: 2,
            submission_id: 99,
            submitted_at: '2024-02-01T00:00:00Z',
        });
        mockClient.query.mockResolvedValueOnce({ rows: [baseRow({ outline: submissionJson })] });

        const result = await repo.getMySubjectsWithStatus(mockClient, 1, 5);

        expect(result[0].outline).toEqual({
            status: 'pending',
            round_number: 2,
            submission_id: 99,
            submitted_at: '2024-02-01T00:00:00Z',
        });
    });

    test('normalizeSubmission handles object input directly', async () => {
        const submissionObj = { status: 'rejected', round_number: 3, submission_id: 77, submitted_at: '2024-03-01T00:00:00Z' };
        mockClient.query.mockResolvedValueOnce({ rows: [baseRow({ outline: submissionObj })] });

        const result = await repo.getMySubjectsWithStatus(mockClient, 1, 5);

        expect(result[0].outline.status).toBe('rejected');
        expect(result[0].outline.round_number).toBe(3);
        expect(result[0].outline.submission_id).toBe(77);
    });
});

// ---------------------------------------------------------------------------
// getNextRoundNumber
// ---------------------------------------------------------------------------
describe('getNextRoundNumber', () => {
    test('returns 1 when no existing submissions (COALESCE returns 0+1)', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [{ next_round_number: '1' }] });
        const result = await repo.getNextRoundNumber(mockClient, 1, 'outline');
        expect(result).toBe(1);
    });

    test('returns 3 when MAX is 2', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [{ next_round_number: '3' }] });
        const result = await repo.getNextRoundNumber(mockClient, 1, 'outline');
        expect(result).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// userExists
// ---------------------------------------------------------------------------
describe('userExists', () => {
    test('returns true when rowCount > 0', async () => {
        mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
        const result = await repo.userExists(mockClient, 42);
        expect(result).toBe(true);
    });

    test('returns false when rowCount is 0', async () => {
        mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
        const result = await repo.userExists(mockClient, 99);
        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// createSubmission
// ---------------------------------------------------------------------------
describe('createSubmission', () => {
    const submissionData = {
        termSubjectId: 1,
        documentType: 'outline',
        fileUrl: 'https://example.com/file.pdf',
        originalName: 'file.pdf',
        submittedBy: 5,
    };

    const createdRow = {
        id: 10,
        term_subject_id: 1,
        document_type: 'outline',
        file_url: 'https://example.com/file.pdf',
        original_name: 'file.pdf',
        round_number: 2,
        status: 'pending',
        submitted_at: '2024-01-01T00:00:00Z',
        submitted_by: 5,
    };

    test('calls getNextRoundNumber first, then INSERT', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ next_round_number: '2' }] })
            .mockResolvedValueOnce({ rows: [createdRow] });

        const result = await repo.createSubmission(mockClient, submissionData);

        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(result).toEqual(createdRow);
    });

    test('returns the created row from RETURNING clause', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ next_round_number: '1' }] })
            .mockResolvedValueOnce({ rows: [createdRow] });

        const result = await repo.createSubmission(mockClient, submissionData);
        expect(result).toEqual(createdRow);
    });

    test('round_number in INSERT uses value from getNextRoundNumber', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ next_round_number: '3' }] })
            .mockResolvedValueOnce({ rows: [{ ...createdRow, round_number: 3 }] });

        await repo.createSubmission(mockClient, submissionData);

        // INSERT call is the 2nd call; values = [termSubjectId, documentType, fileUrl, originalName, roundNumber, submittedBy]
        const insertValues = mockClient.query.mock.calls[1][1];
        expect(insertValues[4]).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// reviewSubmission
// ---------------------------------------------------------------------------
describe('reviewSubmission', () => {
    const reviewArgs = { action: 'approved', note: 'Looks good', reason: null, reviewerId: 2 };
    const submissionRow = { id: 1, term_subject_id: 10, document_type: 'outline', status: 'approved' };
    const reviewRow = { id: 50, submission_id: 1, reviewer_id: 2, action: 'approved', note: 'Looks good', reason: null, reviewed_at: '2024-01-02T00:00:00Z' };

    test('calls UPDATE then INSERT', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [submissionRow] })
            .mockResolvedValueOnce({ rows: [reviewRow] });

        await repo.reviewSubmission(mockClient, 1, reviewArgs);

        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(mockClient.query.mock.calls[0][0]).toMatch(/UPDATE document_submissions/i);
        expect(mockClient.query.mock.calls[1][0]).toMatch(/INSERT INTO submission_reviews/i);
    });

    test('returns { submission, review } on success', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [submissionRow] })
            .mockResolvedValueOnce({ rows: [reviewRow] });

        const result = await repo.reviewSubmission(mockClient, 1, reviewArgs);

        expect(result).toEqual({ submission: submissionRow, review: reviewRow });
    });

    test('returns null when UPDATE returns no rows (submission not found)', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await repo.reviewSubmission(mockClient, 999, reviewArgs);

        expect(result).toBeNull();
        expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('passes note and reason as null when not provided', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [submissionRow] })
            .mockResolvedValueOnce({ rows: [reviewRow] });

        await repo.reviewSubmission(mockClient, 1, {
            action: 'approved',
            note: undefined,
            reason: undefined,
            reviewerId: 2,
        });

        // INSERT values: [submissionId, reviewerId, action, note||null, reason||null]
        const insertValues = mockClient.query.mock.calls[1][1];
        expect(insertValues[3]).toBeNull();
        expect(insertValues[4]).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// updateTermSubjectApproval
// ---------------------------------------------------------------------------
describe('updateTermSubjectApproval', () => {
    test('calls correct SQL for outline documentType', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, outline_approved: 'approved' }] });

        const result = await repo.updateTermSubjectApproval(mockClient, 1, 'outline', 'approved');

        expect(result).toEqual({ id: 1, outline_approved: 'approved' });
        expect(mockClient.query.mock.calls[0][0]).toContain('outline_approved');
    });

    test('calls correct SQL for report documentType', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, report_approved: 'rejected' }] });

        const result = await repo.updateTermSubjectApproval(mockClient, 1, 'report', 'rejected');

        expect(result).toEqual({ id: 1, report_approved: 'rejected' });
        expect(mockClient.query.mock.calls[0][0]).toContain('report_approved');
    });

    test('returns null for unknown documentType', async () => {
        const result = await repo.updateTermSubjectApproval(mockClient, 1, 'unknown', 'approved');

        expect(result).toBeNull();
        expect(mockClient.query).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// markTermSubjectSubmissionPending
// ---------------------------------------------------------------------------
describe('markTermSubjectSubmissionPending', () => {
    test('sets outline_status=true and outline_approved=pending for outline', async () => {
        mockClient.query.mockResolvedValueOnce({
            rows: [{ id: 1, outline_status: true, outline_approved: 'pending' }],
        });

        const result = await repo.markTermSubjectSubmissionPending(mockClient, 1, 'outline');

        expect(result).toEqual({ id: 1, outline_status: true, outline_approved: 'pending' });
        const sql = mockClient.query.mock.calls[0][0];
        expect(sql).toContain('outline_status');
        expect(sql).toContain('outline_approved');
    });

    test('sets report_status=true and report_approved=pending for report', async () => {
        mockClient.query.mockResolvedValueOnce({
            rows: [{ id: 1, report_status: true, report_approved: 'pending' }],
        });

        const result = await repo.markTermSubjectSubmissionPending(mockClient, 1, 'report');

        expect(result).toEqual({ id: 1, report_status: true, report_approved: 'pending' });
        const sql = mockClient.query.mock.calls[0][0];
        expect(sql).toContain('report_status');
        expect(sql).toContain('report_approved');
    });

    test('returns null for unknown documentType', async () => {
        const result = await repo.markTermSubjectSubmissionPending(mockClient, 1, 'unknown');

        expect(result).toBeNull();
        expect(mockClient.query).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// getSubmissionHistory
// ---------------------------------------------------------------------------
describe('getSubmissionHistory', () => {
    const makeRow = (overrides = {}) => ({
        round_number: 1,
        submission_id: 10,
        event_type: 'submitted',
        event_time: '2024-01-01T00:00:00Z',
        file_url: 'https://example.com/file.pdf',
        original_name: 'file.pdf',
        status: 'pending',
        action: null,
        note: null,
        reason: null,
        reviewer_name: null,
        actor_name: 'อาจารย์สมชาย',
        ...overrides,
    });

    test('returns rows mapped to correct shape', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [makeRow()] });

        const result = await repo.getSubmissionHistory(mockClient, 1, 'outline');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            round_number: 1,
            submission_id: 10,
            event_type: 'submitted',
            file_url: 'https://example.com/file.pdf',
            status: 'pending',
            actor_name: 'อาจารย์สมชาย',
        });
    });

    test('action, note, reason default to null when empty string', async () => {
        mockClient.query.mockResolvedValueOnce({
            rows: [makeRow({ action: '', note: '', reason: '', reviewer_name: '', actor_name: '' })],
        });

        const result = await repo.getSubmissionHistory(mockClient, 1, 'outline');

        expect(result[0].action).toBeNull();
        expect(result[0].note).toBeNull();
        expect(result[0].reason).toBeNull();
        expect(result[0].reviewer_name).toBeNull();
        expect(result[0].actor_name).toBeNull();
    });

    test('rows are returned in order from query', async () => {
        mockClient.query.mockResolvedValueOnce({
            rows: [
                makeRow({ round_number: 1, event_type: 'submitted' }),
                makeRow({ round_number: 1, event_type: 'reviewed', action: 'approved', reviewer_name: 'เจ้าหน้าที่', actor_name: null }),
            ],
        });

        const result = await repo.getSubmissionHistory(mockClient, 1, 'outline');

        expect(result[0].event_type).toBe('submitted');
        expect(result[1].event_type).toBe('reviewed');
    });
});
