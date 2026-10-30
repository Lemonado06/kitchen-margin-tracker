const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');
const { getMarginsData } = require('./aiTools');
const { outletFor } = require('./access');

module.exports = () => {
  router.get('/margins', requireAuth, async (req, res) => {
    const { outlet_id, platform_id, dish_id, date_from, date_to } = req.query;
    if (!outlet_id) return res.status(400).json({ error: 'outlet_id is required' });

    try {
      if (!(await outletFor(outlet_id, req.user))) return res.status(403).json({ error: 'You do not own this outlet' });

      // Profit per order (shared with the AI tools so both always agree)
      const rows = await getMarginsData(outlet_id, { platform_id, dish_id, date_from, date_to });

      // KPIs
      const totalRevenue = rows.reduce((s, r) => s + r.orderValue, 0);
      const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
      const orderCount = rows.length;
      const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Group by dish
      const byDish = {};
      rows.forEach(r => {
        if (!byDish[r.dish_name]) byDish[r.dish_name] = { dish_name: r.dish_name, revenue: 0, profit: 0, orders: 0 };
        byDish[r.dish_name].revenue += r.orderValue;
        byDish[r.dish_name].profit += r.profit;
        byDish[r.dish_name].orders += 1;
      });
      const dishBreakdown = Object.values(byDish)
        .map(d => ({ ...d, marginPct: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0 }))
        .sort((a, b) => a.marginPct - b.marginPct); // worst first

      // Group by date (for trend line)
      const byDate = {};
      rows.forEach(r => {
        const date = r.order_date; // already YYYY-MM-DD
        if (!byDate[date]) byDate[date] = { date, revenue: 0, profit: 0 };
        byDate[date].revenue += r.orderValue;
        byDate[date].profit += r.profit;
      });
      const trend = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

      // Group by platform, best margin first
      const byPlatform = {};
      rows.forEach(r => {
        if (!byPlatform[r.platform_name]) byPlatform[r.platform_name] = { platform_name: r.platform_name, revenue: 0, profit: 0, orders: 0 };
        byPlatform[r.platform_name].revenue += r.orderValue;
        byPlatform[r.platform_name].profit += r.profit;
        byPlatform[r.platform_name].orders += 1;
      });
      const platformBreakdown = Object.values(byPlatform)
        .map(p => ({ ...p, marginPct: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
        .sort((a, b) => b.marginPct - a.marginPct);

      // Where the revenue goes: every deduction plus what is left as profit
      const sum = (f) => rows.reduce((s, r) => s + f(r), 0);
      const costBreakdown = [
        { name: 'Food cost', amount: sum(r => r.food_cost) },
        { name: 'Commission', amount: sum(r => r.commission) },
        { name: 'GST on commission', amount: sum(r => r.gst_on_commission) },
        { name: 'Discounts', amount: sum(r => r.discount_amount) },
        { name: 'Packaging', amount: sum(r => r.packaging_cost) },
        { name: 'Profit', amount: totalProfit },
      ];

      res.json({
        kpis: { totalRevenue, totalProfit, marginPct, orderCount },
        dishBreakdown,
        platformBreakdown,
        costBreakdown,
        trend,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
