import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as tuAuthService from '../services/tuAuth.service.js';
import * as loginPostProcessService from '../services/loginPostProcess.service.js';
import * as userRepository from '../repositories/user.repository.js';
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

        // GUEST USER CHECK: ตรวจสอบ guest user ก่อน TU API
        const guestCheckStart = Date.now();
        const guestUser = await userRepository.findGuestUser(username);
        console.log(`[Auth] ⏱️  Guest check time: ${Date.now() - guestCheckStart}ms`);

        if (guestUser) {
            console.log(`[Auth] 👤 Guest user found: ${username}`);

            // Compare password with bcrypt
            const passwordMatchStart = Date.now();
            const passwordMatch = await bcrypt.compare(password, guestUser.password_hash);
            console.log(`[Auth] ⏱️  Password compare time: ${Date.now() - passwordMatchStart}ms`);

            if (!passwordMatch) {
                const totalTime = Date.now() - requestStartTime;
                console.log(`[Auth] ❌ Guest login failed: Invalid password for ${username}`);
                console.log(`[Auth] ⏱️  Total time (guest auth failed): ${totalTime}ms`);

                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password',
                });
            }

            // Build guest response to match TU API format
            const guestResponse = {
                status: true,
                message: 'Guest login successful',
                type: guestUser.roles && guestUser.roles[0]?.toLowerCase().includes('student') ? 'student' : 'employee',
                username: guestUser.username,
                displayname_th: `${guestUser.first_name_th} ${guestUser.last_name_th}`.trim(),
                displayname_en: `${guestUser.first_name_en} ${guestUser.last_name_en}`.trim(),
                email: guestUser.email,
                department: guestUser.department || 'Guest User',
                organization: guestUser.faculty || 'Demo',
            };

            // Transform guest user data
            const transformStart = Date.now();
            const userData = tuAuthService.transformUserData(guestResponse);
            console.log(`[Auth] ⏱️  Transform user data: ${Date.now() - transformStart}ms`);

            // POST-LOGIN PROCESS: ตรวจสอบคณะและ sync เข้า database (guest users bypass faculty check)
            let postProcessResult;
            try {
                const postProcessStart = Date.now();
                // For guest users, we need to create a guest flow or use special handling
                // We'll manually create the response since guests are pre-approved
                postProcessResult = {
                    user: {
                        id: guestUser.id,
                        username: guestUser.username,
                        email: guestUser.email,
                        firstNameTh: guestUser.first_name_th,
                        lastNameTh: guestUser.last_name_th,
                        firstNameEn: guestUser.first_name_en,
                        lastNameEn: guestUser.last_name_en,
                        userType: guestUser.user_type,
                        department: guestUser.department,
                        faculty: guestUser.faculty,
                        isActive: guestUser.is_active,
                    },
                    roles: Array.isArray(guestUser.roles) 
                        ? guestUser.roles.filter(r => r !== null && r !== 'null') 
                        : [],
                    faculty: guestUser.faculty || 'Demo',
                };
                console.log(`[Auth] ⏱️  Post-process time: ${Date.now() - postProcessStart}ms`);
            } catch (postProcessError) {
                console.error(`[Auth] ❌ Post-process failed: ${postProcessError.message}`);

                const totalTime = Date.now() - requestStartTime;
                console.log(`[Auth] ⏱️  Total time (post-process failed): ${totalTime}ms`);

                return res.status(403).json({
                    success: false,
                    message: postProcessError.message,
                    error: 'Access denied',
                });
            }

            // Generate JWT token
            const jwtStart = Date.now();
            const tokenPayload = {
                sub: postProcessResult.user.id,
                roles: postProcessResult.roles,
            };

            const token = jwt.sign(
                tokenPayload,
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );
            console.log(`[Auth] ⏱️  JWT generation: ${Date.now() - jwtStart}ms`);

            const expiresIn = 30 * 24 * 60 * 60; // 2592000 seconds

            const totalTime = Date.now() - requestStartTime;
            console.log(`[Auth] ✅ Guest login successful for user: ${username}`);
            console.log(`[Auth] ⏱️  TOTAL LOGIN TIME: ${totalTime}ms`);

            // Respond with success
            return res.status(200).json({
                success: true,
                message: 'Guest login successful',
                user: {
                    ...userData,
                    id: postProcessResult.user.id,
                    roles: postProcessResult.roles,
                    faculty: postProcessResult.faculty,
                },
                token: token,
                expiresIn: expiresIn,
            });
        }

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

            // Generate JWT token with user ID and roles
            // JWT payload ต้องมีเฉพาะ sub (user id) และ roles (array)
            // ห้ามใส่ sensitive data เช่น email, username
            const jwtStart = Date.now();
            const tokenPayload = {
                sub: postProcessResult.user.id,
                roles: postProcessResult.roles,
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
                    roles: postProcessResult.roles,
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
