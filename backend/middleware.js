const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('./models');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  // Look the user up on every request so removed managers and role changes take effect immediately
  const user = mongoose.isValidObjectId(decoded.id) ? await User.findById(decoded.id) : null;
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  req.user = {
    id: user.id,
    name: user.name,
    role: user.role,
    // the owner whose outlets this user works on (managers share their owner's data)
    accountId: user.role === 'owner' ? user.id : user.owner_id.toString(),
  };
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
