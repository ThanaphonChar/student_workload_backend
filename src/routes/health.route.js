import express from 'express';
import { getHealthStatus } from '../controllers/health.controller.js';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', getHealthStatus);

export default router;
