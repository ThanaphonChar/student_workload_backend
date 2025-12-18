import { pool } from '../config/db.js';

/**
 * Role Repository
 * จัดการ database operations สำหรับ roles table
 * 
 * ❌ ห้ามมี business logic
 * ✅ ทำแค่ query operations เท่านั้น
 */

/**
 * หา role จากชื่อ
 * @param {string} roleName - เช่น 'Student', 'Professor'
 * @returns {Promise<Object|null>} - Role object { id, role_name } หรือ null
 */
export async function findByName(roleName) {
    const sql = 'SELECT id, role_name FROM roles WHERE role_name = $1';
    const result = await pool.query(sql, [roleName]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

/**
 * หา role จาก ID
 * @param {number} roleId
 * @returns {Promise<Object|null>} - Role object { id, role_name } หรือ null
 */
export async function findById(roleId) {
    const sql = 'SELECT id, role_name FROM roles WHERE id = $1';
    const result = await pool.query(sql, [roleId]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

/**
 * ดึง roles ทั้งหมด
 * @returns {Promise<Array>} - Array ของ role objects
 */
export async function findAll() {
    const sql = 'SELECT id, role_name FROM roles ORDER BY id';
    const result = await pool.query(sql);
    return result.rows;
}
