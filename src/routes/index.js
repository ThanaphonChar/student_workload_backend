import express from 'express';
import healthRoute from './health.route.js';
import authRoute from './auth.route.js';
import subjectRoute from './subject.route.js';
import termRoute from './term.route.js';
import termSubjectRoute from './termSubject.route.js';

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

// Academic term routes (protected)
router.use('/terms', termRoute);

// Term subject routes (protected)
router.use('/term-subjects', termSubjectRoute);

export default router;
