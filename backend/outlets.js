const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');
const { Outlet, Dish, RecipeItem, FeeRule, Order } = require('./models');
const { outletFor } = require('./access');

module.exports = () => {
  // CREATE outlet (stored under the account owner so managers and owner share it)
  router.post('/', requireAuth, async (req, res) => {
    const { name, city } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const outlet = await Outlet.create({ owner_id: req.user.accountId, name, city: city || null });
      res.status(201).json(outlet);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all outlets for the logged-in user's account
  router.get('/', requireAuth, async (req, res) => {
    try {
      const outlets = await Outlet.find({ owner_id: req.user.accountId }).sort({ created_at: -1 });
      res.json(outlets);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE outlet
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, city } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const outlet = await outletFor(req.params.id, req.user);
      if (!outlet) return res.status(404).json({ error: 'Outlet not found' });
      outlet.name = name;
      outlet.city = city || null;
      await outlet.save();
      res.json(outlet);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE outlet (owners only), along with its dishes, recipe items, fee rules and orders
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const outlet = await outletFor(req.params.id, req.user);
      if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

      const dishIds = await Dish.find({ outlet_id: outlet._id }).distinct('_id');
      await Order.deleteMany({ outlet_id: outlet._id });
      await RecipeItem.deleteMany({ dish_id: { $in: dishIds } });
      await Dish.deleteMany({ outlet_id: outlet._id });
      await FeeRule.deleteMany({ outlet_id: outlet._id });
      await outlet.deleteOne();
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
