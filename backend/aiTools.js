// Reuses the same margin calculation logic as dashboard.js
async function getMarginsData(pool, outletId, filters = {}) {
  let query = `
    SELECT o.id, o.order_date, o.order_value, o.discount_amount, o.packaging_cost,
           d.id as dish_id, d.name as dish_name,
           p.name as platform_name,
           pfr.commission_pct, pfr.gst_on_commission_pct,
           COALESCE((SELECT SUM(ri.cost) FROM recipe_items ri WHERE ri.dish_id = d.id), 0) as food_cost
    FROM orders o
    JOIN dishes d ON o.dish_id = d.id
    JOIN platforms p ON o.platform_id = p.id
    JOIN platform_fee_rules pfr ON pfr.outlet_id = o.outlet_id AND pfr.platform_id = o.platform_id
    WHERE o.outlet_id = $1
  `;
  const params = [outletId];
  if (filters.platform_id) { params.push(filters.platform_id); query += ` AND o.platform_id = $${params.length}`; }
  if (filters.date_from) { params.push(filters.date_from); query += ` AND o.order_date >= $${params.length}`; }
  if (filters.date_to) { params.push(filters.date_to); query += ` AND o.order_date <= $${params.length}`; }

  const result = await pool.query(query, params);
  return result.rows.map(r => {
    const orderValue = parseFloat(r.order_value);
    const commission = orderValue * (parseFloat(r.commission_pct) / 100);
    const gstOnCommission = commission * (parseFloat(r.gst_on_commission_pct) / 100);
    const profit = orderValue - commission - gstOnCommission - parseFloat(r.discount_amount) - parseFloat(r.packaging_cost) - parseFloat(r.food_cost);
    return { ...r, profit, orderValue };
  });
}

// Tool 1: margin by dish
async function marginByDish(pool, outletId, filters) {
  const rows = await getMarginsData(pool, outletId, filters);
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
async function marginByPlatform(pool, outletId, filters) {
  const rows = await getMarginsData(pool, outletId, filters);
  const byPlatform = {};
  rows.forEach(r => {
    if (!byPlatform[r.platform_name]) byPlatform[r.platform_name] = { platform_name: r.platform_name, revenue: 0, profit: 0, orders: 0 };
    byPlatform[r.platform_name].revenue += r.orderValue;
    byPlatform[r.platform_name].profit += r.profit;
    byPlatform[r.platform_name].orders += 1;
  });
  return Object.values(byPlatform).map(p => ({ ...p, marginPct: p.revenue > 0 ? +(p.profit / p.revenue * 100).toFixed(1) : 0 }));
}

// Tool 3: discount impact on a specific dish
async function discountImpact(pool, outletId, filters) {
  const rows = await getMarginsData(pool, outletId, filters);
  const discounted = rows.filter(r => parseFloat(r.discount_amount) > 0);
  const notDiscounted = rows.filter(r => parseFloat(r.discount_amount) === 0);
  const avg = (arr) => arr.length ? arr.reduce((s, r) => s + r.profit, 0) / arr.length : 0;
  return {
    discountedOrders: discounted.length,
    avgProfitDiscounted: +avg(discounted).toFixed(2),
    nonDiscountedOrders: notDiscounted.length,
    avgProfitNonDiscounted: +avg(notDiscounted).toFixed(2),
  };
}

module.exports = { getMarginsData, marginByDish, marginByPlatform, discountImpact };