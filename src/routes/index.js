import express from 'express';
import healthRoute from './health.route.js';
import authRoute from './auth.route.js';
import subjectRoute from './subject.route.js';
import adminRoute from './admin.route.js';

const router = express.Router();

/**
 * Central route registration
 * All API routes are mounted here
 */

// Health check route
router.use('/health', healthRoute);

// Authentication routes
router.use('/auth', authRoute);

// Subject routes (protected)
router.use('/subjects', subjectRoute);

// Admin routes (protected)
router.use('/admin', adminRoute);

export default router;
