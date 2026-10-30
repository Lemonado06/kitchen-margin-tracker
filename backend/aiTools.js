const { Order, Dish, Platform, FeeRule, RecipeItem } = require('./models');
const { validId } = require('./access');

// Profit per order, shared by dashboard.js and the AI tools so both always agree
async function getMarginsData(outletId, filters = {}) {
  const query = { outlet_id: outletId };
  for (const key of ['platform_id', 'dish_id']) {
    if (!filters[key]) continue;
    if (!validId(filters[key])) return [];
    query[key] = filters[key];
  }
  if (filters.date_from || filters.date_to) {
    query.order_date = {};
    if (filters.date_from) query.order_date.$gte = new Date(`${filters.date_from}T00:00:00.000Z`);
    if (filters.date_to) query.order_date.$lte = new Date(`${filters.date_to}T00:00:00.000Z`);
  }

  const [orders, dishes, platforms, rules] = await Promise.all([
    Order.find(query).lean(),
    Dish.find({ outlet_id: outletId }).lean(),
    Platform.find().lean(),
    FeeRule.find({ outlet_id: outletId }).lean(),
  ]);
  // Food cost per dish = sum of its recipe items
  const costs = await RecipeItem.aggregate([
    { $match: { dish_id: { $in: dishes.map((d) => d._id) } } },
    { $group: { _id: '$dish_id', total: { $sum: '$cost' } } },
  ]);

  const dishById = new Map(dishes.map((d) => [d._id.toString(), d]));
  const platformById = new Map(platforms.map((p) => [p._id.toString(), p]));
  const ruleByPlatform = new Map(rules.map((r) => [r.platform_id.toString(), r]));
  const foodCostByDish = new Map(costs.map((c) => [c._id.toString(), c.total]));

  return orders
    .filter((o) => dishById.has(o.dish_id.toString()) && platformById.has(o.platform_id.toString()))
    .map((o) => {
      const dishId = o.dish_id.toString();
      const rule = ruleByPlatform.get(o.platform_id.toString());
      const commissionPct = rule ? rule.commission_pct : 0;
      const gstPct = rule ? rule.gst_on_commission_pct : 18;
      const foodCost = foodCostByDish.get(dishId) || 0;

      const orderValue = o.order_value;
      const commission = orderValue * (commissionPct / 100);
      const gstOnCommission = commission * (gstPct / 100);
      const profit = orderValue - commission - gstOnCommission - o.discount_amount - o.packaging_cost - foodCost;
      return {
        id: o._id.toString(),
        order_date: o.order_date.toISOString().slice(0, 10),
        order_value: orderValue,
        discount_amount: o.discount_amount,
        packaging_cost: o.packaging_cost,
        dish_id: dishId,
        dish_name: dishById.get(dishId).name,
        platform_name: platformById.get(o.platform_id.toString()).name,
        commission_pct: commissionPct,
        gst_on_commission_pct: gstPct,
        food_cost: foodCost,
        profit,
        orderValue,
      };
    });
}

// Tool 1: margin by dish
async function marginByDish(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const byDish = {};
  rows.forEach(r => {
    if (!byDish[r.dish_name]) byDish[r.dish_name] = { dish_name: r.dish_name, revenue: 0, profit: 0, orders: 0 };
    byDish[r.dish_name].revenue += r.orderValue;
    byDish[r.dish_name].profit += r.profit;
    byDish[r.dish_name].orders += 1;
  });
  return Object.values(byDish).map(d => ({ ...d, marginPct: d.revenue > 0 ? +(d.profit / d.revenue * 100).toFixed(1) : 0 }))
    .sort((a, b) => a.marginPct - b.marginPct);
}

// Tool 2: margin by platform
async function marginByPlatform(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const byPlatform = {};
  rows.forEach(r => {
    if (!byPlatform[r.platform_name]) byPlatform[r.platform_name] = { platform_name: r.platform_name, revenue: 0, profit: 0, orders: 0 };
    byPlatform[r.platform_name].revenue += r.orderValue;
    byPlatform[r.platform_name].profit += r.profit;
    byPlatform[r.platform_name].orders += 1;
  });
  return Object.values(byPlatform).map(p => ({ ...p, marginPct: p.revenue > 0 ? +(p.profit / p.revenue * 100).toFixed(1) : 0 }));
}

// Tool 3: discount impact
async function discountImpact(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const discounted = rows.filter(r => r.discount_amount > 0);
  const notDiscounted = rows.filter(r => r.discount_amount === 0);
  const avg = (arr) => arr.length ? arr.reduce((s, r) => s + r.profit, 0) / arr.length : 0;
  return {
    discountedOrders: discounted.length,
    avgProfitDiscounted: +avg(discounted).toFixed(2),
    nonDiscountedOrders: notDiscounted.length,
    avgProfitNonDiscounted: +avg(notDiscounted).toFixed(2),
  };
}

module.exports = { getMarginsData, marginByDish, marginByPlatform, discountImpact };
