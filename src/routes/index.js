import express from 'express';
import healthRoute from './health.route.js';
import authRoute from './auth.route.js';
import subjectRoute from './subject.route.js';
import termRoute from './term.route.js';
import termSubjectRoute from './termSubject.route.js';
import userRoute from './user.route.js';
import mySubjectsRoute from './mySubjects.route.js';

const router = express.Router();

/**
 * Central route registration
 * All API routes are mounted here
 */

// Health check route
router.use('/health', healthRoute);

// Authentication routes
router.use('/auth', authRoute);

// User routes (protected)
router.use('/users', userRoute);

// Subject routes (protected)
router.use('/subjects', subjectRoute);

// Academic term routes (protected)
router.use('/terms', termRoute);

// Term subject routes (protected)
router.use('/term-subjects', termSubjectRoute);

// My subjects route (protected - professor only)
router.use('/my-subjects', mySubjectsRoute);

export default router;
