const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');

module.exports = (pool) => {
  // CREATE outlet
  router.post('/', requireAuth, async (req, res) => {
    const { name, city } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const result = await pool.query(
        'INSERT INTO outlets (owner_id, name, city) VALUES ($1, $2, $3) RETURNING *',
        [req.user.id, name, city || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all outlets for logged-in user
  router.get('/', requireAuth, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM outlets WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE outlet
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, city } = req.body;
    try {
      const result = await pool.query(
        'UPDATE outlets SET name = $1, city = $2 WHERE id = $3 AND owner_id = $4 RETURNING *',
        [name, city, req.params.id, req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Outlet not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE outlet
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM outlets WHERE id = $1 AND owner_id = $2 RETURNING *', [req.params.id, req.user.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Outlet not found' });
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};