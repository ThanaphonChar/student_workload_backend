/**
 * Reminder Routes (Internal)
 * GET /api/internal/reminders/send
 * Protected by x-internal-key header
 */

import express from 'express';
import { sendReminders } from '../controllers/reminder.controller.js';
import { verifyInternalKey } from '../middlewares/internalKey.middleware.js';

const router = express.Router();

router.get('/send', verifyInternalKey, sendReminders);

export default router;
