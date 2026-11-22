const { Order, Dish, Platform, FeeRule, RecipeItem, User, Outlet } = require('./models');
const { validId } = require('./access');

const round = (n, d = 2) => +Number(n).toFixed(d);
const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100, 1) : 0);
const iso = (d) => d.toISOString().slice(0, 10);
const DAY_MS = 86400000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (date) => new Date(`${date}T00:00:00.000Z`).getUTCDay();

// Every tool accepts one outlet id or a list of them. Normalise to an array.
const toIds = (outletIds) => [].concat(outletIds).filter(Boolean);

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mad = (arr) => { const m = median(arr); return median(arr.map((v) => Math.abs(v - m))); };

// Dishes in scope. With several outlets the label carries the outlet name, because dish names can repeat.
async function scopeDishes(ids) {
  const [dishes, outlets] = await Promise.all([
    Dish.find({ outlet_id: { $in: ids } }).lean(),
    Outlet.find({ _id: { $in: ids } }).lean(),
  ]);
  const outletName = new Map(outlets.map((o) => [o._id.toString(), o.name]));
  const multi = ids.length > 1;
  return dishes.map((d) => ({
    ...d,
    outlet_name: outletName.get(d.outlet_id.toString()),
    label: multi ? `${d.name} (${outletName.get(d.outlet_id.toString())})` : d.name,
  }));
}

// Profit per order, shared by dashboard.js and the AI tools so both always agree.
// outletIds may be a single id or an array. Fee rules are looked up per outlet and platform.
async function getMarginsData(outletIds, filters = {}) {
  const ids = toIds(outletIds);
  const multi = ids.length > 1;
  const query = { outlet_id: { $in: ids } };
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

  const [orders, dishes, platforms, rules, outlets] = await Promise.all([
    Order.find(query).lean(),
    Dish.find({ outlet_id: { $in: ids } }).lean(),
    Platform.find().lean(),
    FeeRule.find({ outlet_id: { $in: ids } }).lean(),
    Outlet.find({ _id: { $in: ids } }).lean(),
  ]);
  const foodCostByDish = await foodCosts(dishes.map((d) => d._id));

  const outletName = new Map(outlets.map((o) => [o._id.toString(), o.name]));
  const dishById = new Map(dishes.map((d) => [d._id.toString(), d]));
  const platformById = new Map(platforms.map((p) => [p._id.toString(), p]));
  const ruleByOutletPlatform = new Map(rules.map((r) => [`${r.outlet_id}|${r.platform_id}`, r]));

  return orders
    .filter((o) => dishById.has(o.dish_id.toString()) && platformById.has(o.platform_id.toString()))
    .map((o) => {
      const dishId = o.dish_id.toString();
      const outletId = o.outlet_id.toString();
      const dish = dishById.get(dishId);
      const rule = ruleByOutletPlatform.get(`${outletId}|${o.platform_id}`);
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
        outlet_id: outletId,
        outlet_name: outletName.get(outletId),
        dish_id: dishId,
        dish_plain: dish.name,
        // With several outlets the dish name carries its outlet so same-named dishes are not merged
        dish_name: multi ? `${dish.name} (${outletName.get(outletId)})` : dish.name,
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

// Daily totals with every calendar day filled in (days without orders count as zero)
function dailySeries(rows) {
  if (!rows.length) return [];
  const by = new Map();
  rows.forEach((r) => {
    let d = by.get(r.order_date);
    if (!d) { d = { date: r.order_date, orders: 0, revenue: 0, profit: 0 }; by.set(r.order_date, d); }
    d.orders += 1;
    d.revenue += r.orderValue;
    d.profit += r.profit;
  });
  const dates = [...by.keys()].sort();
  const out = [];
  const end = new Date(`${dates[dates.length - 1]}T00:00:00.000Z`);
  for (let cur = new Date(`${dates[0]}T00:00:00.000Z`); cur <= end; cur = new Date(cur.getTime() + DAY_MS)) {
    const k = iso(cur);
    out.push(by.get(k) || { date: k, orders: 0, revenue: 0, profit: 0 });
  }
  return out;
}

// KPIs for the filtered orders
async function getKpis(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
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
async function costBreakdown(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
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
async function marginByDish(outletIds, filters) {
  return groupBy(await getMarginsData(outletIds, filters), 'dish_name').sort((a, b) => a.marginPct - b.marginPct);
}

// Tool: margin by platform, best first
async function marginByPlatform(outletIds, filters) {
  return groupBy(await getMarginsData(outletIds, filters), 'platform_name').sort((a, b) => b.marginPct - a.marginPct);
}

// Tool: discounted vs full-price orders
async function discountImpact(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
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
async function profitTrend(outletIds, filters, { group_by = 'day' } = {}) {
  const rows = await getMarginsData(outletIds, filters);
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
async function menuCosting(outletIds) {
  const dishes = await scopeDishes(toIds(outletIds));
  const costs = await foodCosts(dishes.map((d) => d._id));
  return dishes.map((d) => {
    const foodCost = costs.get(d._id.toString()) || 0;
    return { dish_name: d.label, price: d.price, foodCost: round(foodCost), foodCostPct: pct(foodCost, d.price), grossMarginPerPlate: round(d.price - foodCost) };
  }).sort((a, b) => b.foodCostPct - a.foodCostPct);
}

// Tool: commission + GST each platform charges each outlet
async function feeRules(outletIds) {
  const ids = toIds(outletIds);
  const [rules, outlets] = await Promise.all([
    FeeRule.find({ outlet_id: { $in: ids } }).populate('platform_id', 'name').lean(),
    Outlet.find({ _id: { $in: ids } }).lean(),
  ]);
  const outletName = new Map(outlets.map((o) => [o._id.toString(), o.name]));
  return rules.map((r) => ({
    outlet: outletName.get(r.outlet_id.toString()),
    platform: r.platform_id?.name,
    commissionPct: r.commission_pct,
    gstOnCommissionPct: r.gst_on_commission_pct,
    effectiveCutPct: round(r.commission_pct * (1 + r.gst_on_commission_pct / 100), 1),
  }));
}

// Tool: most recent orders with their profit
async function recentOrders(outletIds, filters, { limit = 10 } = {}) {
  const rows = await getMarginsData(outletIds, filters);
  return rows
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .slice(0, Math.min(25, Math.max(1, limit)))
    .map((r) => ({ date: r.order_date, outlet: r.outlet_name, dish: r.dish_plain, platform: r.platform_name, value: r.order_value, discount: r.discount_amount, profit: round(r.profit) }));
}

// Finds one dish by name in the selected outlets, or explains why it can't
function findDish(dishes, name) {
  const q = String(name || '').toLowerCase().trim();
  if (!q) return { error: `Give a dish name. Dishes: ${dishes.map((d) => d.label).join(', ')}` };
  let matches = dishes.filter((d) => d.label.toLowerCase() === q || d.name.toLowerCase() === q);
  if (!matches.length) matches = dishes.filter((d) => d.label.toLowerCase().includes(q));
  if (!matches.length) return { error: `No dish called "${name}". Dishes: ${dishes.map((d) => d.label).join(', ')}` };
  if (matches.length > 1) return { error: `"${name}" matches several dishes: ${matches.map((d) => d.label).join(', ')}. Say which one.` };
  return { dish: matches[0] };
}

// Tool: what if a dish's price changed? Re-runs the dish's orders at the new price, same discounts.
// Optional volume_change_pct models demand change (e.g. -10 = 10% fewer orders after the rise).
async function priceSimulation(outletIds, filters, { dish_name, new_price, change_pct, volume_change_pct } = {}) {
  const found = findDish(await scopeDishes(toIds(outletIds)), dish_name);
  if (found.error) return { error: found.error };
  const dish = found.dish;
  const price = new_price != null ? Number(new_price) : dish.price * (1 + Number(change_pct || 0) / 100);
  if (!(price > 0)) return { error: 'Give new_price or change_pct' };
  const volMult = Math.max(0, 1 + Number(volume_change_pct || 0) / 100);

  const rows = (await getMarginsData(outletIds, filters)).filter((r) => r.dish_id === dish._id.toString());
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
  const simulatedAtSameVolume = simulated;
  simulated = simulated * volMult;
  const out = {
    dish: dish.label,
    currentPrice: dish.price,
    simulatedPrice: round(price),
    ordersConsidered: rows.length,
    volumeChangePct: round((volMult - 1) * 100, 1),
    currentProfit: round(current),
    simulatedProfit: round(simulated),
    profitChange: round(simulated - current),
    currentMarginPct: pct(current, revenueNow),
    simulatedMarginPct: pct(simulatedAtSameVolume, revenueNew),
    assumption: 'Discounts and packaging per order stay the same; commission scales with order value; order volume changes only if volume_change_pct is given. Profit figures are totals over ordersConsidered orders, not per order. Real demand response is not modelled.',
  };
  if (current > 0 && simulatedAtSameVolume > current) {
    // Orders can fall by this much before the higher price earns less than today
    out.breakEvenVolumeDropPct = round((1 - current / simulatedAtSameVolume) * 100, 1);
  }
  return out;
}

// Tool: facts about the app and the selected outlets. Counts are scoped to the caller's own owner account.
// Returns counts only: no emails, names or password data.
async function appStats(outletIds) {
  const ids = toIds(outletIds);
  const outlets = await Outlet.find({ _id: { $in: ids } }).lean();
  if (!outlets.length) return { error: 'Outlet not found' };
  const ownerId = outlets[0].owner_id;
  const [accountOutlets, managers, staff, platforms, perOutlet] = await Promise.all([
    Outlet.countDocuments({ owner_id: ownerId }),
    User.countDocuments({ owner_id: ownerId, role: 'manager' }),
    User.countDocuments({ owner_id: ownerId, role: 'staff' }),
    Platform.find().lean(),
    Promise.all(outlets.map(async (o) => {
      const [dishes, orders, rules, first, last] = await Promise.all([
        Dish.countDocuments({ outlet_id: o._id }),
        Order.countDocuments({ outlet_id: o._id }),
        FeeRule.countDocuments({ outlet_id: o._id }),
        Order.findOne({ outlet_id: o._id }).sort({ order_date: 1 }).lean(),
        Order.findOne({ outlet_id: o._id }).sort({ order_date: -1 }).lean(),
      ]);
      return { name: o.name, city: o.city, dishes, orders, feeRules: rules, firstOrderDate: first ? iso(first.order_date) : null, lastOrderDate: last ? iso(last.order_date) : null };
    })),
  ]);
  return {
    app: {
      name: 'Kitchen Margin Tracker',
      purpose: 'Works out the real profit on every cloud-kitchen order after platform commission, GST on that commission, discounts, packaging and food cost.',
      profitFormula: 'order value - commission - GST on commission - discount - packaging - food cost',
      roles: 'Owner (full access, manages team and platforms), Manager (view, add and edit, no deletes, no team or platform management) and Staff (can only add and view orders, no profit data or AI)',
    },
    thisAccount: { outlets: accountOutlets, managers, staff, owners: 1 },
    selectedOutlets: perOutlet,
    platforms: platforms.map((p) => p.name),
    scope: 'Counts cover only the signed-in owner\'s account, not other customers.',
  };
}

// Tool: for each dish x platform, how much discount an order can carry before it loses money
async function breakEvenDiscount(outletIds, filters, { dish_name } = {}) {
  let rows = await getMarginsData(outletIds, filters);
  if (dish_name) {
    const q = String(dish_name).toLowerCase();
    rows = rows.filter((r) => r.dish_name.toLowerCase().includes(q));
  }
  const g = {};
  rows.forEach((r) => {
    const k = `${r.dish_name}|${r.platform_name}`;
    if (!g[k]) g[k] = { dish: r.dish_name, platform: r.platform_name, orders: 0, beforeDiscount: 0, discount: 0, discounted: 0 };
    g[k].orders += 1;
    g[k].beforeDiscount += r.profit + r.discount_amount; // profit is linear in discount, so add it back
    g[k].discount += r.discount_amount;
    if (r.discount_amount > 0) g[k].discounted += 1;
  });
  return Object.values(g).map((x) => {
    const maxDiscount = x.beforeDiscount / x.orders;
    const avgDiscount = x.discount / x.orders;
    return {
      dish: x.dish,
      platform: x.platform,
      orders: x.orders,
      breakEvenDiscountPerOrder: round(maxDiscount),
      avgDiscountGiven: round(avgDiscount),
      pctOrdersDiscounted: pct(x.discounted, x.orders),
      headroomPerOrder: round(maxDiscount - avgDiscount),
      status: maxDiscount - avgDiscount < 0 ? 'losing money on average' : 'profitable on average',
    };
  }).sort((a, b) => a.headroomPerOrder - b.headroomPerOrder).slice(0, 15);
}

// Tool: why orders lose money. Groups loss-making orders by dish and platform and names the biggest cost.
async function lossAnalysis(outletIds, filters) {
  const all = await getMarginsData(outletIds, filters);
  const losers = all.filter((r) => r.profit < 0);
  const g = {};
  losers.forEach((r) => {
    const k = `${r.dish_name}|${r.platform_name}`;
    if (!g[k]) g[k] = { dish: r.dish_name, platform: r.platform_name, orders: 0, loss: 0, revenue: 0, discount: 0, food: 0, fees: 0, packaging: 0 };
    g[k].orders += 1;
    g[k].loss += r.profit;
    g[k].revenue += r.orderValue;
    g[k].discount += r.discount_amount;
    g[k].food += r.food_cost;
    g[k].fees += r.commission + r.gst_on_commission;
    g[k].packaging += r.packaging_cost;
  });
  const groups = Object.values(g).map((x) => {
    const parts = { discounts: x.discount, foodCost: x.food, platformFees: x.fees, packaging: x.packaging };
    const [driver] = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
    return {
      dish: x.dish,
      platform: x.platform,
      lossMakingOrders: x.orders,
      totalLoss: round(x.loss),
      avgLossPerOrder: round(x.loss / x.orders),
      avgDiscount: round(x.discount / x.orders),
      avgFoodCost: round(x.food / x.orders),
      avgPlatformFees: round(x.fees / x.orders),
      largestCostComponent: driver,
    };
  }).sort((a, b) => a.totalLoss - b.totalLoss).slice(0, 10);
  return {
    totalOrders: all.length,
    lossMakingOrders: losers.length,
    lossMakingSharePct: pct(losers.length, all.length),
    totalLoss: round(losers.reduce((s, r) => s + r.profit, 0)),
    worstGroups: groups,
  };
}

// Tool: performance by day of week (are weekends really more profitable, or just busier?)
async function dayOfWeekPerformance(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
  const g = {};
  rows.forEach((r) => {
    const day = DAY_NAMES[dayOf(r.order_date)];
    if (!g[day]) g[day] = { day, orders: 0, revenue: 0, profit: 0 };
    g[day].orders += 1;
    g[day].revenue += r.orderValue;
    g[day].profit += r.profit;
  });
  return DAY_NAMES.filter((n) => g[n]).map((n) => ({
    day: n,
    orders: g[n].orders,
    revenue: round(g[n].revenue),
    profit: round(g[n].profit),
    marginPct: pct(g[n].profit, g[n].revenue),
    avgProfitPerOrder: round(g[n].profit / g[n].orders),
  }));
}

// Tool: menu engineering. Classic Star / Plowhorse / Puzzle / Dog grid from popularity and profit per order.
async function menuEngineering(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
  const dishes = groupBy(rows, 'dish_name');
  if (!dishes.length) return { dishes: [] };
  const totalOrders = rows.length;
  const avgProfitPerOrder = rows.reduce((s, r) => s + r.profit, 0) / totalOrders;
  const popularityCutoff = 0.7 / dishes.length; // standard rule: 70% of an even share
  const actions = {
    Star: 'Keep, protect quality and avoid discounting.',
    Plowhorse: 'Popular but thin: raise price slightly, trim food cost or cut discounts.',
    Puzzle: 'Profitable but rarely ordered: promote it or place it higher on the menu.',
    Dog: 'Unpopular and thin: rework the recipe or consider dropping it.',
  };
  return dishes.map((d) => {
    const profitPerOrder = d.profit / d.orders;
    const popular = d.orders / totalOrders >= popularityCutoff;
    const profitable = profitPerOrder >= avgProfitPerOrder;
    const category = popular ? (profitable ? 'Star' : 'Plowhorse') : (profitable ? 'Puzzle' : 'Dog');
    return {
      dish: d.dish_name,
      orders: d.orders,
      orderSharePct: pct(d.orders, totalOrders),
      profitPerOrder: round(profitPerOrder),
      totalProfit: d.profit,
      category,
      suggestedAction: actions[category],
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);
}

// Tool: compare the latest N days against the N days before them
async function periodComparison(outletIds, filters, { days = 30 } = {}) {
  const ids = toIds(outletIds);
  const n = Math.min(180, Math.max(1, Math.round(Number(days) || 30)));
  let anchor;
  if (filters.date_to) {
    anchor = new Date(`${filters.date_to}T00:00:00.000Z`);
  } else {
    const last = await Order.findOne({ outlet_id: { $in: ids } }).sort({ order_date: -1 }).lean();
    if (!last) return { error: 'No orders yet' };
    anchor = new Date(last.order_date);
  }
  const shift = (d, by) => new Date(d.getTime() + by * DAY_MS);
  const base = { platform_id: filters.platform_id, dish_id: filters.dish_id };
  const curRange = { ...base, date_from: iso(shift(anchor, -(n - 1))), date_to: iso(anchor) };
  const prevRange = { ...base, date_from: iso(shift(anchor, -(2 * n - 1))), date_to: iso(shift(anchor, -n)) };
  const [current, previous] = await Promise.all([getKpis(ids, curRange), getKpis(ids, prevRange)]);
  const change = (a, b) => (b > 0 ? round(((a - b) / b) * 100, 1) : null);
  return {
    days: n,
    currentPeriod: { from: curRange.date_from, to: curRange.date_to, ...current },
    previousPeriod: { from: prevRange.date_from, to: prevRange.date_to, ...previous },
    change: {
      ordersPct: change(current.orders, previous.orders),
      revenuePct: change(current.revenue, previous.revenue),
      profitPct: change(current.profit, previous.profit),
      marginPointsChange: round(current.marginPct - previous.marginPct, 1),
    },
  };
}

// Tool: what if an ingredient's cost rises or falls? Re-prices every order that uses it.
async function costShockSimulation(outletIds, filters, { ingredient_name, change_pct } = {}) {
  const q = String(ingredient_name || '').toLowerCase().trim();
  const changePct = Number(change_pct);
  if (!q || !Number.isFinite(changePct)) return { error: 'Give ingredient_name and change_pct (e.g. 10 for +10%)' };

  const dishes = await scopeDishes(toIds(outletIds));
  const items = await RecipeItem.find({ dish_id: { $in: dishes.map((d) => d._id) } }).lean();
  const matches = items.filter((i) => i.ingredient_name.toLowerCase().includes(q));
  if (!matches.length) {
    const names = [...new Set(items.map((i) => i.ingredient_name))].sort();
    return { error: `No ingredient matching "${ingredient_name}". Ingredients: ${names.join(', ')}` };
  }
  const extraByDish = new Map();
  matches.forEach((i) => {
    const key = i.dish_id.toString();
    extraByDish.set(key, (extraByDish.get(key) || 0) + i.cost * (changePct / 100));
  });

  const rows = await getMarginsData(outletIds, filters);
  const perDish = {};
  rows.forEach((r) => {
    if (!extraByDish.has(r.dish_id)) return;
    if (!perDish[r.dish_id]) perDish[r.dish_id] = { dish: r.dish_name, orders: 0, revenue: 0, currentProfit: 0 };
    perDish[r.dish_id].orders += 1;
    perDish[r.dish_id].revenue += r.orderValue;
    perDish[r.dish_id].currentProfit += r.profit;
  });
  const result = Object.entries(perDish).map(([id, x]) => {
    const extra = extraByDish.get(id);
    const newProfit = x.currentProfit - extra * x.orders;
    return {
      dish: x.dish,
      orders: x.orders,
      extraCostPerPlate: round(extra),
      currentProfit: round(x.currentProfit),
      newProfit: round(newProfit),
      profitChange: round(newProfit - x.currentProfit),
      currentMarginPct: pct(x.currentProfit, x.revenue),
      newMarginPct: pct(newProfit, x.revenue),
    };
  }).sort((a, b) => a.profitChange - b.profitChange);
  const totalChange = result.reduce((s, r) => s + r.profitChange, 0);
  return {
    ingredientMatched: [...new Set(matches.map((m) => m.ingredient_name))],
    changePct,
    totalProfitChange: round(totalChange),
    dishesAffected: result,
    assumption: 'Selling prices, volumes, discounts and packaging unchanged. Only the recipe cost of the matched ingredient moves.',
  };
}

// Tool: what if some orders moved from one platform to another (e.g. Swiggy to Direct)? Fee-only what-if.
async function platformShiftSimulation(outletIds, filters, { dish_name, from_platform, to_platform, share_pct = 100 } = {}) {
  const ids = toIds(outletIds);
  const [platforms, rules] = await Promise.all([Platform.find().lean(), FeeRule.find({ outlet_id: { $in: ids } }).lean()]);
  const find = (name) => {
    const n = String(name || '').toLowerCase();
    return platforms.find((p) => p.name.toLowerCase() === n) || platforms.find((p) => p.name.toLowerCase().includes(n));
  };
  const from = find(from_platform);
  const to = find(to_platform);
  if (!from || !to) return { error: `Give from_platform and to_platform. Platforms: ${platforms.map((p) => p.name).join(', ')}` };
  // Each outlet has its own fee rule for the destination platform
  const toRuleByOutlet = new Map(rules.filter((r) => r.platform_id.toString() === to._id.toString()).map((r) => [r.outlet_id.toString(), r]));
  const share = Math.min(100, Math.max(0, Number(share_pct))) / 100;

  let rows = (await getMarginsData(ids, filters)).filter((r) => r.platform_name === from.name);
  if (dish_name) {
    const q = String(dish_name).toLowerCase();
    rows = rows.filter((r) => r.dish_name.toLowerCase().includes(q));
  }
  let current = 0, simulated = 0;
  rows.forEach((r) => {
    const rule = toRuleByOutlet.get(r.outlet_id);
    const commission = r.orderValue * ((rule ? rule.commission_pct : 0) / 100);
    const gst = commission * ((rule ? rule.gst_on_commission_pct : 18) / 100);
    const newProfit = r.orderValue - commission - gst - r.discount_amount - r.packaging_cost - r.food_cost;
    current += r.profit * share;
    simulated += newProfit * share;
  });
  return {
    from: from.name,
    to: to.name,
    dish: dish_name || 'all dishes',
    sharePctMoved: round(share * 100, 1),
    ordersMoved: round(rows.length * share, 1),
    profitOnThoseOrdersNow: round(current),
    profitIfMoved: round(simulated),
    profitChange: round(simulated - current),
    assumption: `Only the platform fees change (to ${to.name}'s fee rule at each outlet). Discounts, packaging and prices stay the same, and it does not model whether customers would actually switch.`,
  };
}

// ---------------------------------------------------------------------------
// Cross-outlet comparison, anomaly detection and forecast
// ---------------------------------------------------------------------------

// Tool: rank the selected outlets by profit and margin, with each outlet's best and worst dish
async function outletComparison(outletIds, filters) {
  const rows = await getMarginsData(outletIds, filters);
  if (!rows.length) return { outlets: [] };
  const g = {};
  rows.forEach((r) => {
    if (!g[r.outlet_id]) g[r.outlet_id] = { outlet: r.outlet_name, orders: 0, revenue: 0, profit: 0, loss: 0, discount: 0, dishes: {}, platforms: {} };
    const o = g[r.outlet_id];
    o.orders += 1;
    o.revenue += r.orderValue;
    o.profit += r.profit;
    o.discount += r.discount_amount;
    if (r.profit < 0) o.loss += 1;
    for (const [bucket, key] of [[o.dishes, r.dish_plain], [o.platforms, r.platform_name]]) {
      if (!bucket[key]) bucket[key] = { name: key, orders: 0, revenue: 0, profit: 0 };
      bucket[key].orders += 1;
      bucket[key].revenue += r.orderValue;
      bucket[key].profit += r.profit;
    }
  });
  const totalProfit = Object.values(g).reduce((s, o) => s + o.profit, 0);
  const margin = (x) => (x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0);
  const outlets = Object.values(g).map((o) => {
    let dishes = Object.values(o.dishes);
    const enough = dishes.filter((d) => d.orders >= 10); // ignore dishes with too few orders to judge
    if (enough.length) dishes = enough;
    dishes.sort((a, b) => margin(a) - margin(b));
    const platforms = Object.values(o.platforms).sort((a, b) => margin(b) - margin(a));
    const pick = (d) => d && { dish: d.name, marginPct: round(margin(d), 1), orders: d.orders };
    return {
      outlet: o.outlet,
      orders: o.orders,
      revenue: round(o.revenue),
      profit: round(o.profit),
      marginPct: pct(o.profit, o.revenue),
      avgProfitPerOrder: round(o.profit / o.orders),
      lossMakingOrderSharePct: pct(o.loss, o.orders),
      discountPctOfRevenue: pct(o.discount, o.revenue),
      shareOfTotalProfitPct: totalProfit > 0 ? pct(o.profit, totalProfit) : null,
      worstDish: pick(dishes[0]),
      bestDish: pick(dishes[dishes.length - 1]),
      bestPlatform: platforms[0] && { platform: platforms[0].name, marginPct: round(margin(platforms[0]), 1) },
      worstPlatform: platforms.length > 1 ? { platform: platforms[platforms.length - 1].name, marginPct: round(margin(platforms[platforms.length - 1]), 1) } : null,
    };
  }).sort((a, b) => b.profit - a.profit).map((o, i) => ({ rank: i + 1, ...o }));
  return { outlets };
}

// Flags values that are unusual compared with the same weekday over the previous weeks.
// residual = value - median of the same weekday over the previous 4 weeks; a residual is flagged when it is
// far from the typical residual, measured with the median absolute deviation (robust to the outliers themselves).
function flagResiduals(points, lag, threshold) {
  const resid = [];
  points.forEach((p, i) => {
    const prev = [];
    for (let k = 1; k <= 4; k++) if (i - k * lag >= 0 && points[i - k * lag].v != null) prev.push(points[i - k * lag].v);
    if (p.v == null || prev.length < 3) return;
    resid.push({ p, expected: median(prev), r: p.v - median(prev) });
  });
  if (resid.length < 8) return [];
  const centre = median(resid.map((x) => x.r));
  const scale = 1.4826 * mad(resid.map((x) => x.r));
  if (scale < 1e-9) return [];
  return resid
    .map((x) => ({ ...x, z: (x.r - centre) / scale }))
    .filter((x) => Math.abs(x.z) >= threshold);
}

// Tool: unusual days and dish-weeks in the selected data
async function anomalyDetection(outletIds, filters, { threshold = 3 } = {}) {
  const rows = await getMarginsData(outletIds, filters);
  const days = dailySeries(rows);
  if (days.length < 35) return { error: 'Need at least 5 weeks of order history to detect anomalies reliably.' };
  const t = Math.min(6, Math.max(2, Number(threshold) || 3));
  const found = [];

  // 1. Whole selection: daily order count and daily margin %, compared with the same weekday earlier
  const metrics = [
    ['orders per day', (d) => d.orders, 0],
    ['margin % per day', (d) => (d.revenue > 0 ? (d.profit / d.revenue) * 100 : null), 1],
  ];
  for (const [metric, fn, dp] of metrics) {
    flagResiduals(days.map((d) => ({ date: d.date, v: fn(d) })), 7, t).forEach((x) => found.push({
      scope: 'whole selection', metric, period: x.p.date, weekday: DAY_NAMES[dayOf(x.p.date)],
      actual: round(x.p.v, dp), expected: round(x.expected, dp), direction: x.r > 0 ? 'above' : 'below', score: round(Math.abs(x.z), 1),
    }));
  }

  // 2. Each dish: weekly margin %, compared with its own previous weeks
  const weekKey = (date) => {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return iso(d);
  };
  const byDish = {};
  rows.forEach((r) => {
    const w = weekKey(r.order_date);
    const d = (byDish[r.dish_name] ||= {});
    const x = (d[w] ||= { orders: 0, revenue: 0, profit: 0 });
    x.orders += 1; x.revenue += r.orderValue; x.profit += r.profit;
  });
  const allWeeks = [...new Set(rows.map((r) => weekKey(r.order_date)))].sort();
  for (const [dish, weeks] of Object.entries(byDish)) {
    const points = allWeeks.map((w) => ({ date: w, v: weeks[w] && weeks[w].orders >= 5 && weeks[w].revenue > 0 ? (weeks[w].profit / weeks[w].revenue) * 100 : null }));
    flagResiduals(points, 1, t).forEach((x) => found.push({
      scope: dish, metric: 'weekly margin %', period: `week of ${x.p.date}`, weekday: null,
      actual: round(x.p.v, 1), expected: round(x.expected, 1), direction: x.r > 0 ? 'above' : 'below', score: round(Math.abs(x.z), 1),
    }));
  }

  found.sort((a, b) => b.score - a.score);
  return {
    daysAnalysed: days.length,
    threshold: t,
    flagged: found.length,
    anomalies: found.slice(0, 12),
    method: 'Each value is compared with the median of the same weekday (or the same dish) over the previous 4 periods. A flag means it is unusual versus that baseline, scored in robust standard deviations.',
    caveat: 'A flag is a lead to investigate, not a proven cause. A spike can also make the same weekday look unusual afterwards.',
  };
}

// Additive model: weekday effect + straight-line trend, fitted on the last 8 weeks
function fitForecast(y, dow) {
  const W = Math.min(y.length, 56);
  const win = y.slice(y.length - W);
  const dws = dow.slice(dow.length - W);
  const mean = win.reduce((s, v) => s + v, 0) / W;
  const sum = Array(7).fill(0), cnt = Array(7).fill(0);
  win.forEach((v, i) => { sum[dws[i]] += v; cnt[dws[i]] += 1; });
  const effect = sum.map((s, d) => (cnt[d] ? s / cnt[d] - mean : 0));
  const z = win.map((v, i) => v - effect[dws[i]]);
  const tMean = (W - 1) / 2;
  let num = 0, den = 0;
  z.forEach((v, i) => { num += (i - tMean) * (v - mean); den += (i - tMean) ** 2; });
  const slope = den ? num / den : 0;
  const intercept = z.reduce((s, v) => s + v, 0) / W - slope * tMean;
  // h = days after the last observed day
  return (h, weekday) => intercept + slope * (W - 1 + h) + effect[weekday];
}

// Tool: EXPERIMENT. Projects daily profit forward and reports how well the same method predicted the last 4 weeks.
async function profitForecast(outletIds, filters, { days = 14 } = {}) {
  const rows = await getMarginsData(outletIds, filters);
  const series = dailySeries(rows);
  if (series.length < 28) return { error: 'Need at least 4 weeks of order history to forecast.' };
  const horizon = Math.min(28, Math.max(1, Math.round(Number(days) || 14)));
  const y = series.map((d) => d.profit);
  const dow = series.map((d) => dayOf(d.date));
  const n = y.length;

  // Backtest: fit on everything except the last 28 days, then predict those 28 days
  let backtest = null;
  let residualSd = null;
  if (n >= 56) {
    const H = 28;
    const predict = fitForecast(y.slice(0, n - H), dow.slice(0, n - H));
    const trainTail = y.slice(n - H - 28, n - H);
    const naive = trainTail.reduce((s, v) => s + v, 0) / trainTail.length;
    let absErr = 0, naiveErr = 0, actualSum = 0, predSum = 0, sq = 0;
    for (let i = 0; i < H; i++) {
      const actual = y[n - H + i];
      const pred = predict(i + 1, dow[n - H + i]);
      absErr += Math.abs(actual - pred);
      naiveErr += Math.abs(actual - naive);
      sq += (actual - pred) ** 2;
      actualSum += actual;
      predSum += pred;
    }
    residualSd = Math.sqrt(sq / H);
    const absActual = y.slice(n - H).reduce((s, v) => s + Math.abs(v), 0);
    backtest = {
      testedDays: H,
      dailyErrorPct: pct(absErr, absActual),
      naiveBaselineDailyErrorPct: pct(naiveErr, absActual),
      beatsNaiveBaseline: absErr < naiveErr,
      totalProfitErrorPct: actualSum !== 0 ? round(((predSum - actualSum) / Math.abs(actualSum)) * 100, 1) : null,
      note: 'dailyErrorPct is total absolute daily error as a % of actual profit. The naive baseline just repeats the average of the 4 weeks before.',
    };
  }

  const predict = fitForecast(y, dow);
  const last = new Date(`${series[n - 1].date}T00:00:00.000Z`);
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const date = new Date(last.getTime() + h * DAY_MS);
    forecast.push({ date: iso(date), weekday: DAY_NAMES[date.getUTCDay()], expectedProfit: round(predict(h, date.getUTCDay()), 0) });
  }
  const total = forecast.reduce((s, f) => s + f.expectedProfit, 0);
  const band = residualSd != null ? 1.96 * residualSd * Math.sqrt(horizon) : null;
  return {
    experimental: true,
    method: 'Weekday pattern plus a straight-line trend, fitted on the last 8 weeks of daily profit.',
    historyDays: n,
    lastDataDate: series[n - 1].date,
    forecastDays: horizon,
    totalExpectedProfit: round(total, 0),
    roughRange: band != null ? { low: round(total - band, 0), high: round(total + band, 0), note: 'Rough 95% range from the backtest error; assumes day-to-day errors are independent.' } : null,
    backtest,
    forecast,
    caveat: 'Statistical projection of the past pattern, not a prediction. It cannot know about promotions, holidays, price changes or new competitors.',
  };
}

module.exports = {
  getMarginsData, getKpis, costBreakdown, marginByDish, marginByPlatform, discountImpact,
  profitTrend, menuCosting, feeRules, recentOrders, priceSimulation,
  appStats, breakEvenDiscount, lossAnalysis, dayOfWeekPerformance, menuEngineering,
  periodComparison, costShockSimulation, platformShiftSimulation,
  outletComparison, anomalyDetection, profitForecast,
};