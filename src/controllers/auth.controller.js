import jwt from 'jsonwebtoken';
import * as tuAuthService from '../services/tuAuth.service.js';
import * as loginPostProcessService from '../services/loginPostProcess.service.js';
import config from '../config/env.js';

/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

/**
 * Login handler
 * Authenticates user credentials via TU Auth API
 * 
 * @route POST /api/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
    const requestStartTime = Date.now();
    console.log(`[Auth] ⏱️  Request received at: ${new Date().toISOString()}`);

    try {
        // Extract credentials from request body
        // Support both lowercase (username/password) and TU API format (UserName/PassWord)
        const username = req.body.UserName;
        const password = req.body.PassWord;

        // Validate input
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Username is required and must be a non-empty string',
            });
        }

        if (!password || typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Password is required and must be a non-empty string',
            });
        }

        const validationTime = Date.now() - requestStartTime;
        console.log(`[Auth] ⏱️  Validation time: ${validationTime}ms`);
        console.log(`[Auth] 🔑 Login attempt for user: ${username}`);

        // Call TU Auth service
        const tuAuthStart = Date.now();
        const tuResponse = await tuAuthService.verifyCredentials(username, password);
        const tuAuthTime = Date.now() - tuAuthStart;
        console.log(`[Auth] ⏱️  TU Auth service time: ${tuAuthTime}ms`);

        // Check if authentication was successful
        if (tuResponse.status === true) {
            // Transform user data
            const transformStart = Date.now();
            const userData = tuAuthService.transformUserData(tuResponse);
            const transformTime = Date.now() - transformStart;
            console.log(`[Auth] ⏱️  Transform user data: ${transformTime}ms`);

            // POST-LOGIN PROCESS: ตรวจสอบคณะและ sync เข้า database
            let postProcessResult;
            try {
                const postProcessStart = Date.now();
                postProcessResult = await loginPostProcessService.processLoginUser(tuResponse);
                const postProcessTime = Date.now() - postProcessStart;
                console.log(`[Auth] ⏱️  Post-process time: ${postProcessTime}ms`);
            } catch (postProcessError) {
                // การตรวจสอบคณะล้มเหลว หรือ sync error
                console.error(`[Auth] ❌ Post-process failed: ${postProcessError.message}`);

                const totalTime = Date.now() - requestStartTime;
                console.log(`[Auth] ⏱️  Total time (post-process failed): ${totalTime}ms`);

                return res.status(403).json({
                    success: false,
                    message: postProcessError.message,
                    error: 'Access denied',
                });
            }

            // Generate JWT token with user ID and role
            const jwtStart = Date.now();
            const tokenPayload = {
                userId: postProcessResult.user.id,
                username: userData.username,
                type: userData.type,
                email: userData.email,
                role: postProcessResult.role,
            };

            const token = jwt.sign(
                tokenPayload,
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );
            const jwtTime = Date.now() - jwtStart;
            console.log(`[Auth] ⏱️  JWT generation: ${jwtTime}ms`);

            // Calculate expiresIn in seconds (30 days = 2592000 seconds)
            const expiresIn = 30 * 24 * 60 * 60; // 2592000 seconds

            const totalTime = Date.now() - requestStartTime;
            console.log(`[Auth] ✅ Login successful for user: ${username} (${tuResponse.type})`);
            console.log(`[Auth] ⏱️  TOTAL LOGIN TIME: ${totalTime}ms`);

            // Respond with success
            return res.status(200).json({
                success: true,
                message: tuResponse.message || 'Login successful',
                user: {
                    ...userData,
                    id: postProcessResult.user.id,
                    role: postProcessResult.role,
                    faculty: postProcessResult.faculty,
                },
                token: token,
                expiresIn: expiresIn,
            });
        } else {
            // Authentication failed (wrong credentials)
            const totalTime = Date.now() - requestStartTime;
            console.log(`[Auth] ❌ Login failed for user: ${username} - ${tuResponse.message || 'Invalid credentials'}`);
            console.log(`[Auth] ⏱️  Total time (failed): ${totalTime}ms`);

            return res.status(401).json({
                success: false,
                message: tuResponse.message || 'Invalid username or password',
            });
        }

    } catch (error) {
        // Handle service errors (network issues, API unavailable, etc.)
        const totalTime = Date.now() - requestStartTime;
        console.error(`[Auth] ❌ Login error: ${error.message}`);
        console.error(`[Auth] ⏱️  Total time (error): ${totalTime}ms`);

        // Determine appropriate status code
        const statusCode = error.message.includes('unavailable') ? 502 : 500;

        return res.status(statusCode).json({
            success: false,
            message: 'Authentication service error. Please try again later.',
            ...(process.env.NODE_ENV === 'development' && { error: error.message }),
        });
    }
};
