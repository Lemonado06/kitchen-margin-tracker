const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');

module.exports = (pool) => {
  // Helper: confirm the outlet belongs to this user
  async function verifyOutletOwnership(outletId, userId) {
    const result = await pool.query('SELECT id FROM outlets WHERE id = $1 AND owner_id = $2', [outletId, userId]);
    return result.rows.length > 0;
  }

  // CREATE dish
  router.post('/', requireAuth, async (req, res) => {
    const { outlet_id, name, price } = req.body;
    if (!outlet_id || !name || price == null) {
      return res.status(400).json({ error: 'outlet_id, name, and price are required' });
    }
    const owns = await verifyOutletOwnership(outlet_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query(
        'INSERT INTO dishes (outlet_id, name, price) VALUES ($1, $2, $3) RETURNING *',
        [outlet_id, name, price]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all dishes for a specific outlet
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    const owns = await verifyOutletOwnership(req.params.outletId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query('SELECT * FROM dishes WHERE outlet_id = $1 ORDER BY created_at DESC', [req.params.outletId]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE dish
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, price } = req.body;
    try {
      // join to outlets to confirm ownership in one query
      const check = await pool.query(
        `SELECT d.id FROM dishes d JOIN outlets o ON d.outlet_id = o.id WHERE d.id = $1 AND o.owner_id = $2`,
        [req.params.id, req.user.id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });

      const result = await pool.query(
        'UPDATE dishes SET name = $1, price = $2 WHERE id = $3 RETURNING *',
        [name, price, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE dish
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const check = await pool.query(
        `SELECT d.id FROM dishes d JOIN outlets o ON d.outlet_id = o.id WHERE d.id = $1 AND o.owner_id = $2`,
        [req.params.id, req.user.id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });

      await pool.query('DELETE FROM dishes WHERE id = $1', [req.params.id]);
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};