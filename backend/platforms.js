const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');

module.exports = (pool) => {
  // CREATE platform (owners only, e.g. seed Zomato, Swiggy once)
  router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const existing = await pool.query('SELECT id FROM platforms WHERE LOWER(name) = LOWER($1)', [name]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Platform already exists' });

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

  // UPDATE platform (owners only)
  router.put('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const result = await pool.query('UPDATE platforms SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Platform not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE platform (owners only, blocked while orders use it)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const used = await pool.query('SELECT 1 FROM orders WHERE platform_id = $1 LIMIT 1', [req.params.id]);
      if (used.rows.length > 0) return res.status(409).json({ error: 'Platform has orders and cannot be deleted' });

      const result = await pool.query('DELETE FROM platforms WHERE id = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Platform not found' });
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
