const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

const router = express.Router();

// 限流配置：注册接口 - 每个 IP 每 15 分钟最多 5 次
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5,
  message: { error: '操作过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 限流配置：忘记密码接口 - 每个 IP 每 15 分钟最多 3 次
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: '操作过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.126.com',
  port: Number(process.env.MAIL_PORT) || 465,
  secure: true, // 465 端口使用 SSL
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Email validation regex for @shanghaitech.edu.cn
const SHANGHAITECH_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@shanghaitech\.edu\.cn$/;

// Register endpoint - now sends verification email instead of auto login
router.post('/register', registerLimiter, [
  body('email').custom((value) => {
    if (!SHANGHAITECH_EMAIL_REGEX.test(value)) {
      throw new Error('Email must be a valid @shanghaitech.edu.cn address');
    }
    return true;
  }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, avatarUrl } = req.body;

  try {
    // Check if user already exists
    const userCheck = await pool.query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      // 如果已经存在且已验证邮箱，直接提示已注册
      if (userCheck.rows[0].email_verified) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // 检查最近一封验证邮件的发送时间（防止邮件轰炸）
      const recentToken = await pool.query(
        `SELECT created_at FROM email_verification_tokens 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '2 minutes'
         ORDER BY created_at DESC LIMIT 1`,
        [userCheck.rows[0].id]
      );
      
      if (recentToken.rows.length > 0) {
        return res.status(429).json({ error: '验证邮件已发送，请 2 分钟后再试' });
      }
      
      // 超过冷却时间，允许重新发送验证邮件
      return res.status(400).json({ error: 'Email already registered, please check your inbox for verification mail' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (email_verified 默认 false)
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, avatar_url) VALUES ($1, $2, $3) RETURNING id, email, avatar_url, profile_completed, email_verified',
      [email, passwordHash, avatarUrl || null]
    );

    const user = result.rows[0];

    // Generate email verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendBase}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`Email verification link for ${email}: ${verifyUrl}`);

    try {
      await mailTransporter.sendMail({
        from: `"M@CHUS" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'M@CHUS 邮箱验证',
        text: `欢迎注册 M@CHUS！请点击以下链接验证你的邮箱：\n\n${verifyUrl}\n\n如果这不是你本人操作，请忽略此邮件。`,
        html: `<p>欢迎注册 M@CHUS！请点击以下链接验证你的邮箱：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>如果这不是你本人操作，请忽略此邮件。</p>`,
      });
    } catch (mailError) {
      console.error('Send verification email error:', mailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.status(201).json({
      message: 'Registration successful, please check your email to verify your account',
      user: {
        id: user.id,
        email: user.email,
        avatar_url: user.avatar_url,
        profile_completed: user.profile_completed,
        email_verified: user.email_verified,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, avatar_url, profile_completed, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox for verification link.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        avatar_url: user.avatar_url,
        profile_completed: user.profile_completed
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Forgot password - request reset link
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    // 始终返回 200，避免暴露邮箱是否存在
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const user = userResult.rows[0];

    // 删除旧的重置记录
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBase}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // 仍然在日志中打印链接，方便开发调试
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    try {
      await mailTransporter.sendMail({
        from: `"M@CHUS" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'M@CHUS 密码重置',
        text: `你正在重置 M@CHUS 账户密码，请点击以下链接完成操作：\n\n${resetUrl}\n\n如果这不是你本人操作，请忽略此邮件。`,
        html: `<p>你正在重置 M@CHUS 账户密码，请点击以下链接完成操作：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>如果这不是你本人操作，请忽略此邮件。</p>`,
      });
    } catch (mailError) {
      console.error('Send reset email error:', mailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
});

// Reset password - use token to set new password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid token or email' });
    }

    const userId = userResult.rows[0].id;

    const tokenResult = await pool.query(
      `SELECT id, expires_at, used FROM password_reset_tokens
       WHERE user_id = $1 AND token = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const resetRecord = tokenResult.rows[0];

    if (resetRecord.used || new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRecord.id]);

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Verify email - user clicks link from email
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({ error: 'Invalid verification link' });
  }

  try {
    const userResult = await pool.query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification link' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.json({ message: 'Email already verified' });
    }

    const tokenResult = await pool.query(
      `SELECT id, expires_at, used FROM email_verification_tokens
       WHERE user_id = $1 AND token = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const verifyRecord = tokenResult.rows[0];

    if (verifyRecord.used || new Date(verifyRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);
    await pool.query('UPDATE email_verification_tokens SET used = TRUE WHERE id = $1', [verifyRecord.id]);

    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Server error during email verification' });
  }
});

module.exports = router;
