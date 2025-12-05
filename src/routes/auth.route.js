import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * Authentication routes
 * Handles user authentication endpoints
 */

/**
 * POST /api/auth/login
 * Authenticate user with TU credentials
 * 
 * Request body:
 * {
 *   "username": "5701010101",
 *   "password": "user_password"
 * }
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "user": { ...user_data... },
 *   "raw": { ...full_tu_response... }
 * }
 * 
 * Error responses:
 * - 400: Invalid input (missing username/password)
 * - 401: Authentication failed (wrong credentials)
 * - 500/502: Service error
 */
router.post('/login', authController.login);

export default router;
