# M@CHUS - Campus Social Network

A campus social network application designed for ShanghaiTech University students. The platform allows students to post events, find activity partners, and connect with fellow students through a unique "reveal mechanism" where real names are only shown after participation.

## Features

### Core Functionality

1. **User Registration & Authentication**
   - Email validation: Only `@shanghaitech.edu.cn` emails are accepted
   - Secure password hashing with bcrypt
   - JWT-based authentication

2. **User Profile & Onboarding**
   - Required fields: Real name (private), Nickname (public), Grade, Gender, Bio, Tags
   - Profile must be completed before accessing the feed
   - Real name remains private until other users participate in your posts

3. **Post Feed**
   - Create posts with content, event time, location, target people, and tags
   - View all posts from other students
   - Posts initially show only the author's nickname

4. **Participation & Reveal Mechanism**
   - Click "Participate" on any post to join
   - After participating, the poster's real name is revealed to you
   - Visual indicator showing participation status

## Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **PostgreSQL** - Relational database
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Axios** - HTTP client

## Project Structure

```
machus-campus-social/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── profile.js            # Profile routes
│   │   └── posts.js              # Posts routes
│   ├── scripts/
│   │   └── migrate.js            # Database migration script
│   ├── .env.example              # Environment variables example
│   ├── package.json
│   └── server.js                 # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Authentication context
│   │   ├── pages/
│   │   │   ├── Register.jsx      # Registration page
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── ProfileSetup.jsx  # Profile completion page
│   │   │   └── Feed.jsx          # Main feed page
│   │   ├── utils/
│   │   │   └── api.js            # API utilities
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # React entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique, must end with @shanghaitech.edu.cn
- `password_hash` - Hashed password
- `real_name` - User's real name (private)
- `nickname` - Public display name
- `grade` - Student grade level
- `gender` - User's gender
- `bio` - Personal bio
- `tags` - Array of interest tags
- `profile_completed` - Boolean flag
- `created_at` - Registration timestamp

### Posts Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `content` - Post content
- `event_time` - Optional event datetime
- `location` - Optional location
- `target_people` - Target number of participants
- `tags` - Array of post tags
- `created_at` - Post creation timestamp

### Participations Table
- `id` - Primary key
- `post_id` - Foreign key to posts
- `user_id` - Foreign key to users
- `participated_at` - Participation timestamp
- Unique constraint on (post_id, user_id)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Database Setup

Install PostgreSQL and create a database:

```bash
# Log into PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE machus_db;

# Exit psql
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env file with your database credentials
# Update DB_PASSWORD and JWT_SECRET

# Run database migration
npm run migrate

# Start the backend server
npm run dev
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Profile
- `GET /api/profile/me` - Get current user profile
- `PUT /api/profile/complete` - Complete user profile

### Posts
- `GET /api/posts` - Get all posts (requires profile completion)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post (requires profile completion)
- `POST /api/posts/:id/participate` - Participate in a post

## Key Implementation Details

### Email Validation
The application enforces strict email validation using regex:
```javascript
const SHANGHAITECH_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@shanghaitech\.edu\.cn$/;
```

### Real Name Reveal Logic
The backend uses SQL EXISTS to check participation status:
```sql
SELECT 
  u.nickname,
  u.real_name,
  EXISTS(
    SELECT 1 FROM participations 
    WHERE post_id = p.id AND user_id = $1
  ) as has_participated
FROM posts p
JOIN users u ON p.user_id = u.id
```

The frontend conditionally renders the real name:
```javascript
{post.hasParticipated && post.author.realName && (
  <span>(Real name: {post.author.realName})</span>
)}
```

## Development Notes

- The backend uses JWT tokens stored in localStorage for authentication
- All API calls include the JWT token in the Authorization header
- Profile completion is enforced through middleware before accessing protected routes
- Password minimum length is 6 characters
- All timestamps are stored in PostgreSQL TIMESTAMP format

## Future Enhancements

- Direct messaging between participants
- Post search and filtering
- User profiles page
- Notification system
- Post comments
- Image uploads
- Email verification
- Password reset functionality

## License

MIT

## Author

Created for ShanghaiTech University Campus Social Network MVP

# M@CHUS
**使命：**让每一个需求可以被即时满足  **愿景：**通过构建即时交流平台，在任何时间任何地点，组建“小圈子”、“搭子”等，解决个人或者单个群体无法解决的问题  **应用场景：**个人用户/群体用户  1）技能技术类指导；  2）陪同性陪伴性需求满足等。
