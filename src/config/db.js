import pg from 'pg';
import config from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool
 * Uses DATABASE_URL from environment (Render.com)
 */
export const pool = new Pool({
    connectionString: config.database.url,
    ssl: {
        rejectUnauthorized: false, // Required for Render and most cloud PostgreSQL instances
    },
});

/**
 * Helper function to execute queries
 * @param {string} text - SQL query string with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('[DB] ⏱️ Query executed:', { duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('[DB] ❌ Query error:', error.message);
        throw error;
    }
}

/**
 * Test database connection
 */
export async function testConnection() {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('[DB] ✅ Database connected successfully at:', result.rows[0].current_time);
        return true;
    } catch (error) {
        console.error('[DB] ❌ Database connection failed:', error.message);
        return false;
    }
}

// Handle pool errors
pool.on('error', (err) => {
    console.error('[DB] ❌ Unexpected pool error:', err);
});

export default pool;
