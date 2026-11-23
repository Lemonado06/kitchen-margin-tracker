
const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('./middleware');
const { RecipeItem } = require('./models');
const { dishFor, recipeItemFor } = require('./access');
const { recordActivity } = require('./audit');

module.exports = () => {

  // CREATE recipe item
  router.post('/', requireAuth, async (req, res) => {
    const { dish_id, ingredient_name, cost } = req.body;

    if (!dish_id || !ingredient_name || cost == null) {
      return res.status(400).json({
        error: 'dish_id, ingredient_name, cost are required'
      });
    }

    if (isNaN(cost) || cost < 0) {
      return res.status(400).json({
        error: 'Cost must be a non-negative number'
      });
    }

    try {
      const dish = await dishFor(dish_id, req.user);

      if (!dish) {
        return res.status(403).json({
          error: 'You do not own this dish'
        });
      }

      const item = await RecipeItem.create({
        dish_id,
        ingredient_name,
        cost
      });

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CREATE',
        module: 'RECIPE_COSTING',
        description: `Added ingredient ${item.ingredient_name} to ${dish.name} (₹${item.cost})`,
        entityId: item.id,
        outletId: dish.outlet_id,
      });

      res.status(201).json(item);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // GET recipe items for a dish
  router.get('/dish/:dishId', requireAuth, async (req, res) => {
    try {
      if (!(await dishFor(req.params.dishId, req.user))) {
        return res.status(403).json({
          error: 'You do not own this dish'
        });
      }

      const items = await RecipeItem.find({
        dish_id: req.params.dishId
      }).sort({ ingredient_name: 1 });

      res.json(items);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE recipe item
  router.put('/:id', requireAuth, async (req, res) => {
    const { ingredient_name, cost } = req.body;

    if (!ingredient_name || cost == null || isNaN(cost) || cost < 0) {
      return res.status(400).json({
        error: 'ingredient_name and a non-negative cost are required'
      });
    }

    try {
      const item = await recipeItemFor(req.params.id, req.user);

      if (!item) {
        return res.status(404).json({
          error: 'Recipe item not found'
        });
      }

      const nameChanged = item.ingredient_name !== ingredient_name;
      const costChanged = Number(item.cost) !== Number(cost);

      item.ingredient_name = ingredient_name;
      item.cost = cost;

      await item.save();

      if (nameChanged || costChanged) {
        const dish = await dishFor(item.dish_id, req.user);
        const changes = [];

        if (nameChanged) changes.push('ingredient name');
        if (costChanged) changes.push('cost');

        await recordActivity({
          accountId: req.user.accountId,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'UPDATE',
          module: 'RECIPE_COSTING',
          description: `Updated ingredient ${item.ingredient_name} (${changes.join(', ')})`,
          entityId: item.id,
          outletId: dish?.outlet_id || null,
        });
      }

      res.json(item);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // DELETE recipe item (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const item = await recipeItemFor(req.params.id, req.user);

      if (!item) {
        return res.status(404).json({
          error: 'Recipe item not found'
        });
      }

      const deletedItemId = item.id;
      const deletedIngredientName = item.ingredient_name;
      const dish = await dishFor(item.dish_id, req.user);

      await item.deleteOne();

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DELETE',
        module: 'RECIPE_COSTING',
        description: `Deleted ingredient: ${deletedIngredientName}`,
        entityId: deletedItemId,
        outletId: dish?.outlet_id || null,
      });

      res.json({ deleted: true });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  return router;
};
