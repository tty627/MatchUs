const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireProfileCompletion } = require('../middleware/auth');

const router = express.Router();

// Create a new post
router.post('/', authenticateToken, requireProfileCompletion, [
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('eventTime').optional().isISO8601().withMessage('Invalid date format'),
  body('location').optional().trim(),
  body('targetPeople').optional().isInt({ min: 1 }).withMessage('Target people must be a positive integer'),
  body('tags').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, eventTime, location, targetPeople, tags } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, event_time, location, target_people, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, content, event_time, location, target_people, tags, created_at`,
      [req.user.userId, content, eventTime || null, location || null, targetPeople || null, tags || []]
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
        p.id, p.content, p.event_time, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.real_name,
        EXISTS(
          SELECT 1 FROM participations 
          WHERE post_id = p.id AND user_id = $1
        ) as has_participated
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );

    // Transform data to conditionally include real_name based on participation
    const posts = result.rows.map(post => ({
      id: post.id,
      content: post.content,
      eventTime: post.event_time,
      location: post.location,
      targetPeople: post.target_people,
      tags: post.tags,
      createdAt: post.created_at,
      author: {
        nickname: post.nickname,
        // Only reveal real name if user has participated
        realName: post.has_participated ? post.real_name : null
      },
      hasParticipated: post.has_participated
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
        p.id, p.content, p.event_time, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.real_name,
        EXISTS(
          SELECT 1 FROM participations 
          WHERE post_id = p.id AND user_id = $1
        ) as has_participated
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
        location: post.location,
        targetPeople: post.target_people,
        tags: post.tags,
        createdAt: post.created_at,
        author: {
          nickname: post.nickname,
          realName: post.has_participated ? post.real_name : null
        },
        hasParticipated: post.has_participated
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
        p.id, p.content, p.event_time, p.location, p.target_people, p.tags, p.created_at,
        u.nickname,
        u.real_name
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
        location: post.location,
        targetPeople: post.target_people,
        tags: post.tags,
        createdAt: post.created_at,
        author: {
          nickname: post.nickname,
          realName: post.real_name // Now revealed
        },
        hasParticipated: true
      }
    });
  } catch (error) {
    console.error('Participate error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
