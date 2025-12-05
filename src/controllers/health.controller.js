/**
 * Health check controller
 * Handles health check endpoint logic
 */

/**
 * Get health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getHealthStatus = (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
};
