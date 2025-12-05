import express from 'express';
import healthRoute from './health.route.js';

const router = express.Router();

/**
 * Central route registration
 * All API routes are mounted here
 */

// Health check route
router.use('/health', healthRoute);

// Future routes can be added here
// router.use('/users', userRoute);
// router.use('/auth', authRoute);

export default router;
