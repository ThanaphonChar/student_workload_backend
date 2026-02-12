import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration - ใช้ env variables เหมือนกับ db.js
const poolConfig = {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: false
};

const pool = new Pool(poolConfig);

async function runDocumentsMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_term_subject_documents.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executing migration: create_term_subject_documents...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\nTable created:');
    console.log('  - term_subject_documents');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Table may already exist. This is okay if running migration again.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runDocumentsMigration();
