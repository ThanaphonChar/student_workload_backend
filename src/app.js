import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

/**
 * Express application configuration
 * Sets up middlewares and routes
 */

const app = express();

// Middleware: Parse JSON bodies
app.use(express.json());

// Middleware: Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Middleware: Enable CORS
app.use(cors());

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
            admin: {
                syncProfessors: 'POST /api/admin/sync-professors',
                validateDb: 'GET /api/admin/validate-db',
            },
        },
    });
});

export default app;
