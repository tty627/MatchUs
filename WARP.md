# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

M@CHUS is a campus social network for ShanghaiTech University students with a unique "reveal mechanism": author real names are only shown after users participate in their posts. This privacy-first design encourages genuine participation while protecting user identity until connections are made.

## Tech Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + React Router
- **Authentication**: JWT with bcrypt password hashing
- **Database**: PostgreSQL with pg driver

## Development Commands

### Initial Setup

```powershell
# Database setup (PostgreSQL must be installed)
# Create database: CREATE DATABASE machus_db;

# Backend setup
cd backend
npm install
# Copy .env.example to .env and configure DB_PASSWORD and JWT_SECRET
npm run migrate   # Create database tables

# Frontend setup
cd frontend
npm install
```

### Running the Application

```powershell
# Start backend (runs on http://localhost:5000)
cd backend
npm run dev      # Development mode with nodemon auto-reload
npm start        # Production mode

# Start frontend (runs on http://localhost:3000)
cd frontend
npm run dev      # Development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
```

### Database Operations

```powershell
# Run database migrations
cd backend
npm run migrate

# Connect to database directly
psql -U postgres -d machus_db

# Reset database (if needed)
# DROP DATABASE machus_db; CREATE DATABASE machus_db;
```

## Architecture

### Authentication Flow

1. **Registration**: Email must match `@shanghaitech.edu.cn` pattern (validated via regex)
2. **JWT Token**: 7-day expiration, stored in localStorage on frontend
3. **Middleware Chain**: `authenticateToken` → `requireProfileCompletion` for protected routes
4. **Profile Gate**: Users must complete profile before accessing feed/posts

### Real Name Reveal Mechanism (Core Feature)

The application's unique privacy feature uses SQL EXISTS subqueries to conditionally reveal author real names:

- **Database Query**: Posts route uses `EXISTS(SELECT 1 FROM participations WHERE post_id = p.id AND user_id = $1)` to check participation status
- **Backend Logic**: Returns `real_name` only when `has_participated` is true
- **Frontend Display**: Conditionally renders real name based on `hasParticipated` flag

This prevents N+1 queries and ensures consistent privacy enforcement at the database level.

### Database Schema

Three main tables with cascading deletes:

- **users**: Stores `profile_completed` boolean gate; `tags` as TEXT[]
- **posts**: References users; `tags` as TEXT[]
- **participations**: Junction table with UNIQUE(post_id, user_id) constraint to prevent duplicate participation

### Frontend Routing

Protected routes use `ProtectedRoute` HOC with two levels:
1. Authentication check (redirects to /login)
2. Profile completion check (redirects to /profile-setup)

AuthContext manages global auth state and provides `user`, `loading`, `register`, `login`, `logout`, `updateUser`.

### API Communication

- Frontend uses Axios with interceptor that auto-attaches JWT token from localStorage
- Vite dev server proxies `/api` requests to `http://localhost:5000`
- API modules organized by domain: `authAPI`, `profileAPI`, `postsAPI`

## File Organization

```
backend/
├── config/database.js        # PostgreSQL pool connection
├── middleware/auth.js        # authenticateToken + requireProfileCompletion
├── routes/
│   ├── auth.js              # Register/login with email validation
│   ├── profile.js           # Profile completion
│   └── posts.js             # CRUD + participate endpoint
├── scripts/migrate.js       # Database table creation
└── server.js                # Express app entry point

frontend/
├── src/
│   ├── context/AuthContext.jsx  # Global auth state management
│   ├── pages/               # Route components (Register, Login, ProfileSetup, Feed)
│   ├── utils/api.js         # Axios instance with JWT interceptor
│   └── App.jsx              # Route definitions with protection HOC
└── vite.config.js           # Port 3000, proxy /api to :5000
```

## Key Implementation Details

### Email Validation
Only `@shanghaitech.edu.cn` emails accepted via regex: `/^[a-zA-Z0-9._%+-]+@shanghaitech\.edu\.cn$/`

### Password Requirements
Minimum 6 characters, hashed with bcrypt (10 salt rounds)

### Participation Logic
- POST `/api/posts/:id/participate` creates participation record
- Duplicate participation blocked by database UNIQUE constraint (returns error code 23505)
- Real name immediately revealed in response after successful participation

### Error Handling
- Express-validator used for input validation on all routes
- Database errors logged to console
- Generic 500 errors sent to client (don't expose internal details)

## Development Notes

- Backend runs on port 5000, frontend on port 3000
- JWT tokens expire after 7 days
- All POST endpoints require completed profile except registration/login
- Array fields (tags) stored as PostgreSQL TEXT[] type
- Timestamps use PostgreSQL TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Frontend uses camelCase, backend snake_case for database fields (transformed in route handlers)
