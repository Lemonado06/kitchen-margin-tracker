const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('./middleware');

module.exports = (pool) => {
  // Helper: confirm the dish belongs to one of this user's outlets
  async function verifyDishOwnership(dishId, userId) {
    const result = await pool.query(
      `SELECT d.id FROM dishes d JOIN outlets o ON d.outlet_id = o.id WHERE d.id = $1 AND o.owner_id = $2`,
      [dishId, userId]
    );
    return result.rows.length > 0;
  }

  async function verifyItemOwnership(itemId, userId) {
    const result = await pool.query(
      `SELECT ri.id FROM recipe_items ri
       JOIN dishes d ON ri.dish_id = d.id
       JOIN outlets o ON d.outlet_id = o.id
       WHERE ri.id = $1 AND o.owner_id = $2`,
      [itemId, userId]
    );
    return result.rows.length > 0;
  }

  // CREATE recipe item
  router.post('/', requireAuth, async (req, res) => {
    const { dish_id, ingredient_name, cost } = req.body;
    if (!dish_id || !ingredient_name || cost == null) {
      return res.status(400).json({ error: 'dish_id, ingredient_name, cost are required' });
    }
    if (isNaN(cost) || cost < 0) return res.status(400).json({ error: 'Cost must be a non-negative number' });

    const owns = await verifyDishOwnership(dish_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this dish' });

    try {
      const result = await pool.query(
        'INSERT INTO recipe_items (dish_id, ingredient_name, cost) VALUES ($1, $2, $3) RETURNING *',
        [dish_id, ingredient_name, cost]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET recipe items for a dish
  router.get('/dish/:dishId', requireAuth, async (req, res) => {
    const owns = await verifyDishOwnership(req.params.dishId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this dish' });

    try {
      const result = await pool.query('SELECT * FROM recipe_items WHERE dish_id = $1 ORDER BY ingredient_name', [req.params.dishId]);
      res.json(result.rows);
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
      const owns = await verifyItemOwnership(req.params.id, req.user.id);
      if (!owns) return res.status(404).json({ error: 'Recipe item not found' });

      const result = await pool.query(
        'UPDATE recipe_items SET ingredient_name = $1, cost = $2 WHERE id = $3 RETURNING *',
        [ingredient_name, cost, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE recipe item (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const owns = await verifyItemOwnership(req.params.id, req.user.id);
      if (!owns) return res.status(404).json({ error: 'Recipe item not found' });

      await pool.query('DELETE FROM recipe_items WHERE id = $1', [req.params.id]);
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
