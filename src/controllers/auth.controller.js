import * as tuAuthService from '../services/tuAuth.service.js';

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
    try {
        // Extract credentials from request body
        const { username, password } = req.body;

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

        // Log login attempt (never log password)
        console.log(`[Auth] Login attempt for user: ${username}`);

        // Call TU Auth service
        const tuResponse = await tuAuthService.verifyCredentials(username, password);

        // Check if authentication was successful
        if (tuResponse.status === true) {
            // Transform user data
            const userData = tuAuthService.transformUserData(tuResponse);

            // Log successful login
            console.log(`[Auth] Login successful for user: ${username} (${tuResponse.type})`);

            // Respond with success
            return res.status(200).json({
                success: true,
                message: tuResponse.message || 'Login successful',
                user: userData,
                raw: tuResponse, // Include raw response for debugging/additional data
            });
        } else {
            // Authentication failed (wrong credentials)
            console.log(`[Auth] Login failed for user: ${username} - ${tuResponse.message || 'Invalid credentials'}`);

            return res.status(401).json({
                success: false,
                message: tuResponse.message || 'Invalid username or password',
            });
        }

    } catch (error) {
        // Handle service errors (network issues, API unavailable, etc.)
        console.error('[Auth] Login error:', error.message);

        // Determine appropriate status code
        const statusCode = error.message.includes('unavailable') ? 502 : 500;

        return res.status(statusCode).json({
            success: false,
            message: 'Authentication service error. Please try again later.',
            ...(process.env.NODE_ENV === 'development' && { error: error.message }),
        });
    }
};
