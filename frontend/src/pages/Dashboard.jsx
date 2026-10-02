import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import AIChat from '../components/AIChat';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [outlets, setOutlets] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  

  useEffect(() => {
    async function loadFilters() {
      try {
        const [outletsRes, platformsRes] = await Promise.all([
          api.get('/outlets'),
          api.get('/platforms'),
        ]);
        setOutlets(outletsRes.data);
        setPlatforms(platformsRes.data);
        if (outletsRes.data.length > 0) setOutletId(outletsRes.data[0].id);
      } catch (err) {
        setError('Failed to load filters');
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    if (!outletId) return;
    async function loadMargins() {
      try {
        const params = { outlet_id: outletId };
        if (platformId) params.platform_id = platformId;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await api.get('/dashboard/margins', { params });
        setData(res.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      }
    }
    loadMargins();
  }, [outletId, platformId, dateFrom, dateTo]);

  function fmt(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Profit Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {user.name} ({user.role})</p>
        </div>
        <Link to="/outlets" className="text-green-700 text-sm font-medium hover:underline">Manage Outlets &rarr;</Link>
      </header>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Outlet</label>
            <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1">
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Platform</label>
            <select value={platformId} onChange={(e) => setPlatformId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1">
              <option value="">All Platforms</option>
              {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1" />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{fmt(data.kpis.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Net Profit</p>
                <p className={`text-2xl font-bold mt-1 ${data.kpis.totalProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(data.kpis.totalProfit)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Margin %</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{data.kpis.marginPct.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Orders</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{data.kpis.orderCount}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-4">Profit by Dish</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.dishBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dish_name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Bar dataKey="profit" fill="#047857" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-4">Profit Trend</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Line type="monotone" dataKey="profit" stroke="#047857" strokeWidth={2} />
                    <Line type="monotone" dataKey="revenue" stroke="#9ca3af" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

                        {/* AI Assistant */}
            <div className="mb-6">
              <AIChat
                outletId={outletId}
                filters={{
                  platform_id: platformId || undefined,
                  date_from: dateFrom || undefined,
                  date_to: dateTo || undefined,
                }}
              />
            </div>

            {/* Dish table, worst margin first */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Dishes Ranked by Margin</h2>
                <p className="text-sm text-gray-500">Worst performers first</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="text-left py-2 px-4">Dish</th>
                    <th className="text-right py-2 px-4">Orders</th>
                    <th className="text-right py-2 px-4">Revenue</th>
                    <th className="text-right py-2 px-4">Profit</th>
                    <th className="text-right py-2 px-4">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.dishBreakdown.map((d) => (
                    <tr key={d.dish_name}>
                      <td className="py-3 px-4 font-medium text-gray-800">{d.dish_name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{d.orders}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{fmt(d.revenue)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${d.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(d.profit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          d.marginPct < 10 ? 'bg-red-100 text-red-700' :
                          d.marginPct < 20 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {d.marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.dishBreakdown.length === 0 && (
                    <tr><td colSpan="5" className="py-6 text-center text-gray-400">No orders in this range yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}