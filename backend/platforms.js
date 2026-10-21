const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');
const { Platform, Order, FeeRule } = require('./models');
const { validId } = require('./access');

// Case-insensitive exact match, e.g. "zomato" finds "Zomato"
const sameName = (name) => ({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });

module.exports = () => {
  // CREATE platform (owners only, e.g. Magicpin)
  router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      if (await Platform.findOne(sameName(name))) return res.status(409).json({ error: 'Platform already exists' });
      const platform = await Platform.create({ name });
      res.status(201).json(platform);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all platforms
  router.get('/', requireAuth, async (req, res) => {
    try {
      res.json(await Platform.find().sort({ name: 1 }));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE platform (owners only)
  router.put('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const platform = validId(req.params.id) ? await Platform.findByIdAndUpdate(req.params.id, { name }, { returnDocument: 'after' }) : null;
      if (!platform) return res.status(404).json({ error: 'Platform not found' });
      res.json(platform);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE platform (owners only, blocked while orders use it)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      if (!validId(req.params.id)) return res.status(404).json({ error: 'Platform not found' });
      if (await Order.exists({ platform_id: req.params.id })) {
        return res.status(409).json({ error: 'Platform has orders and cannot be deleted' });
      }
      const platform = await Platform.findByIdAndDelete(req.params.id);
      if (!platform) return res.status(404).json({ error: 'Platform not found' });
      await FeeRule.deleteMany({ platform_id: platform._id });
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
