const { Order, Dish, Platform, FeeRule, RecipeItem } = require('./models');
const { validId } = require('./access');

const round = (n, d = 2) => +Number(n).toFixed(d);
const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100, 1) : 0);

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
  const foodCostByDish = await foodCosts(dishes.map((d) => d._id));

  const dishById = new Map(dishes.map((d) => [d._id.toString(), d]));
  const platformById = new Map(platforms.map((p) => [p._id.toString(), p]));
  const ruleByPlatform = new Map(rules.map((r) => [r.platform_id.toString(), r]));

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
        commission,
        gst_on_commission: gstOnCommission,
        food_cost: foodCost,
        profit,
        orderValue,
      };
    });
}

// Food cost per dish = sum of its recipe items
async function foodCosts(dishIds) {
  const costs = await RecipeItem.aggregate([
    { $match: { dish_id: { $in: dishIds } } },
    { $group: { _id: '$dish_id', total: { $sum: '$cost' } } },
  ]);
  return new Map(costs.map((c) => [c._id.toString(), c.total]));
}

function groupBy(rows, key) {
  const groups = {};
  rows.forEach((r) => {
    if (!groups[r[key]]) groups[r[key]] = { [key]: r[key], revenue: 0, profit: 0, orders: 0 };
    groups[r[key]].revenue += r.orderValue;
    groups[r[key]].profit += r.profit;
    groups[r[key]].orders += 1;
  });
  return Object.values(groups).map((g) => ({
    ...g, revenue: round(g.revenue), profit: round(g.profit), marginPct: pct(g.profit, g.revenue),
  }));
}

// KPIs for the filtered orders
async function getKpis(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const revenue = rows.reduce((s, r) => s + r.orderValue, 0);
  const profit = rows.reduce((s, r) => s + r.profit, 0);
  return {
    orders: rows.length,
    revenue: round(revenue),
    profit: round(profit),
    marginPct: pct(profit, revenue),
    avgOrderValue: rows.length ? round(revenue / rows.length) : 0,
    avgProfitPerOrder: rows.length ? round(profit / rows.length) : 0,
    lossMakingOrders: rows.filter((r) => r.profit < 0).length,
  };
}

// Where the revenue goes: each cost as rupees and % of revenue
async function costBreakdown(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const sum = (f) => rows.reduce((s, r) => s + f(r), 0);
  const revenue = sum((r) => r.orderValue);
  const parts = {
    commission: sum((r) => r.commission),
    gstOnCommission: sum((r) => r.gst_on_commission),
    discounts: sum((r) => r.discount_amount),
    packaging: sum((r) => r.packaging_cost),
    foodCost: sum((r) => r.food_cost),
    profit: sum((r) => r.profit),
  };
  return {
    revenue: round(revenue),
    breakdown: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, { amount: round(v), pctOfRevenue: pct(v, revenue) }])),
  };
}

// Tool: margin by dish, worst first
async function marginByDish(outletId, filters) {
  return groupBy(await getMarginsData(outletId, filters), 'dish_name').sort((a, b) => a.marginPct - b.marginPct);
}

// Tool: margin by platform, best first
async function marginByPlatform(outletId, filters) {
  return groupBy(await getMarginsData(outletId, filters), 'platform_name').sort((a, b) => b.marginPct - a.marginPct);
}

// Tool: discounted vs full-price orders
async function discountImpact(outletId, filters) {
  const rows = await getMarginsData(outletId, filters);
  const discounted = rows.filter((r) => r.discount_amount > 0);
  const notDiscounted = rows.filter((r) => r.discount_amount === 0);
  const avg = (arr) => (arr.length ? arr.reduce((s, r) => s + r.profit, 0) / arr.length : 0);
  return {
    discountedOrders: discounted.length,
    totalDiscountGiven: round(discounted.reduce((s, r) => s + r.discount_amount, 0)),
    avgProfitDiscounted: round(avg(discounted)),
    nonDiscountedOrders: notDiscounted.length,
    avgProfitNonDiscounted: round(avg(notDiscounted)),
  };
}

// Tool: profit and revenue per day (or per week for long ranges)
async function profitTrend(outletId, filters, { group_by = 'day' } = {}) {
  const rows = await getMarginsData(outletId, filters);
  const keyOf = (date) => {
    if (group_by !== 'week') return date;
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday of that week
    return `week of ${d.toISOString().slice(0, 10)}`;
  };
  const byPeriod = {};
  rows.forEach((r) => {
    const k = keyOf(r.order_date);
    if (!byPeriod[k]) byPeriod[k] = { period: k, revenue: 0, profit: 0, orders: 0 };
    byPeriod[k].revenue += r.orderValue;
    byPeriod[k].profit += r.profit;
    byPeriod[k].orders += 1;
  });
  return Object.values(byPeriod)
    .map((p) => ({ ...p, revenue: round(p.revenue), profit: round(p.profit) }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// Tool: menu price vs food cost for every dish (independent of orders)
async function menuCosting(outletId) {
  const dishes = await Dish.find({ outlet_id: outletId }).lean();
  const costs = await foodCosts(dishes.map((d) => d._id));
  return dishes.map((d) => {
    const foodCost = costs.get(d._id.toString()) || 0;
    return { dish_name: d.name, price: d.price, foodCost: round(foodCost), foodCostPct: pct(foodCost, d.price), grossMarginPerPlate: round(d.price - foodCost) };
  }).sort((a, b) => b.foodCostPct - a.foodCostPct);
}

// Tool: commission + GST each platform charges this outlet
async function feeRules(outletId) {
  const rules = await FeeRule.find({ outlet_id: outletId }).populate('platform_id', 'name').lean();
  return rules.map((r) => ({
    platform: r.platform_id?.name,
    commissionPct: r.commission_pct,
    gstOnCommissionPct: r.gst_on_commission_pct,
    effectiveCutPct: round(r.commission_pct * (1 + r.gst_on_commission_pct / 100), 1),
  }));
}

// Tool: most recent orders with their profit
async function recentOrders(outletId, filters, { limit = 10 } = {}) {
  const rows = await getMarginsData(outletId, filters);
  return rows
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .slice(0, Math.min(25, Math.max(1, limit)))
    .map((r) => ({ date: r.order_date, dish: r.dish_name, platform: r.platform_name, value: r.order_value, discount: r.discount_amount, profit: round(r.profit) }));
}

// Tool: what if a dish's price changed? Re-runs the dish's orders at the new price, same volume and discounts
async function priceSimulation(outletId, filters, { dish_name, new_price, change_pct } = {}) {
  const dishes = await Dish.find({ outlet_id: outletId }).lean();
  const dish = dishes.find((d) => d.name.toLowerCase() === String(dish_name || '').toLowerCase())
    || dishes.find((d) => d.name.toLowerCase().includes(String(dish_name || '').toLowerCase()));
  if (!dish) return { error: `No dish called "${dish_name}". Dishes: ${dishes.map((d) => d.name).join(', ')}` };
  const price = new_price != null ? Number(new_price) : dish.price * (1 + Number(change_pct || 0) / 100);
  if (!(price > 0)) return { error: 'Give new_price or change_pct' };

  const rows = (await getMarginsData(outletId, filters)).filter((r) => r.dish_id === dish._id.toString());
  const factor = price / dish.price; // scale each order's value by the price change
  let current = 0, simulated = 0, revenueNow = 0, revenueNew = 0;
  rows.forEach((r) => {
    const value = r.orderValue * factor;
    const commission = value * (r.commission_pct / 100);
    const gst = commission * (r.gst_on_commission_pct / 100);
    current += r.profit;
    simulated += value - commission - gst - r.discount_amount - r.packaging_cost - r.food_cost;
    revenueNow += r.orderValue;
    revenueNew += value;
  });
  return {
    dish: dish.name,
    currentPrice: dish.price,
    simulatedPrice: round(price),
    ordersConsidered: rows.length,
    currentProfit: round(current),
    simulatedProfit: round(simulated),
    profitChange: round(simulated - current),
    currentMarginPct: pct(current, revenueNow),
    simulatedMarginPct: pct(simulated, revenueNew),
    assumption: 'Same number of orders, same discounts and packaging; commission scales with order value. Profit figures are totals over ordersConsidered orders, not per order.',
  };
}

module.exports = {
  getMarginsData, getKpis, costBreakdown, marginByDish, marginByPlatform, discountImpact,
  profitTrend, menuCosting, feeRules, recentOrders, priceSimulation,
};
