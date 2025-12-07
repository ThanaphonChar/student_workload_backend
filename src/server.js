import app from './app.js';
import config from './config/env.js';
import { testConnection } from './config/db.js';

/**
 * Server bootstrap
 * Starts the Express application and tests database connection
 */

const PORT = config.port;

// Test database connection before starting server
async function startServer() {
    console.log('🔄 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('⚠️  Server starting without database connection');
    }

    app.listen(PORT, () => {
        console.log(`✅ Server is running on port ${PORT}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
        console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
        console.log(`📚 Subjects API: http://localhost:${PORT}/api/subjects`);
    });
}

startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
