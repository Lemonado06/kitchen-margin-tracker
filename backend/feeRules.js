const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');

module.exports = (pool) => {
  async function verifyOutletOwnership(outletId, userId) {
    const result = await pool.query('SELECT id FROM outlets WHERE id = $1 AND owner_id = $2', [outletId, userId]);
    return result.rows.length > 0;
  }

  // Helper: confirm the fee rule belongs to one of this user's outlets
  async function verifyRuleOwnership(ruleId, userId) {
    const result = await pool.query(
      `SELECT pfr.id FROM platform_fee_rules pfr JOIN outlets o ON pfr.outlet_id = o.id WHERE pfr.id = $1 AND o.owner_id = $2`,
      [ruleId, userId]
    );
    return result.rows.length > 0;
  }

  function validPct(value) {
    return value == null || (!isNaN(value) && value >= 0 && value <= 100);
  }

  // CREATE fee rule
  router.post('/', requireAuth, async (req, res) => {
    const { outlet_id, platform_id, commission_pct, gst_on_commission_pct } = req.body;
    if (!outlet_id || !platform_id || commission_pct == null) {
      return res.status(400).json({ error: 'outlet_id, platform_id, commission_pct are required' });
    }
    if (!validPct(commission_pct) || !validPct(gst_on_commission_pct)) {
      return res.status(400).json({ error: 'Percentages must be between 0 and 100' });
    }
    const owns = await verifyOutletOwnership(outlet_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      const existing = await pool.query(
        'SELECT id FROM platform_fee_rules WHERE outlet_id = $1 AND platform_id = $2',
        [outlet_id, platform_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A fee rule for this platform already exists. Edit it instead.' });
      }
      const result = await pool.query(
        `INSERT INTO platform_fee_rules (outlet_id, platform_id, commission_pct, gst_on_commission_pct)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [outlet_id, platform_id, commission_pct, gst_on_commission_pct != null ? gst_on_commission_pct : 18]
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
         WHERE pfr.outlet_id = $1 ORDER BY p.name`,
        [req.params.outletId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE fee rule
  router.put('/:id', requireAuth, async (req, res) => {
    const { commission_pct, gst_on_commission_pct } = req.body;
    if (commission_pct == null || !validPct(commission_pct) || !validPct(gst_on_commission_pct)) {
      return res.status(400).json({ error: 'commission_pct is required and percentages must be between 0 and 100' });
    }
    try {
      const owns = await verifyRuleOwnership(req.params.id, req.user.id);
      if (!owns) return res.status(404).json({ error: 'Fee rule not found' });

      const result = await pool.query(
        'UPDATE platform_fee_rules SET commission_pct = $1, gst_on_commission_pct = $2 WHERE id = $3 RETURNING *',
        [commission_pct, gst_on_commission_pct != null ? gst_on_commission_pct : 18, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE fee rule (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const owns = await verifyRuleOwnership(req.params.id, req.user.id);
      if (!owns) return res.status(404).json({ error: 'Fee rule not found' });

      await pool.query('DELETE FROM platform_fee_rules WHERE id = $1', [req.params.id]);
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
