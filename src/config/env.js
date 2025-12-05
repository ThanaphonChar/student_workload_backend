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

    // TU Auth API Configuration
    tuApi: {
        baseUrl: process.env.TU_API_BASE_URL || 'https://restapi.tu.ac.th/api/v1',
        applicationKey: process.env.TU_API_APPLICATION_KEY,
    },
};

// Validate required environment variables
if (!config.tuApi.applicationKey) {
    console.error('❌ ERROR: TU_API_APPLICATION_KEY is required but not set in environment variables');
    console.error('Please add TU_API_APPLICATION_KEY to your .env file');
    process.exit(1);
}

export default config;
