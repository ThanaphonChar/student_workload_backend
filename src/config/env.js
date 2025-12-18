import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration
 * Centralized access to environment variables with defaults
 */
const config = {
    port: process.env.PORT || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database Configuration
    database: {
        url: process.env.DATABASE_URL,
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

if (!config.database.url) {
    console.error('❌ ERROR: DATABASE_URL is required but not set in environment variables');
    console.error('Please add DATABASE_URL to your .env file');
    process.exit(1);
}

export default config;
