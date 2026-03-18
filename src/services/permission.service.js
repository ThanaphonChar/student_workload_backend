import { pool } from '../config/db.js';
import * as permissionRepo from '../repositories/permission.repository.js';
import * as roleRepo from '../repositories/role.repository.js';
import { fetchInstructorsFromTuApi } from './tuApi.service.js';

const ROLE_NAME_BY_KEY = {
    academic_officer: 'Academic Officer',
    professor: 'Professor',
    program_chair: 'Program Chair',
};

async function resolveRoleId(roleKey) {
    const roleName = ROLE_NAME_BY_KEY[roleKey];
    if (!roleName) {
        throw new Error('บทบาทไม่ถูกต้อง');
    }

    const role = await roleRepo.findByName(roleName);
    if (!role) {
        throw new Error('ไม่พบบทบาทในระบบ');
    }

    return role.id;
}

export async function getInstructors() {
    return await fetchInstructorsFromTuApi();
}

export async function bulkUpsertUsersWithRole(instructors, roleKey, assignedBy) {
    if (!Array.isArray(instructors) || instructors.length === 0) {
        throw new Error('กรุณาเลือกผู้ใช้อย่างน้อย 1 คน');
    }

    const roleId = await resolveRoleId(roleKey);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const deduped = Array.from(new Map(
            instructors
                .filter((item) => item?.tu_id && item?.email)
                .map((item) => [String(item.tu_id), item])
        ).values());

        for (const instructor of deduped) {
            const userData = {
                username: String(instructor.tu_id).trim(),
                email: String(instructor.email).toLowerCase().trim(),
                first_name_th: instructor.first_name_th || '',
                last_name_th: instructor.last_name_th || '',
                first_name_en: instructor.first_name_en || '',
                last_name_en: instructor.last_name_en || '',
                user_type: 'employee',
                department: instructor.department || '',
                faculty: instructor.faculty || 'คณะวิทยาศาสตร์และเทคโนโลยี',
            };

            const user = await permissionRepo.upsertUser(client, userData);
            await permissionRepo.assignRole(client, user.id, roleId, assignedBy);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return await getUsersGroupedByRole();
}

export async function deactivateUserRole(userId, roleId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const removed = await permissionRepo.removeRole(client, userId, roleId);
        await client.query('COMMIT');

        if (!removed) {
            throw new Error('ไม่พบสิทธิ์ที่ต้องการลบ');
        }

        return removed;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function getUsersGroupedByRole() {
    const client = await pool.connect();
    try {
        return await permissionRepo.getUsersGroupedByRole(client);
    } finally {
        client.release();
    }
}
