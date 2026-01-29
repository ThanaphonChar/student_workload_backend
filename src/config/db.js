import pg from 'pg';
import config from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool
 * Supports both connection string (DATABASE_URL) and individual credentials
 */
const poolConfig = config.database.url
    ? {
        // Use connection string if available (e.g., for Render.com)
        connectionString: config.database.url,
        ssl: {
            rejectUnauthorized: false,
        },
    }
    : {
        // Use individual credentials
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: false, // Set to true if your database requires SSL
    };

export const pool = new Pool(poolConfig);

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

// Handle Pool Errors Gracefully
pool.on('error', (err) => {
    console.error('[DB] ❌ Unexpected pool error:', err);
});

export default pool;
