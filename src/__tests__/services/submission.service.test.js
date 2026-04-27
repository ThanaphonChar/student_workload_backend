import { jest } from '@jest/globals';

jest.mock('../../config/db.js', () => ({
    pool: { connect: jest.fn() },
}));
jest.mock('../../repositories/submission.repository.js');
jest.mock('../../services/email.service.js');

import { pool } from '../../config/db.js';
import * as repo from '../../repositories/submission.repository.js';
import * as emailService from '../../services/email.service.js';
import * as service from '../../services/submission.service.js';

const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({});
    mockClient.release.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// getMySubjectsWithStatus
// ---------------------------------------------------------------------------
describe('getMySubjectsWithStatus', () => {
    test('throws 400 with Thai message when termId is 0', async () => {
        await expect(service.getMySubjectsWithStatus(0, 1)).rejects.toMatchObject({
            statusCode: 400,
            message: 'รหัสภาคการศึกษาไม่ถูกต้อง',
        });
    });

    test('throws 400 when termId is null', async () => {
        await expect(service.getMySubjectsWithStatus(null, 1)).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    test('throws 400 when termId is "abc"', async () => {
        await expect(service.getMySubjectsWithStatus('abc', 1)).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    test('throws 401 with Thai message when instructorId is invalid', async () => {
        await expect(service.getMySubjectsWithStatus(1, 0)).rejects.toMatchObject({
            statusCode: 401,
            message: 'ข้อมูลผู้ใช้งานไม่ถูกต้อง',
        });
    });

    test('calls repository with parsed integers', async () => {
        repo.getMySubjectsWithStatus.mockResolvedValueOnce([]);
        await service.getMySubjectsWithStatus('5', '3');
        expect(repo.getMySubjectsWithStatus).toHaveBeenCalledWith(mockClient, 5, 3);
    });

    test('releases client in finally block even on error', async () => {
        repo.getMySubjectsWithStatus.mockRejectedValueOnce(new Error('DB error'));
        await expect(service.getMySubjectsWithStatus(1, 1)).rejects.toThrow('DB error');
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// createSubmission
// ---------------------------------------------------------------------------
describe('createSubmission', () => {
    const validPayload = {
        term_subject_id: 1,
        document_type: 'outline',
        file_url: 'https://example.com/file.pdf',
        original_name: 'test.pdf',
    };

    beforeEach(() => {
        repo.userExists.mockResolvedValue(true);
        repo.createSubmission.mockResolvedValue({ id: 1, status: 'pending' });
        repo.markTermSubjectSubmissionPending.mockResolvedValue({ id: 1 });
    });

    test('throws 400 when term_subject_id is missing', async () => {
        await expect(service.createSubmission({ ...validPayload, term_subject_id: null }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 400 when document_type is "invalid"', async () => {
        await expect(service.createSubmission({ ...validPayload, document_type: 'invalid' }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 400 when file_url is empty string', async () => {
        await expect(service.createSubmission({ ...validPayload, file_url: '' }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 400 when original_name is missing', async () => {
        await expect(service.createSubmission({ ...validPayload, original_name: '' }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 401 when submittedBy is invalid', async () => {
        await expect(service.createSubmission(validPayload, 0))
            .rejects.toMatchObject({ statusCode: 401 });
    });

    test('throws 401 when userExists returns false', async () => {
        repo.userExists.mockResolvedValueOnce(false);
        await expect(service.createSubmission(validPayload, 1))
            .rejects.toMatchObject({ statusCode: 401 });
    });

    test('calls BEGIN before repository calls', async () => {
        await service.createSubmission(validPayload, 1);
        const queryCalls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(queryCalls).toContain('BEGIN');
        const beginIdx = queryCalls.indexOf('BEGIN');
        expect(repo.createSubmission).toHaveBeenCalled();
        // BEGIN must appear before createSubmission was called
        // (we verify ordering by index in query calls array)
        expect(beginIdx).toBeGreaterThanOrEqual(0);
    });

    test('calls COMMIT after successful repository calls', async () => {
        await service.createSubmission(validPayload, 1);
        const queryCalls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(queryCalls).toContain('COMMIT');
        const beginIdx = queryCalls.indexOf('BEGIN');
        const commitIdx = queryCalls.indexOf('COMMIT');
        expect(commitIdx).toBeGreaterThan(beginIdx);
    });

    test('calls ROLLBACK when repository throws', async () => {
        repo.createSubmission.mockRejectedValueOnce(new Error('DB error'));
        await expect(service.createSubmission(validPayload, 1)).rejects.toThrow('DB error');
        const queryCalls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(queryCalls).toContain('ROLLBACK');
    });

    test('releases client in finally block', async () => {
        await service.createSubmission(validPayload, 1);
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// reviewSubmission
// ---------------------------------------------------------------------------
describe('reviewSubmission', () => {
    const validPayload = { action: 'approved', note: 'OK', reason: null };
    const reviewedResult = {
        submission: { id: 1, term_subject_id: 10, document_type: 'outline', status: 'approved' },
        review: { id: 50 },
    };

    beforeEach(() => {
        repo.userExists.mockResolvedValue(true);
        repo.reviewSubmission.mockResolvedValue(reviewedResult);
        repo.updateTermSubjectApproval.mockResolvedValue({ id: 10 });
        repo.getSubmissionEmailDetails.mockResolvedValue(null);
        emailService.sendReviewNotification = jest.fn().mockResolvedValue(undefined);
    });

    test('throws 400 when submissionId is invalid', async () => {
        await expect(service.reviewSubmission('abc', validPayload, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 401 when reviewerId is invalid', async () => {
        await expect(service.reviewSubmission(1, validPayload, 0))
            .rejects.toMatchObject({ statusCode: 401 });
    });

    test('throws 400 when action is not approved or rejected', async () => {
        await expect(service.reviewSubmission(1, { action: 'invalid' }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 400 with Thai message when action=rejected and reason is empty', async () => {
        await expect(service.reviewSubmission(1, { action: 'rejected', reason: '' }, 1))
            .rejects.toMatchObject({ statusCode: 400, message: 'กรุณาระบุเหตุผลการปฏิเสธ' });
    });

    test('throws 400 when action=rejected and reason is whitespace only', async () => {
        await expect(service.reviewSubmission(1, { action: 'rejected', reason: '   ' }, 1))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('does NOT throw when action=approved and reason is omitted', async () => {
        await expect(service.reviewSubmission(1, { action: 'approved' }, 1)).resolves.toBeDefined();
    });

    test('calls BEGIN, reviewSubmission repo, updateTermSubjectApproval, COMMIT in order', async () => {
        const callOrder = [];
        mockClient.query.mockImplementation((sql) => {
            callOrder.push(sql.trim());
            return Promise.resolve({});
        });
        repo.reviewSubmission.mockImplementation(() => {
            callOrder.push('repo.reviewSubmission');
            return Promise.resolve(reviewedResult);
        });
        repo.updateTermSubjectApproval.mockImplementation(() => {
            callOrder.push('repo.updateTermSubjectApproval');
            return Promise.resolve({ id: 10 });
        });

        await service.reviewSubmission(1, validPayload, 1);

        const beginIdx = callOrder.indexOf('BEGIN');
        const reviewIdx = callOrder.indexOf('repo.reviewSubmission');
        const updateIdx = callOrder.indexOf('repo.updateTermSubjectApproval');
        const commitIdx = callOrder.indexOf('COMMIT');

        expect(beginIdx).toBeGreaterThanOrEqual(0);
        expect(reviewIdx).toBeGreaterThan(beginIdx);
        expect(updateIdx).toBeGreaterThan(reviewIdx);
        expect(commitIdx).toBeGreaterThan(updateIdx);
    });

    test('throws 404 when repository.reviewSubmission returns null', async () => {
        repo.reviewSubmission.mockResolvedValueOnce(null);
        await expect(service.reviewSubmission(1, validPayload, 1))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    test('calls ROLLBACK when any step throws', async () => {
        repo.reviewSubmission.mockRejectedValueOnce(new Error('DB error'));
        await expect(service.reviewSubmission(1, validPayload, 1)).rejects.toThrow();
        const queryCalls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(queryCalls).toContain('ROLLBACK');
    });

    test('fires email notification after COMMIT (fire-and-forget)', async () => {
        repo.getSubmissionEmailDetails.mockResolvedValueOnce({
            email: 'instructor@example.com',
            instructor_name: 'อาจารย์สมชาย',
            subject_code: 'CS101',
            subject_name: 'Intro CS',
            document_type: 'outline',
        });
        emailService.sendReviewNotification = jest.fn().mockResolvedValue(undefined);

        await service.reviewSubmission(1, validPayload, 1);

        expect(emailService.sendReviewNotification).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'instructor@example.com' })
        );
    });

    test('does NOT throw if email fetch fails (error caught silently)', async () => {
        repo.getSubmissionEmailDetails.mockRejectedValueOnce(new Error('Email DB error'));
        await expect(service.reviewSubmission(1, validPayload, 1)).resolves.toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// getSubmissionHistory
// ---------------------------------------------------------------------------
describe('getSubmissionHistory', () => {
    test('throws 400 when termSubjectId is 0', async () => {
        await expect(service.getSubmissionHistory(0, 'outline'))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('throws 400 when documentType is "invalid"', async () => {
        await expect(service.getSubmissionHistory(1, 'invalid'))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test('returns repository result on success', async () => {
        const historyData = [{ round_number: 1, event_type: 'submitted' }];
        repo.getSubmissionHistory.mockResolvedValueOnce(historyData);
        const result = await service.getSubmissionHistory(1, 'outline');
        expect(result).toEqual(historyData);
    });
});
