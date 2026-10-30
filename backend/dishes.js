const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');
const { Dish, RecipeItem, Order } = require('./models');
const { outletFor, dishFor } = require('./access');

module.exports = () => {
  // CREATE dish
  router.post('/', requireAuth, async (req, res) => {
    const { outlet_id, name, price } = req.body;
    if (!outlet_id || !name || price == null) {
      return res.status(400).json({ error: 'outlet_id, name, and price are required' });
    }
    if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Price must be a positive number' });
    try {
      if (!(await outletFor(outlet_id, req.user))) return res.status(403).json({ error: 'You do not own this outlet' });
      const dish = await Dish.create({ outlet_id, name, price });
      res.status(201).json(dish);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all dishes for a specific outlet
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    try {
      if (!(await outletFor(req.params.outletId, req.user))) return res.status(403).json({ error: 'You do not own this outlet' });
      const dishes = await Dish.find({ outlet_id: req.params.outletId }).sort({ created_at: -1 });
      res.json(dishes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE dish
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, price } = req.body;
    if (!name || price == null || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Name and a positive price are required' });
    }
    try {
      const dish = await dishFor(req.params.id, req.user);
      if (!dish) return res.status(404).json({ error: 'Dish not found' });
      dish.name = name;
      dish.price = price;
      await dish.save();
      res.json(dish);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE dish (owners only), along with its orders and recipe items
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const dish = await dishFor(req.params.id, req.user);
      if (!dish) return res.status(404).json({ error: 'Dish not found' });
      await Order.deleteMany({ dish_id: dish._id });
      await RecipeItem.deleteMany({ dish_id: dish._id });
      await dish.deleteOne();
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
