
const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('./middleware');
const { Order, Dish, Platform } = require('./models');
const { validId, outletFor, orderFor } = require('./access');
const { recordActivity } = require('./audit');

// Without foreign keys, check that the dish is on this outlet's menu
// and the platform exists.
async function checkRefs(outletId, dishId, platformId, orderDate) {
  if (
    !/^\d{4}-\d{2}-\d{2}/.test(String(orderDate)) ||
    isNaN(toDay(orderDate))
  ) {
    return 'order_date must be YYYY-MM-DD';
  }

  if (
    !validId(dishId) ||
    !(await Dish.exists({ _id: dishId, outlet_id: outletId }))
  ) {
    return 'Dish not found for this outlet';
  }

  if (
    !validId(platformId) ||
    !(await Platform.exists({ _id: platformId }))
  ) {
    return 'Platform not found';
  }

  return null;
}

// "2026-09-25" -> UTC midnight, so the calendar day never shifts with the server's time zone.
const toDay = (value) =>
  new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

module.exports = () => {

  // CREATE order
  router.post('/', requireAuth, async (req, res) => {
    const {
      outlet_id,
      platform_id,
      dish_id,
      order_date,
      order_value,
      discount_amount,
      packaging_cost
    } = req.body;

    if (
      !outlet_id ||
      !platform_id ||
      !dish_id ||
      !order_date ||
      order_value == null
    ) {
      return res.status(400).json({
        error: 'outlet_id, platform_id, dish_id, order_date, order_value are required'
      });
    }

    if (order_value <= 0 || discount_amount < 0 || packaging_cost < 0) {
      return res.status(400).json({
        error: 'Order value must be positive and costs cannot be negative'
      });
    }

    try {
      const outlet = await outletFor(outlet_id, req.user);

      if (!outlet) {
        return res.status(403).json({
          error: 'You do not own this outlet'
        });
      }

      const refError = await checkRefs(
        outlet_id,
        dish_id,
        platform_id,
        order_date
      );

      if (refError) {
        return res.status(400).json({ error: refError });
      }

      const order = await Order.create({
        outlet_id,
        platform_id,
        dish_id,
        order_date: toDay(order_date),
        order_value,
        discount_amount: discount_amount || 0,
        packaging_cost: packaging_cost || 0,
      });

      const dish = await Dish.findById(dish_id);
      const platform = await Platform.findById(platform_id);

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CREATE',
        module: 'ORDERS',
        description: `Recorded ₹${order.order_value} order for ${dish?.name || 'dish'} via ${platform?.name || 'platform'}`,
        entityId: order.id,
        outletId: outlet.id,
      });

      res.status(201).json(order);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // GET orders for an outlet, newest first, with dish and platform names
  router.get('/outlet/:outletId', requireAuth, async (req, res) => {
    try {
      if (!(await outletFor(req.params.outletId, req.user))) {
        return res.status(403).json({
          error: 'You do not own this outlet'
        });
      }

      const orders = await Order.find({
        outlet_id: req.params.outletId
      })
        .sort({ order_date: -1, created_at: -1 })
        .populate('dish_id', 'name')
        .populate('platform_id', 'name');

      res.json(orders.map((o) => ({
        ...o.toJSON(),
        dish_id: o.dish_id?.id,
        dish_name: o.dish_id?.name,
        platform_id: o.platform_id?.id,
        platform_name: o.platform_id?.name,
      })));

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE order
  router.put('/:id', requireAuth, async (req, res) => {
    const {
      platform_id,
      dish_id,
      order_date,
      order_value,
      discount_amount,
      packaging_cost
    } = req.body;

    if (
      !platform_id ||
      !dish_id ||
      !order_date ||
      order_value == null
    ) {
      return res.status(400).json({
        error: 'platform_id, dish_id, order_date, order_value are required'
      });
    }

    if (order_value <= 0 || discount_amount < 0 || packaging_cost < 0) {
      return res.status(400).json({
        error: 'Order value must be positive and costs cannot be negative'
      });
    }

    try {
      const order = await orderFor(req.params.id, req.user);

      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      const refError = await checkRefs(
        order.outlet_id,
        dish_id,
        platform_id,
        order_date
      );

      if (refError) {
        return res.status(400).json({ error: refError });
      }

      const previousValue = Number(order.order_value);

      Object.assign(order, {
        platform_id,
        dish_id,
        order_date: toDay(order_date),
        order_value,
        discount_amount: discount_amount || 0,
        packaging_cost: packaging_cost || 0,
      });

      await order.save();

      const dish = await Dish.findById(dish_id);
      const platform = await Platform.findById(platform_id);

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'UPDATE',
        module: 'ORDERS',
        description: `Updated order for ${dish?.name || 'dish'} via ${platform?.name || 'platform'} (₹${previousValue} → ₹${order.order_value})`,
        entityId: order.id,
        outletId: order.outlet_id,
      });

      res.json(order);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // DELETE order (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const order = await orderFor(req.params.id, req.user);

      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      const deletedOrderId = order.id;
      const deletedOrderValue = order.order_value;
      const outletId = order.outlet_id;

      await order.deleteOne();

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DELETE',
        module: 'ORDERS',
        description: `Deleted order worth ₹${deletedOrderValue}`,
        entityId: deletedOrderId,
        outletId,
      });

      res.json({ deleted: true });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  return router;
};
