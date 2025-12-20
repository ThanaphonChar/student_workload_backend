/**
 * Role-Based Authorization Middleware
 * ตรวจสอบว่า user มีสิทธิ์เข้าถึง endpoint ตาม role หรือไม่
 * 
 * ใช้งาน:
 * router.get('/path', authorizeRoles('Professor', 'Academic Officer'), controller.method)
 * 
 * หมายเหตุ:
 * - ต้องใช้ร่วมกับ authMiddleware (ต้องมี req.user ก่อน)
 * - req.user ต้องมี role property (string หรือ array)
 */

/**
 * สร้าง middleware สำหรับตรวจสอบ roles
 * @param {...string} allowedRoles - Roles ที่อนุญาตให้เข้าถึง
 * @returns {Function} Express middleware
 */
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        // ตรวจสอบว่ามี user data จาก authMiddleware หรือไม่
        if (!req.user) {
            console.error('[Role Middleware] ❌ No user data - authMiddleware may not be applied');
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // ดึง roles จาก req.user (JWT decode)
        const userRoles = req.user.roles || [];

        console.log('[Role Middleware] 🔍 Checking access:', {
            endpoint: `${req.method} ${req.path}`,
            userId: req.user.id,
            userRoles,
            allowedRoles,
        });

        // ตรวจสอบว่า user มี role ที่อนุญาตหรือไม่
        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            console.log('[Role Middleware] ❌ Access denied:', {
                userRoles,
                requiredRoles: allowedRoles,
            });

            return res.status(403).json({
                success: false,
                message: 'Access forbidden: insufficient permissions',
                required: allowedRoles,
            });
        }

        console.log('[Role Middleware] ✅ Access granted');
        next();
    };
}

/**
 * Constants สำหรับ roles ในระบบ
 * ใช้เพื่อป้องกัน typo และทำให้ refactor ง่าย
 */
export const ROLES = {
    ACADEMIC_OFFICER: 'Academic Officer',
    PROGRAM_CHAIR: 'Program Chair',
    PROFESSOR: 'Professor',
    STUDENT: 'Student',
};
