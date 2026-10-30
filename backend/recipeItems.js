const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');
const { RecipeItem } = require('./models');
const { dishFor, recipeItemFor } = require('./access');

module.exports = () => {
  // CREATE recipe item
  router.post('/', requireAuth, async (req, res) => {
    const { dish_id, ingredient_name, cost } = req.body;
    if (!dish_id || !ingredient_name || cost == null) {
      return res.status(400).json({ error: 'dish_id, ingredient_name, cost are required' });
    }
    if (isNaN(cost) || cost < 0) return res.status(400).json({ error: 'Cost must be a non-negative number' });
    try {
      if (!(await dishFor(dish_id, req.user))) return res.status(403).json({ error: 'You do not own this dish' });
      const item = await RecipeItem.create({ dish_id, ingredient_name, cost });
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET recipe items for a dish
  router.get('/dish/:dishId', requireAuth, async (req, res) => {
    try {
      if (!(await dishFor(req.params.dishId, req.user))) return res.status(403).json({ error: 'You do not own this dish' });
      const items = await RecipeItem.find({ dish_id: req.params.dishId }).sort({ ingredient_name: 1 });
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE recipe item
  router.put('/:id', requireAuth, async (req, res) => {
    const { ingredient_name, cost } = req.body;
    if (!ingredient_name || cost == null || isNaN(cost) || cost < 0) {
      return res.status(400).json({ error: 'ingredient_name and a non-negative cost are required' });
    }
    try {
      const item = await recipeItemFor(req.params.id, req.user);
      if (!item) return res.status(404).json({ error: 'Recipe item not found' });
      item.ingredient_name = ingredient_name;
      item.cost = cost;
      await item.save();
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE recipe item (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const item = await recipeItemFor(req.params.id, req.user);
      if (!item) return res.status(404).json({ error: 'Recipe item not found' });
      await item.deleteOne();
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
