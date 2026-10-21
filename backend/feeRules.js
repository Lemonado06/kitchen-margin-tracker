const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');
const { FeeRule, Platform } = require('./models');
const { validId, outletFor, feeRuleFor } = require('./access');

module.exports = () => {
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
    try {
      if (!(await outletFor(outlet_id, req.user))) return res.status(403).json({ error: 'You do not own this outlet' });
      if (!validId(platform_id) || !(await Platform.exists({ _id: platform_id }))) {
        return res.status(400).json({ error: 'Platform not found' });
      }
      if (await FeeRule.exists({ outlet_id, platform_id })) {
        return res.status(409).json({ error: 'A fee rule for this platform already exists. Edit it instead.' });
      }
      const rule = await FeeRule.create({
        outlet_id,
        platform_id,
        commission_pct,
        gst_on_commission_pct: gst_on_commission_pct != null ? gst_on_commission_pct : 18,
      });
      res.status(201).json(rule);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET fee rules for an outlet, with the platform name
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    try {
      if (!(await outletFor(req.params.outletId, req.user))) return res.status(403).json({ error: 'You do not own this outlet' });
      const rules = await FeeRule.find({ outlet_id: req.params.outletId }).populate('platform_id', 'name');
      res.json(rules
        .map((r) => ({ ...r.toJSON(), platform_id: r.platform_id.id, platform_name: r.platform_id.name }))
        .sort((a, b) => a.platform_name.localeCompare(b.platform_name)));
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
      const rule = await feeRuleFor(req.params.id, req.user);
      if (!rule) return res.status(404).json({ error: 'Fee rule not found' });
      rule.commission_pct = commission_pct;
      rule.gst_on_commission_pct = gst_on_commission_pct != null ? gst_on_commission_pct : 18;
      await rule.save();
      res.json(rule);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE fee rule (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const rule = await feeRuleFor(req.params.id, req.user);
      if (!rule) return res.status(404).json({ error: 'Fee rule not found' });
      await rule.deleteOne();
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
