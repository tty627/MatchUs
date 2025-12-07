const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, real_name, nickname, grade, gender, bio, tags, profile_completed FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete/Update profile
router.put('/complete', authenticateToken, [
  body('realName').trim().notEmpty().withMessage('Real name is required'),
  body('nickname').trim().notEmpty().withMessage('Nickname is required'),
  body('grade').trim().notEmpty().withMessage('Grade is required'),
  body('gender').trim().notEmpty().withMessage('Gender is required'),
  body('bio').trim().notEmpty().withMessage('Bio is required'),
  body('tags').isArray({ min: 1 }).withMessage('At least one tag is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { realName, nickname, grade, gender, bio, tags } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET real_name = $1, nickname = $2, grade = $3, gender = $4, bio = $5, tags = $6, profile_completed = TRUE
       WHERE id = $7
       RETURNING id, email, real_name, nickname, grade, gender, bio, tags, profile_completed`,
      [realName, nickname, grade, gender, bio, tags, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile completed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
