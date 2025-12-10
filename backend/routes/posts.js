const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireProfileCompletion } = require('../middleware/auth');

const router = express.Router();

// Create a new post
router.post('/', authenticateToken, requireProfileCompletion, [
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('eventTime').optional().isISO8601().withMessage('Invalid date format'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('location').optional().trim(),
  body('targetPeople').optional().isInt({ min: 1 }).withMessage('Target people must be a positive integer'),
  body('tags').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, eventTime, duration, location, targetPeople, tags } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, event_time, duration, location, target_people, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, content, event_time, duration, location, target_people, tags, created_at`,
      [req.user.userId, content, eventTime || null, duration || null, location || null, targetPeople || null, tags || []]
    );

    res.status(201).json({
      message: 'Post created successfully',
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (feed)
router.get('/', authenticateToken, requireProfileCompletion, async (req, res) => {
  try {
    // Get all posts with author info and check if current user has participated
    const result = await pool.query(
      `SELECT 
        p.id, p.content, p.event_time, p.duration, p.location, p.target_people, p.tags, p.created_at,
        u.id as author_id,
        u.nickname,
        u.avatar_url,
        u.grade,
        u.bio,
        u.tags as author_tags,
        EXISTS(
          SELECT 1 FROM participations 
          WHERE post_id = p.id AND user_id = $1
        ) as has_participated,
        (
          SELECT COUNT(*) FROM participations pa
          WHERE pa.post_id = p.id
        ) as participants_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );

    // Transform data
    const posts = result.rows.map(post => ({
      id: post.id,
      content: post.content,
      eventTime: post.event_time,
      duration: post.duration,
      location: post.location,
      targetPeople: post.target_people,
      tags: post.tags,
      createdAt: post.created_at,
      author: {
        id: post.author_id,
        nickname: post.nickname,
        avatarUrl: post.avatar_url,
        grade: post.grade,
        bio: post.bio,
        tags: post.author_tags
      },
      hasParticipated: post.has_participated,
      participantsCount: post.participants_count
    }));

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single post by ID
router.get('/:id', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT 
        p.id, p.content, p.event_time, p.duration, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.real_name,
        u.avatar_url,
        EXISTS(
          SELECT 1 FROM participations 
          WHERE post_id = p.id AND user_id = $1
        ) as has_participated,
        (
          SELECT COUNT(*) FROM participations pa
          WHERE pa.post_id = p.id
        ) as participants_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $2`,
      [req.user.userId, postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];
    res.json({
      post: {
        id: post.id,
        content: post.content,
        eventTime: post.event_time,
        duration: post.duration,
        location: post.location,
        targetPeople: post.target_people,
        tags: post.tags,
        createdAt: post.created_at,
        author: {
          nickname: post.nickname,
          realName: post.has_participated ? post.real_name : null,
          avatarUrl: post.avatar_url
        },
        hasParticipated: post.has_participated,
        participantsCount: post.participants_count
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Participate in a post
router.post('/:id/participate', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;

  try {
    // Check if post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Insert participation (will fail if already participated due to UNIQUE constraint)
    try {
      await pool.query(
        'INSERT INTO participations (post_id, user_id) VALUES ($1, $2)',
        [postId, req.user.userId]
      );
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Already participated in this post' });
      }
      throw error;
    }

    // Get updated post with real name revealed
    const result = await pool.query(
      `SELECT 
        p.id, p.content, p.event_time, p.duration, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.real_name,
        u.avatar_url,
        (
          SELECT COUNT(*) FROM participations pa
          WHERE pa.post_id = p.id
        ) as participants_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [postId]
    );

    const post = result.rows[0];
    res.json({
      message: 'Successfully participated',
      post: {
        id: post.id,
        content: post.content,
        eventTime: post.event_time,
        duration: post.duration,
        location: post.location,
        targetPeople: post.target_people,
        tags: post.tags,
        createdAt: post.created_at,
        author: {
          nickname: post.nickname,
          realName: post.real_name, // Now revealed
          avatarUrl: post.avatar_url
        },
        hasParticipated: true,
        participantsCount: post.participants_count
      }
    });
  } catch (error) {
    console.error('Participate error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get participants of a post (only if user has participated)
router.get('/:id/participants', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;

  try {
    // Check if current user has participated
    const participationCheck = await pool.query(
      'SELECT 1 FROM participations WHERE post_id = $1 AND user_id = $2',
      [postId, req.user.userId]
    );

    if (participationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must participate to view other participants' });
    }

    // Get all participants
    const result = await pool.query(
      `SELECT u.id, u.nickname, u.avatar_url, u.grade, u.bio, u.tags
       FROM participations pa
       JOIN users u ON pa.user_id = u.id
       WHERE pa.post_id = $1
       ORDER BY pa.participated_at ASC`,
      [postId]
    );

    const participants = result.rows.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatar_url,
      grade: p.grade,
      bio: p.bio,
      tags: p.tags
    }));

    res.json({ participants });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel participation in a post
router.delete('/:id/participate', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;

  try {
    // Remove participation record
    const deleteResult = await pool.query(
      'DELETE FROM participations WHERE post_id = $1 AND user_id = $2 RETURNING id',
      [postId, req.user.userId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(400).json({ error: 'Not participating in this post' });
    }

    // Get updated post after cancellation
    const result = await pool.query(
      `SELECT 
        p.id, p.content, p.event_time, p.duration, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.avatar_url,
        (
          SELECT COUNT(*) FROM participations pa
          WHERE pa.post_id = p.id
        ) as participants_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];
    res.json({
      message: 'Participation cancelled',
      post: {
        id: post.id,
        content: post.content,
        eventTime: post.event_time,
        duration: post.duration,
        location: post.location,
        targetPeople: post.target_people,
        tags: post.tags,
        createdAt: post.created_at,
        author: {
          nickname: post.nickname,
          realName: null,
          avatarUrl: post.avatar_url
        },
        hasParticipated: false,
        participantsCount: post.participants_count
      }
    });
  } catch (error) {
    console.error('Cancel participation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a post (owner or admin only)
router.delete('/:id', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;

  try {
    // Get post and check permissions
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = postResult.rows[0].user_id;

    // Check if user is owner or admin
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;
    const isOwner = postOwnerId === req.user.userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a post (owner or admin only)
router.put('/:id', authenticateToken, requireProfileCompletion, [
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
  body('eventTime').optional().isISO8601().withMessage('Invalid date format'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('location').optional().trim(),
  body('targetPeople').optional().isInt({ min: 1 }).withMessage('Target people must be a positive integer'),
  body('tags').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const postId = req.params.id;
  const { content, eventTime, duration, location, targetPeople, tags } = req.body;

  try {
    // Get post and check permissions
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = postResult.rows[0].user_id;

    // Check if user is owner or admin
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;
    const isOwner = postOwnerId === req.user.userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }
    if (eventTime !== undefined) {
      updates.push(`event_time = $${paramCount++}`);
      values.push(eventTime || null);
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramCount++}`);
      values.push(duration || null);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location || null);
    }
    if (targetPeople !== undefined) {
      updates.push(`target_people = $${paramCount++}`);
      values.push(targetPeople || null);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(postId);
    const result = await pool.query(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({ message: 'Post updated successfully', post: result.rows[0] });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Kick a participant (owner or admin only)
router.delete('/:id/participants/:userId', authenticateToken, requireProfileCompletion, async (req, res) => {
  const postId = req.params.id;
  const targetUserId = parseInt(req.params.userId);

  try {
    // Get post and check permissions
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = postResult.rows[0].user_id;

    // Check if user is owner or admin
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;
    const isOwner = postOwnerId === req.user.userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to kick participants' });
    }

    // Remove participation
    const deleteResult = await pool.query(
      'DELETE FROM participations WHERE post_id = $1 AND user_id = $2 RETURNING id',
      [postId, targetUserId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Kick participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
