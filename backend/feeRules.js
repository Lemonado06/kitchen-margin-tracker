const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');

module.exports = (pool) => {
  async function verifyOutletOwnership(outletId, userId) {
    const result = await pool.query('SELECT id FROM outlets WHERE id = $1 AND owner_id = $2', [outletId, userId]);
    return result.rows.length > 0;
  }

  // CREATE fee rule
  router.post('/', requireAuth, async (req, res) => {
    const { outlet_id, platform_id, commission_pct, gst_on_commission_pct } = req.body;
    if (!outlet_id || !platform_id || commission_pct == null) {
      return res.status(400).json({ error: 'outlet_id, platform_id, commission_pct are required' });
    }
    const owns = await verifyOutletOwnership(outlet_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query(
        `INSERT INTO platform_fee_rules (outlet_id, platform_id, commission_pct, gst_on_commission_pct)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        gst_on_commission_pct != null ? gst_on_commission_pct : 18
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET fee rules for an outlet
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    const owns = await verifyOutletOwnership(req.params.outletId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const result = await pool.query(
        `SELECT pfr.*, p.name as platform_name FROM platform_fee_rules pfr
         JOIN platforms p ON pfr.platform_id = p.id
         WHERE pfr.outlet_id = $1`,
        [req.params.outletId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};