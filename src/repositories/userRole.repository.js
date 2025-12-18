import { pool } from '../config/db.js';

/**
 * UserRole Repository
 * จัดการ database operations สำหรับ user_roles table
 * 
 * ❌ ห้ามมี business logic
 * ✅ ทำแค่ CRUD operations เท่านั้น
 */

/**
 * กำหนด role ให้กับ user (idempotent - ไม่สร้างซ้ำ)
 * @param {number} userId
 * @param {number} roleId
 * @param {Object} client - Database client (สำหรับ transaction)
 * @returns {Promise<Object>} - { inserted: boolean, userRole: Object|null }
 */
export async function assignRole(userId, roleId, client = pool) {
    const sql = `
        INSERT INTO user_roles (user_id, role_id, is_active)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
        RETURNING *
    `;

    const values = [userId, roleId, true];
    const result = await client.query(sql, values);

    // ถ้า INSERT สำเร็จ จะ return row
    // ถ้า conflict (ข้อมูลซ้ำ) จะ return ว่างเปล่า
    const inserted = result.rows.length > 0;

    return {
        inserted,
        userRole: inserted ? result.rows[0] : null,
    };
}

/**
 * ตรวจสอบว่า user มี role นี้หรือไม่
 * @param {number} userId
 * @param {number} roleId
 * @returns {Promise<boolean>}
 */
export async function hasRole(userId, roleId) {
    const sql = `
        SELECT 1 FROM user_roles 
        WHERE user_id = $1 AND role_id = $2 AND is_active = true
    `;
    const result = await pool.query(sql, [userId, roleId]);
    return result.rows.length > 0;
}

/**
 * ดึง roles ทั้งหมดของ user
 * @param {number} userId
 * @returns {Promise<Array>} - Array ของ role objects
 */
export async function getUserRoles(userId) {
    const sql = `
        SELECT r.id, r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND ur.is_active = true
    `;
    const result = await pool.query(sql, [userId]);
    return result.rows;
}
