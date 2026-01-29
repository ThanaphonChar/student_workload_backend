import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration
 * Centralized access to environment variables with defaults
 */
const config = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database Configuration
    database: {
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 5432,
        name: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
    },

    // TU Auth API Configuration
    tuApi: {
        authUrl: process.env.TU_API_AUTH_URL,
        instructorsInfoUrl: process.env.TU_API_INSTRUCTORS_INFO_URL,
        applicationKey: process.env.TU_API_APPLICATION_KEY,
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '30d', // 30 days
    },
};

// Validate required environment variables
if (!config.tuApi.applicationKey) {
    console.error('❌ ERROR: TU_API_APPLICATION_KEY is required but not set in environment variables');
    console.error('Please add TU_API_APPLICATION_KEY to your .env file');
    process.exit(1);
}

// Validate database configuration (either URL or individual credentials)
const hasDatabaseUrl = !!config.database.url;
const hasDatabaseCredentials = !!(
    config.database.host &&
    config.database.name &&
    config.database.user &&
    config.database.password
);

if (!hasDatabaseUrl && !hasDatabaseCredentials) {
    console.error('❌ ERROR: Database configuration is required');
    console.error('Please provide either:');
    // console.error('  1. DATABASE_URL (connection string), or');
    console.error('  2. DATABASE_HOST, DATABASE_NAME, DATABASE_USER, and DATABASE_PASSWORD');
    process.exit(1);
}

export default config;
