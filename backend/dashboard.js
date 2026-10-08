const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');
const { getMarginsData } = require('./aiTools');

module.exports = (pool) => {
  async function verifyOutletOwnership(outletId, userId) {
    const result = await pool.query('SELECT id FROM outlets WHERE id = $1 AND owner_id = $2', [outletId, userId]);
    return result.rows.length > 0;
  }

  router.get('/margins', requireAuth, async (req, res) => {
    const { outlet_id, platform_id, dish_id, date_from, date_to } = req.query;
    if (!outlet_id) return res.status(400).json({ error: 'outlet_id is required' });

    const owns = await verifyOutletOwnership(outlet_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'You do not own this outlet' });

    try {
      // Profit per order (shared with the AI tools so both always agree)
      const rows = await getMarginsData(pool, outlet_id, { platform_id, dish_id, date_from, date_to });

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
        // pg returns DATE as local midnight; toISOString() would shift it a day back in IST
        const d = new Date(r.order_date);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!byDate[date]) byDate[date] = { date, revenue: 0, profit: 0 };
        byDate[date].revenue += r.orderValue;
        byDate[date].profit += r.profit;
      });
      const trend = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        kpis: { totalRevenue, totalProfit, marginPct, orderCount },
        dishBreakdown,
        trend,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
