const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');

module.exports = (pool) => {
  // CREATE platform (e.g. seed Zomato, Swiggy once)
  router.post('/', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const result = await pool.query('INSERT INTO platforms (name) VALUES ($1) RETURNING *', [name]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all platforms
  router.get('/', requireAuth, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM platforms ORDER BY name');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};