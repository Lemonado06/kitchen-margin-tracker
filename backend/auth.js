const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (pool) => {
  // REGISTER
  router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        [name, email, password_hash, role]
      );
      res.status(201).json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // LOGIN
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};