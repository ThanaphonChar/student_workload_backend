import { pool } from '../config/db.js';

export async function upsertUser(client, userData) {
    const findSql = `
        SELECT *
        FROM users
        WHERE username = $1 OR LOWER(email) = LOWER($2)
        LIMIT 1
    `;
    const existingResult = await client.query(findSql, [userData.username, userData.email]);
    const existing = existingResult.rows[0];

    if (existing) {
        const updateSql = `
            UPDATE users
            SET
                email = $1,
                first_name_th = $2,
                last_name_th = $3,
                first_name_en = $4,
                last_name_en = $5,
                user_type = $6,
                department = $7,
                faculty = $8,
                is_active = true
            WHERE id = $9
            RETURNING *
        `;
        const updateValues = [
            userData.email,
            userData.first_name_th,
            userData.last_name_th,
            userData.first_name_en,
            userData.last_name_en,
            userData.user_type,
            userData.department,
            userData.faculty,
            existing.id,
        ];
        const updated = await client.query(updateSql, updateValues);
        return updated.rows[0];
    }

    const insertSql = `
        INSERT INTO users (
            username,
            email,
            first_name_th,
            last_name_th,
            first_name_en,
            last_name_en,
            user_type,
            department,
            faculty,
            is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
        RETURNING *
    `;
    const insertValues = [
        userData.username,
        userData.email,
        userData.first_name_th,
        userData.last_name_th,
        userData.first_name_en,
        userData.last_name_en,
        userData.user_type,
        userData.department,
        userData.faculty,
    ];

    const inserted = await client.query(insertSql, insertValues);
    return inserted.rows[0];
}

export async function assignRole(client, userId, roleId, assignedBy) {
    const findSql = `
        SELECT *
        FROM user_roles
        WHERE user_id = $1 AND role_id = $2
        LIMIT 1
    `;
    const existingResult = await client.query(findSql, [userId, roleId]);
    const existing = existingResult.rows[0];

    if (!existing) {
        const insertSql = `
            INSERT INTO user_roles (user_id, role_id, is_active, assigned_at, assigned_by)
            VALUES ($1, $2, true, NOW(), $3)
            RETURNING *
        `;
        const insertResult = await client.query(insertSql, [userId, roleId, assignedBy]);
        return insertResult.rows[0];
    }

    if (existing.is_active) {
        return existing;
    }

    const reactivateSql = `
        UPDATE user_roles
        SET is_active = true,
            assigned_at = NOW(),
            assigned_by = $3
        WHERE user_id = $1 AND role_id = $2
        RETURNING *
    `;
    const reactivated = await client.query(reactivateSql, [userId, roleId, assignedBy]);
    return reactivated.rows[0];
}

export async function removeRole(client, userId, roleId) {
    const sql = `
        UPDATE user_roles
        SET is_active = false
        WHERE user_id = $1 AND role_id = $2 AND is_active = true
        RETURNING *
    `;
    const result = await client.query(sql, [userId, roleId]);
    return result.rows[0] || null;
}

export async function getUsersGroupedByRole(client = pool) {
    const sql = `
        SELECT
            u.id,
            u.username,
            u.email,
            u.first_name_th,
            u.last_name_th,
            u.first_name_en,
            u.last_name_en,
            u.department,
            u.faculty,
            ur.role_id,
            r.role_name
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE u.is_active = true
          AND ur.is_active = true
          AND r.role_name IN ('Academic Officer', 'Professor', 'Program Chair')
        ORDER BY r.role_name, u.first_name_th, u.last_name_th, u.first_name_en, u.last_name_en
    `;

    const result = await client.query(sql);

    const grouped = {
        academic_officer: [],
        professor: [],
        program_chair: [],
    };

    for (const row of result.rows) {
        const normalized = {
            id: row.id,
            username: row.username,
            email: row.email,
            first_name_th: row.first_name_th,
            last_name_th: row.last_name_th,
            first_name_en: row.first_name_en,
            last_name_en: row.last_name_en,
            department: row.department,
            faculty: row.faculty,
            role_id: row.role_id,
            role_name: row.role_name,
        };

        if (row.role_name === 'Academic Officer') grouped.academic_officer.push(normalized);
        if (row.role_name === 'Professor') grouped.professor.push(normalized);
        if (row.role_name === 'Program Chair') grouped.program_chair.push(normalized);
    }

    return grouped;
}
