
const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('./middleware');
const { Outlet, Dish, RecipeItem, FeeRule, Order } = require('./models');
const { outletFor } = require('./access');
const { recordActivity } = require('./audit');

module.exports = () => {

  // CREATE outlet
  // Stored under the account owner so managers and owner share it.
  router.post('/', requireAuth, async (req, res) => {
    const { name, city } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      const outlet = await Outlet.create({
        owner_id: req.user.accountId,
        name,
        city: city || null
      });

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CREATE',
        module: 'OUTLETS',
        description: `Created outlet: ${outlet.name}`,
        entityId: outlet.id,
        outletId: outlet.id,
      });

      res.status(201).json(outlet);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // GET all outlets for the logged-in user's account
  router.get('/', requireAuth, async (req, res) => {
    try {
      const outlets = await Outlet.find({
        owner_id: req.user.accountId
      }).sort({ created_at: -1 });

      res.json(outlets);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE outlet
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, city } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      const outlet = await outletFor(req.params.id, req.user);

      if (!outlet) {
        return res.status(404).json({ error: 'Outlet not found' });
      }

      const nameChanged = outlet.name !== name;
      const cityChanged = (outlet.city || null) !== (city || null);

      outlet.name = name;
      outlet.city = city || null;

      await outlet.save();

      if (nameChanged || cityChanged) {
        const changes = [];

        if (nameChanged) changes.push('name');
        if (cityChanged) changes.push('city');

        await recordActivity({
          accountId: req.user.accountId,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'UPDATE',
          module: 'OUTLETS',
          description: `Updated outlet: ${outlet.name} (${changes.join(', ')})`,
          entityId: outlet.id,
          outletId: outlet.id,
        });
      }

      res.json(outlet);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // DELETE outlet (owners only), along with its dishes,
  // recipe items, fee rules and orders.
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const outlet = await outletFor(req.params.id, req.user);

      if (!outlet) {
        return res.status(404).json({ error: 'Outlet not found' });
      }

      // Capture details before deleting the outlet.
      const deletedOutletId = outlet.id;
      const deletedOutletName = outlet.name;

      const dishIds = await Dish.find({
        outlet_id: outlet._id
      }).distinct('_id');

      await Order.deleteMany({
        outlet_id: outlet._id
      });

      await RecipeItem.deleteMany({
        dish_id: { $in: dishIds }
      });

      await Dish.deleteMany({
        outlet_id: outlet._id
      });

      await FeeRule.deleteMany({
        outlet_id: outlet._id
      });

      await outlet.deleteOne();

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DELETE',
        module: 'OUTLETS',
        description: `Deleted outlet and its associated data: ${deletedOutletName}`,
        entityId: deletedOutletId,
        outletId: deletedOutletId,
      });

      res.json({ deleted: true });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  return router;
};
