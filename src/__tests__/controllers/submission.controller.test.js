import { jest } from '@jest/globals';

// ── Service mock functions ────────────────────────────────────────────────────
const mockService = {
    getMySubjectsWithStatus: jest.fn(),
    createSubmission: jest.fn(),
    reviewSubmission: jest.fn(),
    getSubmissionHistory: jest.fn(),
};

// ── Register mock BEFORE dynamic imports ─────────────────────────────────────
jest.unstable_mockModule('../../services/submission.service.js', () => mockService);

// ── Dynamic imports (after mock registration) ─────────────────────────────────
const { default: request } = await import('supertest');
const { default: express } = await import('express');
const submissionController = await import('../../controllers/submission.controller.js');

// ── Minimal app — no auth middleware, injects req.user ───────────────────────
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.user = { id: 1 };
    next();
});
app.get('/submissions/my-subjects/:termId', submissionController.getMySubjectsWithStatus);
app.post('/submissions', submissionController.createSubmission);
app.patch('/submissions/:submissionId/review', submissionController.reviewSubmission);
app.get('/submissions/:termSubjectId/history/:documentType', submissionController.getSubmissionHistory);

// ── Helpers ───────────────────────────────────────────────────────────────────
const httpError = (message, statusCode = 400) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

beforeEach(() => jest.clearAllMocks());

// ────────────────────────────────────────────────────────────────────────────
// GET /submissions/my-subjects/:termId
// ────────────────────────────────────────────────────────────────────────────
describe('GET /submissions/my-subjects/:termId', () => {
    test('200 with { success: true, data } on success', async () => {
        const mockData = [{ term_subject_id: 1, subject_code: 'CS101' }];
        mockService.getMySubjectsWithStatus.mockResolvedValueOnce(mockData);

        const res = await request(app).get('/submissions/my-subjects/1');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(mockData);
    });

    test('400 with { success: false, message } when service throws 400', async () => {
        mockService.getMySubjectsWithStatus.mockRejectedValueOnce(
            httpError('รหัสภาคการศึกษาไม่ถูกต้อง', 400)
        );

        const res = await request(app).get('/submissions/my-subjects/abc');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('รหัสภาคการศึกษาไม่ถูกต้อง');
    });

    test('401 when service throws 401', async () => {
        mockService.getMySubjectsWithStatus.mockRejectedValueOnce(
            httpError('ข้อมูลผู้ใช้งานไม่ถูกต้อง', 401)
        );

        const res = await request(app).get('/submissions/my-subjects/1');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('500 when service throws without statusCode', async () => {
        mockService.getMySubjectsWithStatus.mockRejectedValueOnce(new Error('Unexpected'));

        const res = await request(app).get('/submissions/my-subjects/1');

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /submissions
// ────────────────────────────────────────────────────────────────────────────
describe('POST /submissions', () => {
    const validBody = {
        term_subject_id: 1,
        document_type: 'outline',
        file_url: 'https://example.com/file.pdf',
        original_name: 'test.pdf',
    };

    test('201 with success message on success', async () => {
        mockService.createSubmission.mockResolvedValueOnce({ id: 1, status: 'pending' });

        const res = await request(app).post('/submissions').send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('ส่งเอกสารสำเร็จ');
        expect(res.body.data).toEqual({ id: 1, status: 'pending' });
    });

    test('400 when service throws validation error', async () => {
        mockService.createSubmission.mockRejectedValueOnce(
            httpError('ข้อมูลไฟล์ไม่ครบถ้วน', 400)
        );

        const res = await request(app).post('/submissions').send({ ...validBody, file_url: '' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('500 on unexpected error', async () => {
        mockService.createSubmission.mockRejectedValueOnce(new Error('Unexpected'));

        const res = await request(app).post('/submissions').send(validBody);

        expect(res.status).toBe(500);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /submissions/:submissionId/review
// ────────────────────────────────────────────────────────────────────────────
describe('PATCH /submissions/:submissionId/review', () => {
    const validBody = { action: 'approved', note: 'OK' };
    const reviewedResult = {
        submission: { id: 1, term_subject_id: 10, document_type: 'outline', status: 'approved' },
        review: { id: 50 },
    };

    test('200 with { success: true, data, message: บันทึกผลการตรวจสอบสำเร็จ }', async () => {
        mockService.reviewSubmission.mockResolvedValueOnce(reviewedResult);

        const res = await request(app).patch('/submissions/1/review').send(validBody);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('บันทึกผลการตรวจสอบสำเร็จ');
        expect(res.body.data).toEqual(reviewedResult);
    });

    test('400 when action is missing (service throws 400)', async () => {
        mockService.reviewSubmission.mockRejectedValueOnce(
            httpError('การดำเนินการไม่ถูกต้อง', 400)
        );

        const res = await request(app).patch('/submissions/1/review').send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('400 when action is rejected but reason is empty', async () => {
        mockService.reviewSubmission.mockRejectedValueOnce(
            httpError('กรุณาระบุเหตุผลการปฏิเสธ', 400)
        );

        const res = await request(app)
            .patch('/submissions/1/review')
            .send({ action: 'rejected', reason: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('กรุณาระบุเหตุผลการปฏิเสธ');
    });

    test('404 when submission not found', async () => {
        mockService.reviewSubmission.mockRejectedValueOnce(
            httpError('ไม่พบรายการส่งเอกสาร', 404)
        );

        const res = await request(app).patch('/submissions/999/review').send(validBody);

        expect(res.status).toBe(404);
    });

    test('500 on unexpected error', async () => {
        mockService.reviewSubmission.mockRejectedValueOnce(new Error('Unexpected'));

        const res = await request(app).patch('/submissions/1/review').send(validBody);

        expect(res.status).toBe(500);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /submissions/:termSubjectId/history/:documentType
// ────────────────────────────────────────────────────────────────────────────
describe('GET /submissions/:termSubjectId/history/:documentType', () => {
    test('200 with data array', async () => {
        const historyData = [{ round_number: 1, event_type: 'submitted' }];
        mockService.getSubmissionHistory.mockResolvedValueOnce(historyData);

        const res = await request(app).get('/submissions/1/history/outline');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(historyData);
    });

    test('400 on invalid params (service throws 400)', async () => {
        mockService.getSubmissionHistory.mockRejectedValueOnce(
            httpError('ประเภทเอกสารไม่ถูกต้อง', 400)
        );

        const res = await request(app).get('/submissions/1/history/invalid');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('500 on unexpected error', async () => {
        mockService.getSubmissionHistory.mockRejectedValueOnce(new Error('Unexpected'));

        const res = await request(app).get('/submissions/1/history/outline');

        expect(res.status).toBe(500);
    });
});
