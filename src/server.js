import app from './app.js';
import config from './config/env.js';

/**
 * Server bootstrap
 * Starts the Express application
 */

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
});
