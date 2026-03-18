import * as permissionService from '../services/permission.service.js';

export async function getInstructors(req, res) {
    try {
        const data = await permissionService.getInstructors();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function bulkCreateUsers(req, res) {
    try {
        const { instructors, role } = req.body || {};

        const grouped = await permissionService.bulkUpsertUsersWithRole(
            instructors,
            role,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: 'เพิ่มผู้ใช้สำเร็จ',
            data: grouped,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function removeUserRole(req, res) {
    try {
        const userId = parseInt(req.params.userId, 10);
        const roleId = parseInt(req.params.roleId, 10);

        if (Number.isNaN(userId) || Number.isNaN(roleId)) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        await permissionService.deactivateUserRole(userId, roleId);

        return res.status(200).json({
            success: true,
            message: 'ลบสิทธิ์สำเร็จ',
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getUsersGroupedByRole(req, res) {
    try {
        const data = await permissionService.getUsersGroupedByRole();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return handleError(res, error);
    }
}

function handleError(res, error) {
    const message = error?.message || 'เกิดข้อผิดพลาดภายในระบบ';
    const status = message.includes('ไม่พบ') || message.includes('ไม่ถูกต้อง') ? 400 : 500;
    return res.status(status).json({
        success: false,
        message,
    });
}
