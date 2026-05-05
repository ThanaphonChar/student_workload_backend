/**
 * Seed guest accounts for demo/presentation
 * รัน: node scripts/seedGuestAccounts.js
 * 
 * Idempotent script - สามารถรันซ้ำได้โดยไม่มี error
 */

import pkg from 'pg';
const { Pool } = pkg;

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// โหลด environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// ตั้งค่า Pool - ใช้ DATABASE_URL ถ้ามี (Render.com) หรือ individual credentials
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    }
    : {
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 5432,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: false,
    };

const pool = new Pool(poolConfig);

const GUEST_ACCOUNTS = [
    {
        username: 'guest_officer',
        email: 'guest_officer@demo.local',
        first_name_th: 'เจ้าหน้าที่',
        last_name_th: 'ตัวอย่าง',
        first_name_en: 'Guest',
        last_name_en: 'Officer',
        user_type: 'guest',
        role_name: 'Academic Officer',
    },
    {
        username: 'guest_chair',
        email: 'guest_chair@demo.local',
        first_name_th: 'ประธาน',
        last_name_th: 'ตัวอย่าง',
        first_name_en: 'Guest',
        last_name_en: 'Chair',
        user_type: 'guest',
        role_name: 'Program Chair',
    },
    {
        username: 'guest_professor',
        email: 'guest_professor@demo.local',
        first_name_th: 'อาจารย์',
        last_name_th: 'ตัวอย่าง',
        first_name_en: 'Guest',
        last_name_en: 'Professor',
        user_type: 'guest',
        role_name: 'Professor',
    },
    {
        username: 'guest_student',
        email: 'guest_student@demo.local',
        first_name_th: 'นักศึกษา',
        last_name_th: 'ตัวอย่าง',
        first_name_en: 'Guest',
        last_name_en: 'Student',
        user_type: 'guest',
        role_name: 'Student',
    },
];

const GUEST_PASSWORD = 'guest1234';
const SALT_ROUNDS = 10;

async function seedGuestAccounts() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🌱 เริ่ม seed guest accounts...\n');

        // Hash password
        console.log('🔐 Hash password ด้วย bcrypt...');
        const passwordHash = await bcrypt.hash(GUEST_PASSWORD, SALT_ROUNDS);
        console.log('✅ Hash password สำเร็จ\n');

        // Process each guest account
        for (const account of GUEST_ACCOUNTS) {
            try {
                console.log(`📝 Processing: ${account.username}`);

                // 1. Upsert user
                const userSql = `
                    INSERT INTO users (
                        username,
                        email,
                        first_name_th,
                        last_name_th,
                        first_name_en,
                        last_name_en,
                        user_type,
                        password_hash,
                        is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                    ON CONFLICT (username) 
                    DO UPDATE SET 
                        email = EXCLUDED.email,
                        first_name_th = EXCLUDED.first_name_th,
                        last_name_th = EXCLUDED.last_name_th,
                        first_name_en = EXCLUDED.first_name_en,
                        last_name_en = EXCLUDED.last_name_en,
                        password_hash = EXCLUDED.password_hash,
                        is_active = true
                    RETURNING id, username, email
                `;

                const userResult = await client.query(userSql, [
                    account.username,
                    account.email,
                    account.first_name_th,
                    account.last_name_th,
                    account.first_name_en,
                    account.last_name_en,
                    account.user_type,
                    passwordHash,
                ]);

                const userId = userResult.rows[0].id;
                console.log(`  ✅ User upsert: ID ${userId} - ${userResult.rows[0].email}`);

                // 2. Find role by name
                const roleSql = 'SELECT id FROM roles WHERE role_name = $1 LIMIT 1';
                const roleResult = await client.query(roleSql, [account.role_name]);

                if (roleResult.rows.length === 0) {
                    throw new Error(`ไม่พบ role: ${account.role_name}`);
                }

                const roleId = roleResult.rows[0].id;
                console.log(`  ✅ Role found: ${account.role_name} (ID ${roleId})`);

                // 3. Upsert user_role
                const userRoleSql = `
                    INSERT INTO user_roles (user_id, role_id, is_active)
                    VALUES ($1, $2, true)
                    ON CONFLICT (user_id, role_id) 
                    DO UPDATE SET 
                        is_active = true
                    RETURNING id
                `;

                const userRoleResult = await client.query(userRoleSql, [userId, roleId]);
                console.log(`  ✅ User role assigned: ${account.role_name}`);
                console.log('');

            } catch (accountError) {
                console.error(`  ❌ Error processing ${account.username}: ${accountError.message}`);
                throw accountError;
            }
        }

        await client.query('COMMIT');

        console.log('✅ Seed guest accounts สำเร็จ!\n');
        console.log('📊 Guest accounts ที่สร้าง/อัปเดท:');
        GUEST_ACCOUNTS.forEach(account => {
            console.log(`  - ${account.username} (${account.role_name})`);
            console.log(`    Password: ${GUEST_PASSWORD}`);
            console.log(`    Email: ${account.email}\n`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the seed script
seedGuestAccounts().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
