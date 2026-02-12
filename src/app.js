import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

/**
 * Express application configuration
 * Sets up middlewares and routes
 */

const app = express();

// Middleware: CORS Configuration
// ต้องอยู่ก่อน middleware อื่นๆ เพื่อรองรับ preflight OPTIONS request
app.use(cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight OPTIONS requests สำหรับทุก routes
app.options('*', cors());

/**
 * Middleware: JSON Parser
 * 
 * ใช้ type: 'application/json' เพื่อจำกัดให้ parse เฉพาะ JSON content-type
 * ถ้าเป็น multipart/form-data จะ skip ไป (ให้ multer handle)
 * 
 * นี่คือ best practice สำหรับ production Express apps
 */
app.use(express.json({
    type: 'application/json',
    limit: '50mb'
}));

/**
 * Middleware: URL-encoded Parser
 * สำหรับ form submissions (application/x-www-form-urlencoded)
 */
app.use(express.urlencoded({ 
    extended: true, 
    limit: '50mb' 
}));

// Mount API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Student Workload Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: {
                login: '/api/auth/login',
            },
            subjects: {
                getAll: 'GET /api/subjects',
                getById: 'GET /api/subjects/:id',
                create: 'POST /api/subjects',
                update: 'PUT /api/subjects/:id',
                delete: 'DELETE /api/subjects/:id',
            },
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    console.error(err.stack);

    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

export default app;
