/**
 * Script: สร้าง Term 1/2569 และตั้งเป็น Active Term
 * 
 * ภาคการศึกษา 1/2569 (2026):
 * - เริ่มต้น: 1 มกราคม 2026
 * - สิ้นสุด: 30 เมษายน 2026
 * - สอบกลางภาค: 1-15 มีนาคม 2026
 * - สอบปลายภาค: 15-30 เมษายน 2026
 */

import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// โหลด environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

async function createTerm2569() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔍 Step 1: ตรวจสอบ terms ที่มีอยู่...');
    const existingTerms = await client.query(`
      SELECT id, academic_year, academic_sector, is_active
      FROM terms
      ORDER BY academic_year DESC, academic_sector DESC
      LIMIT 5
    `);

    console.log('\n📊 Terms ปัจจุบัน:');
    existingTerms.rows.forEach(row => {
      console.log(`  - Term ${row.academic_sector}/${row.academic_year} (ID: ${row.id}) ${row.is_active ? '✅ ACTIVE' : '⭕ INACTIVE'}`);
    });

    // ตรวจสอบว่ามี term 1/2569 อยู่แล้วหรือไม่
    const checkTerm = await client.query(`
      SELECT id FROM terms 
      WHERE academic_year = 2569 AND academic_sector = 1
    `);

    if (checkTerm.rows.length > 0) {
      console.log('\n⚠️  Term 1/2569 มีอยู่แล้ว (ID: ' + checkTerm.rows[0].id + ')');
      console.log('🔄 กำลังอัปเดต is_active...');

      // ปิด active ทุก term
      await client.query('UPDATE terms SET is_active = false');

      // เปิด active ให้ term 1/2569
      await client.query(`
        UPDATE terms 
        SET is_active = true 
        WHERE id = $1
      `, [checkTerm.rows[0].id]);

      console.log('✅ อัปเดต term 1/2569 เป็น active แล้ว');

    } else {
      console.log('\n➕ กำลังสร้าง term 1/2569 ใหม่...');

      // ปิด active ทุก term
      await client.query('UPDATE terms SET is_active = false');
      console.log('  ✅ ปิด active ทุก term แล้ว');

      // สร้าง term ใหม่
      const insertResult = await client.query(`
        INSERT INTO terms (
          academic_year,
          academic_sector,
          term_start_date,
          term_end_date,
          midterm_start_date,
          midterm_end_date,
          final_start_date,
          final_end_date,
          is_active,
          created_at,
          created_by
        ) VALUES (
          2569,
          1,
          '2026-01-01',
          '2026-04-30',
          '2026-03-01',
          '2026-03-15',
          '2026-04-15',
          '2026-04-30',
          true,
          CURRENT_TIMESTAMP,
          1
        )
        RETURNING id, academic_year, academic_sector
      `);

      const newTerm = insertResult.rows[0];
      console.log(`  ✅ สร้าง term ${newTerm.academic_sector}/${newTerm.academic_year} แล้ว (ID: ${newTerm.id})`);
    }

    await client.query('COMMIT');

    console.log('\n🎉 สำเร็จ! ตอนนี้ Dashboard จะแสดงข้อมูลภาค 1/2569');
    console.log('\n📅 วันที่ภาคการศึกษา:');
    console.log('  - เริ่มภาค: 1 มกราคม 2026');
    console.log('  - สอบกลางภาค: 1-15 มีนาคม 2026');
    console.log('  - สอบปลายภาค: 15-30 เมษายน 2026');
    console.log('  - สิ้นสุดภาค: 30 เมษายน 2026');

    console.log('\n💡 หมายเหตุ: ตอนนี้วันที่ 20 กุมภาพันธ์ 2026 อยู่ในช่วงภาค 1/2569');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createTerm2569()
  .then(() => {
    console.log('\n✅ สคริปต์ทำงานสำเร็จ');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ สคริปต์ล้มเหลว:', error);
    process.exit(1);
  });
