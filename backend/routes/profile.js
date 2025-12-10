const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Avatar upload config
const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.user.userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, real_name, nickname, grade, gender, bio, tags, avatar_url, profile_completed, is_admin FROM users WHERE id = $1',
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
  body('tags').isArray({ min: 1 }).withMessage('At least one tag is required'),
  body('avatarUrl').optional().isString().withMessage('Avatar URL must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { realName, nickname, grade, gender, bio, tags, avatarUrl } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET real_name = $1, nickname = $2, grade = $3, gender = $4, bio = $5, tags = $6, avatar_url = $7, profile_completed = TRUE
       WHERE id = $8
       RETURNING id, email, real_name, nickname, grade, gender, bio, tags, avatar_url, profile_completed`,
      [realName, nickname, grade, gender, bio, tags, avatarUrl || null, req.user.userId]
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

// Upload avatar image
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE users 
       SET avatar_url = $1
       WHERE id = $2
       RETURNING id, email, real_name, nickname, grade, gender, bio, tags, avatar_url, profile_completed`,
      [avatarUrl, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete current user's account
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    // 删除用户，依赖数据库中的 ON DELETE CASCADE 清理相关数据（帖子、参与记录、重置/验证 token 等）
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
