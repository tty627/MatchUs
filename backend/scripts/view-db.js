const pool = require('../config/database');

async function viewDatabase() {
  try {
    console.log('=== Viewing Database ===\n');

    // View all users
    console.log('--- USERS ---');
    const usersResult = await pool.query(`
      SELECT 
        id, 
        email, 
        real_name, 
        nickname, 
        grade, 
        gender, 
        bio, 
        tags, 
        avatar_url,
        profile_completed, 
        created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    console.table(usersResult.rows);

    // View all posts
    console.log('\n--- POSTS ---');
    const postsResult = await pool.query(`
      SELECT 
        p.id,
        p.content,
        u.nickname as author_nickname,
        u.real_name as author_real_name,
        p.event_time,
        p.location,
        p.target_people,
        p.tags,
        p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    console.table(postsResult.rows);

    // View all participations
    console.log('\n--- PARTICIPATIONS ---');
    const participationsResult = await pool.query(`
      SELECT 
        pa.id,
        pa.post_id,
        p.content as post_content,
        u.nickname as participant_nickname,
        pa.participated_at
      FROM participations pa
      JOIN posts p ON pa.post_id = p.id
      JOIN users u ON pa.user_id = u.id
      ORDER BY pa.participated_at DESC
    `);
    console.table(participationsResult.rows);

    // Summary statistics
    console.log('\n--- STATISTICS ---');
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM participations) as total_participations
    `);
    console.table(stats.rows);

  } catch (error) {
    console.error('Error viewing database:', error.message);
  } finally {
    await pool.end();
  }
}

viewDatabase();
