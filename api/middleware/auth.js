const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const redis = require('../utils/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

// Regular user authentication middleware (via HTTP-only cookie or Authorization header fallback)
const authRequired = async (req, res, next) => {
  try {
    let token;

    // A. Try reading cookie
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const tokenCookie = cookieHeader.split(';').map(c => c.trim()).find(row => row.startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.substring(6);
      }
    }

    // B. Try reading Authorization header (handy fallback for development & API testing)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Ensure this is not an admin token being used for user endpoints
    if (decoded.aud === 'admin-panel') {
      return res.status(403).json({ error: 'Forbidden: admin account cannot access user routes' });
    }

    // Fast ban check using Redis cache, falling back to Mongo
    const banKey = `banned:${decoded.id}`;
    let isBanned = await redis.get(banKey);
    if (isBanned === null || isBanned === undefined) {
      const user = await User.findById(decoded.id).select('banned').lean();
      if (!user) {
        return res.status(401).json({ error: 'User account not found' });
      }
      isBanned = user.banned ? '1' : '0';
      await redis.set(banKey, isBanned, { EX: 300 });
    }

    if (isBanned === '1' || isBanned === true) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin authentication middleware (via Authorization Bearer header)
const adminAuthRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify audience claim
    if (decoded.aud !== 'admin-panel') {
      return res.status(403).json({ error: 'Invalid token audience' });
    }

    // Verify admin exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.active) {
      return res.status(403).json({ error: 'Admin account is inactive or does not exist' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
};

module.exports = {
  authRequired,
  adminAuthRequired,
  JWT_SECRET
};
