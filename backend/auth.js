
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { User } = require('./models');
const { recordActivity } = require('./audit');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = () => {
  // REGISTER: public sign-up creates an owner account
  router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (role && role !== 'owner') {
      return res.status(400).json({
        error: 'Managers are added by an owner from the Team page',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    try {
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (existing) {
        return res.status(409).json({
          error: 'Email already registered',
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password_hash,
        role: 'owner',
      });

      res.status(201).json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // LOGIN
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      const valid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!valid) {
        await recordActivity({
          accountId: user.role === 'owner'
            ? user.id
            : user.owner_id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'LOGIN_FAILED',
          module: 'AUTH',
          description: 'Failed login attempt',
        });

        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      // Record successful login
      await recordActivity({
        accountId: user.role === 'owner'
          ? user.id
          : user.owner_id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN',
        module: 'AUTH',
        description: 'Logged in successfully',
      });

      res.json({
        token: signToken(user),
        user,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
