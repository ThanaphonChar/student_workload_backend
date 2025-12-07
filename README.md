# Student Workload Backend API

Backend API for the Student Workload Management System built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- ✅ **Authentication** - TU Auth integration with JWT tokens
- ✅ **Subject Management** - Full CRUD operations for course subjects
- ✅ **PostgreSQL Database** - Hosted on Render.com
- ✅ **Clean Architecture** - Separation of concerns (routes → controllers → services)
- ✅ **Protected Routes** - JWT middleware for secure endpoints
- ✅ **Soft Delete** - Data preservation with `is_active` flag
- ✅ **Query Filters** - Filter subjects by program, year, and status

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database on Render.com
- TU API Application Key

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/ThanaphonChar/student_workload_backend.git
cd student_workload_backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
PORT=4000
DATABASE_URL=postgres://admin:PASSWORD@HOST:5432/dbstudent_56yu?sslmode=require
TU_API_APPLICATION_KEY=your_tu_api_key_here
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=30d
```

4. **Run database migration**
```bash
node database/run-migration.js
```

## 🏃‍♂️ Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:4000`

## 📁 Project Structure

```
student_workload_backend/
├── src/
│   ├── config/
│   │   ├── env.js              # Environment configuration
│   │   └── db.js               # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── auth.controller.js  # Authentication handlers
│   │   ├── health.controller.js
│   │   └── subject.controller.js # Subject CRUD handlers
│   ├── services/
│   │   ├── tuAuth.service.js   # TU Auth API integration
│   │   └── subject.service.js  # Database operations for subjects
│   ├── routes/
│   │   ├── index.js            # Route aggregator
│   │   ├── auth.route.js
│   │   ├── health.route.js
│   │   └── subject.route.js    # Subject endpoints
│   ├── middlewares/
│   │   └── auth.middleware.js  # JWT verification
│   ├── app.js                  # Express app configuration
│   └── server.js               # Server bootstrap
├── database/
│   ├── migrations/
│   │   └── 001_init_schema.sql # Database schema
│   ├── run-migration.js        # Migration runner
│   └── README.md               # Database setup guide
├── docs/
│   └── SUBJECT_API.md          # API documentation
├── .env.example
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Root
- `GET /` - API information and endpoints list

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/login` - Login with TU credentials
  - Returns JWT token valid for 30 days

### Subjects (Protected - requires JWT)
- `POST /api/subjects` - Create a new subject
- `GET /api/subjects` - Get all subjects (with optional filters)
- `GET /api/subjects/:id` - Get subject by ID
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Soft delete subject

📖 **Full API Documentation:** [docs/SUBJECT_API.md](docs/SUBJECT_API.md)

## 🗄️ Database Schema

### Tables

**programs**
- Stores academic program information
- Fields: `id`, `program_year`, `created_at`, `updated_at`

**student_years**
- Stores student year levels (1-4)
- Fields: `id`, `student_year`, `created_at`, `updated_at`

**subjects**
- Main table for course subjects
- Fields: `id`, `code_th`, `code_eng`, `name_th`, `name_eng`, `program_id`, `credit`, `outline`, `student_year_id`, `count_workload`, `is_active`, `created_at`, `updated_at`
- Foreign keys to `programs` and `student_years`

📖 **Database Documentation:** [database/README.md](database/README.md)

## 🔐 Authentication Flow

1. **Login** - POST credentials to `/api/auth/login`
2. **Receive Token** - Get JWT token in response
3. **Use Token** - Include in Authorization header: `Bearer YOUR_TOKEN`
4. **Access Protected Routes** - All `/api/subjects` endpoints require token

## 🧪 Testing

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'
```

**Create Subject:**
```bash
curl -X POST http://localhost:4000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code_th": "SC101",
    "name_th": "Computer Science 101",
    "program_id": 1,
    "student_year_id": 1,
    "credit": 3
  }'
```

**Get All Subjects:**
```bash
curl -X GET http://localhost:4000/api/subjects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📦 Dependencies

### Core
- `express` - Web framework
- `pg` - PostgreSQL client
- `jsonwebtoken` - JWT authentication
- `axios` - HTTP client for TU Auth API
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Development
- `nodemon` - Auto-reload during development

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `TU_API_BASE_URL` | TU Auth API base URL | No (has default) |
| `TU_API_APPLICATION_KEY` | TU API access token | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | No (default: 30d) |

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (auth required)
- `404` - Not Found
- `500` - Server Error

## 🎯 Key Features

### Soft Delete
Subjects are never physically deleted. Instead, `is_active` is set to `false`, preserving data integrity.

### Query Filtering
Filter subjects by:
- `program_id` - Filter by academic program
- `student_year_id` - Filter by student year
- `is_active` - Show only active/inactive subjects

### Auto Timestamps
Database triggers automatically update `updated_at` field on every modification.

### JWT Token
- 30-day expiration
- Includes user info (username, type, email)
- Verified on every protected route

## 📝 License

ISC

## 👥 Author

Thammasat University - Faculty of Science and Technology

## 🔗 Related Repositories

- Frontend: [student_workload_frontend](https://github.com/ThanaphonChar/student_workload_frontend)
