const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireProfileCompletion = async (req, res, next) => {
  const pool = require('../config/database');
  
  try {
    const result = await pool.query(
      'SELECT profile_completed FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!result.rows[0].profile_completed) {
      return res.status(403).json({ 
        error: 'Profile must be completed before accessing this resource',
        profileCompleted: false 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { authenticateToken, requireProfileCompletion };
