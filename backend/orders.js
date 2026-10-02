const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');

module.exports = (pool) => {
  async function verifyOutletOwnership(outletId, userId) {
    const result = await pool.query('SELECT id FROM outlets WHERE id = $1 AND owner_id = $2', [outletId, userId]);
    return result.rows.length > 0;
  }

  // CREATE order
  router.post('/', requireAuth, async (req, res) => {
    const { outlet_id, platform_id, dish_id, order_date, order_value, discount_amount, packaging_cost } = req.body;
    if (!outlet_id || !platform_id || !dish_id || !order_date || order_value == null) {
      return res.status(400).json({ error: 'outlet_id, platform_id, dish_id, order_date, order_value are required' });
    }
    const owns = await verifyOutletOwnership(outlet_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query(
        `INSERT INTO orders (outlet_id, platform_id, dish_id, order_date, order_value, discount_amount, packaging_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [outlet_id, platform_id, dish_id, order_date, order_value, discount_amount || 0, packaging_cost || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET orders for an outlet (basic list, no margin calc yet)
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    const owns = await verifyOutletOwnership(req.params.outletId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query(
        `SELECT o.*, d.name as dish_name, p.name as platform_name
         FROM orders o
         JOIN dishes d ON o.dish_id = d.id
         JOIN platforms p ON o.platform_id = p.id
         WHERE o.outlet_id = $1 ORDER BY o.order_date DESC`,
        [req.params.outletId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};