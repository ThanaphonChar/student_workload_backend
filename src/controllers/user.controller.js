/**
 * User Controller
 * Handles HTTP requests for user operations
 * No business logic - only request/response handling
 */

import * as userService from '../services/user.service.js';

/**
 * @route   GET /api/users/professors
 * @desc    Get all users with "Professor" role
 * @access  Protected (Academic Officer only)
 */
export async function getProfessors(req, res) {
    try {
        console.log('[User Controller] 📥 Get professors request');

        const professors = await userService.getProfessors();

        return res.status(200).json({
            success: true,
            count: professors.length,
            data: professors,
        });

    } catch (error) {
        return handleError(res, error);
    }
}

/**
 * Error handler
 * @param {Object} res - Express response
 * @param {Error} error - Error object
 */
function handleError(res, error) {
    console.error('[User Controller] ❌ Error:', error);

    // Unknown Error
    return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในระบบ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
}
