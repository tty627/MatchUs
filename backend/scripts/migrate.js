const pool = require('../config/database');

const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        real_name VARCHAR(100),
        nickname VARCHAR(100),
        grade VARCHAR(50),
        gender VARCHAR(20),
        bio TEXT,
        tags TEXT[],
        avatar_url TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email_verified BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✓ Users table created');

    // Ensure email_verified column exists (for existing databases)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ Users.email_verified column ensured');

    // Ensure avatar_url column exists (for existing databases)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url TEXT
    `);
    console.log('✓ Users.avatar_url column ensured');

    // Ensure is_admin column exists
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ Users.is_admin column ensured');

    // Set admin for specific email
    await pool.query(`
      UPDATE users SET is_admin = TRUE WHERE email = 'tanty2025@shanghaitech.edu.cn'
    `);
    console.log('✓ Admin user configured');

    // Posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        event_time TIMESTAMP,
        duration INTEGER,
        location VARCHAR(255),
        target_people INTEGER,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Posts table created');

    // Ensure duration column exists (for existing databases)
    await pool.query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS duration INTEGER
    `);
    console.log('✓ Posts.duration column ensured');

    // Participations table (tracks who participated in which posts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS participations (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        participated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);
    console.log('✓ Participations table created');

    // Password reset tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Password reset tokens table created');

    // Email verification tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Email verification tokens table created');

    console.log('\n✅ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

createTables();
