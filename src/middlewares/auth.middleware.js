import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 * Attaches decoded user data to req.user
 */
export const authMiddleware = (req, res, next) => {
    try {
        console.log('[Auth Middleware] 🔍 Checking request:', req.method, req.url);

        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        console.log('[Auth Middleware] 🔑 Auth header:', authHeader ? 'Present' : 'Missing');

        if (!authHeader) {
            console.log('[Auth Middleware] ❌ No authorization header');
            return res.status(401).json({
                success: false,
                message: 'No authorization header provided',
            });
        }

        // Extract token (format: "Bearer <token>")
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Attach user data to request
        // req.user = { id, roles }
        req.user = {
            id: decoded.sub,
            roles: decoded.roles || [],
        };

        console.log('[Auth] ✅ Token verified for user:', decoded.sub, 'roles:', decoded.roles);

        next();
    } catch (error) {
        console.error('[Auth] ❌ Token verification failed:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
        });
    }
};

export default authMiddleware;
