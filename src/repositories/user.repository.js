import { pool } from '../config/db.js';
import { User } from '../models/user.model.js';

/**
 * User Repository
 * จัดการ database operations สำหรับ users table
 * 
 * ❌ ห้ามมี business logic
 * ❌ ห้ามรู้จัก Express
 * ✅ ทำแค่ CRUD operations เท่านั้น
 */

/**
 * หา user จาก email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
export async function findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    const result = await pool.query(sql, [email]);

    if (result.rows.length === 0) {
        return null;
    }

    return User.fromDatabase(result.rows[0]);
}

/**
 * สร้าง user ใหม่
 * @param {User} user - User model instance
 * @param {Object} client - Database client (สำหรับ transaction)
 * @returns {Promise<User>}
 */
export async function create(user, client = pool) {
    const insertData = user.toInsertData();

    const sql = `
        INSERT INTO users (
            username,
            first_name_th,
            last_name_th,
            first_name_en,
            last_name_en,
            email,
            user_type,
            department,
            faculty,
            is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;

    const values = [
        insertData.username,
        insertData.first_name_th,
        insertData.last_name_th,
        insertData.first_name_en,
        insertData.last_name_en,
        insertData.email,
        insertData.user_type,
        insertData.department,
        insertData.faculty,
        insertData.is_active,
    ];

    const result = await client.query(sql, values);
    return User.fromDatabase(result.rows[0]);
}

/**
 * หา user จาก ID
 * @param {number} userId
 * @returns {Promise<User|null>}
 */
export async function findById(userId) {
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
        return null;
    }

    return User.fromDatabase(result.rows[0]);
}

/**
 * ตรวจสอบว่ามี user ที่ใช้ email นี้อยู่หรือไม่
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function existsByEmail(email) {
    const sql = 'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)';
    const result = await pool.query(sql, [email]);
    return result.rows.length > 0;
}
