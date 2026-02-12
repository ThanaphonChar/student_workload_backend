/**
 * Migration Runner Script
 * รัน SQL migration เพื่อสร้างตาราง term_subject_documents
 */

import { pool } from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting migration: create_term_subject_documents');
        
        // อ่าน SQL file
        const sqlPath = path.join(__dirname, '../migrations/create_term_subject_documents.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // รัน migration
        await client.query(sql);
        
        console.log('✅ Migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
