import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api, { getUser } from '../api/client';
import AIChat from '../components/AIChat';
import AIInsights from '../components/AIInsights';
import { formatINR } from '../hooks';
import Icon from '../components/Icon';
import { AnimatedNumber, Badge, Button, Card, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton } from '../components/ui';

const axisProps = { stroke: 'rgb(148 163 184 / 0.4)', tick: { fill: '#94a3b8', fontSize: 11 }, tickLine: false };
const tooltipProps = {
  contentStyle: { background: 'rgb(15 23 42 / 0.9)', border: '1px solid rgb(255 255 255 / 0.12)', borderRadius: 12, backdropFilter: 'blur(12px)' },
  labelStyle: { color: '#e2e8f0', fontWeight: 600 },
  itemStyle: { color: '#cbd5e1' },
  cursor: { fill: 'rgb(255 255 255 / 0.04)' },
};

function Kpi({ label, icon, tone, value, format, delay }) {
  return (
    <Card hover delay={delay} className="group relative overflow-hidden p-5">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-40 transition duration-500 group-hover:opacity-70 ${tone.glow}`} />
      <div className="relative flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={`rounded-xl p-2 ${tone.icon}`}><Icon name={icon} className="w-4 h-4" /></span>
      </div>
      <p className={`relative mt-3 text-3xl font-bold tracking-tight ${tone.text}`}>
        <AnimatedNumber value={value} format={format} />
      </p>
    </Card>
  );
}

export default function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [dishes, setDishes] = useState([]);
  const [dishId, setDishId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFilters() {
      try {
        const [outletsRes, platformsRes] = await Promise.all([api.get('/outlets'), api.get('/platforms')]);
        setOutlets(outletsRes.data);
        setPlatforms(platformsRes.data);
        if (outletsRes.data.length > 0) setOutletId(outletsRes.data[0].id);
      } catch {
        setError('Failed to load filters');
      }
    }
    loadFilters();
  }, []);

  // Dish filter options follow the selected outlet
  useEffect(() => {
    if (!outletId) return;
    api.get(`/dishes/outlet/${outletId}`).then((res) => setDishes(res.data)).catch(() => setDishes([]));
  }, [outletId]);

  useEffect(() => {
    if (!outletId) return;
    async function loadMargins() {
      try {
        const params = { outlet_id: outletId };
        if (platformId) params.platform_id = platformId;
        if (dishId) params.dish_id = dishId;
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
  }, [outletId, platformId, dishId, dateFrom, dateTo]);

  const hasFilters = platformId || dishId || dateFrom || dateTo;
  const filters = {
    platform_id: platformId || undefined,
    dish_id: dishId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };
  function clearFilters() {
    setPlatformId('');
    setDishId('');
    setDateFrom('');
    setDateTo('');
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (outlets && outlets.length === 0) {
    return (
      <>
        <PageHeader title={`${greeting}, ${user.name?.split(' ')[0]}`} subtitle="Your profit dashboard" />
        <EmptyState icon="store" title="No outlets yet">
          Add your first outlet, then its dishes and orders, and your margins will show up here.
          <span className="mt-4 block"><Button icon="plus" onClick={() => navigate('/outlets')}>Add an outlet</Button></span>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name?.split(' ')[0]}`} subtitle="Profit after commission, GST, discounts, packaging and food cost." />

      {/* Filters */}
      <Card className="relative z-10 mb-6 grid grid-cols-2 gap-4 p-5 md:grid-cols-3 xl:grid-cols-5">
        <Field label="Outlet">
          <Select value={outletId} onChange={(e) => { setOutletId(e.target.value); setDishId(''); }}>
            {(outlets || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Platform">
          <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
            <option value="">All platforms</option>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Dish">
          <Select value={dishId} onChange={(e) => setDishId(e.target.value)}>
            <option value="">All dishes</option>
            {dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
        {hasFilters && (
          <button onClick={clearFilters} className="col-span-2 justify-self-start text-xs font-semibold text-emerald-300 hover:text-emerald-200 md:col-span-3 xl:col-span-5 animate-fade-in">
            Clear filters
          </button>
        )}
      </Card>

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          <Skeleton className="col-span-2 h-72" />
          <Skeleton className="col-span-2 h-72" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi label="Total revenue" icon="wallet" value={data.kpis.totalRevenue} format={formatINR} delay={0}
              tone={{ glow: 'bg-cyan-500', icon: 'bg-cyan-400/10 text-cyan-300', text: 'text-white' }} />
            <Kpi label="Net profit" icon="trend" value={data.kpis.totalProfit} format={formatINR} delay={60}
              tone={data.kpis.totalProfit >= 0
                ? { glow: 'bg-emerald-500', icon: 'bg-emerald-400/10 text-emerald-300', text: 'text-emerald-300' }
                : { glow: 'bg-rose-500', icon: 'bg-rose-400/10 text-rose-300', text: 'text-rose-300' }} />
            <Kpi label="Margin" icon="percent" value={data.kpis.marginPct} format={(v) => `${v.toFixed(1)}%`} delay={120}
              tone={{ glow: 'bg-violet-500', icon: 'bg-violet-400/10 text-violet-300', text: 'text-white' }} />
            <Kpi label="Orders" icon="bag" value={data.kpis.orderCount} format={(v) => Math.round(v)} delay={180}
              tone={{ glow: 'bg-amber-500', icon: 'bg-amber-400/10 text-amber-300', text: 'text-white' }} />
          </div>

          <AIInsights outletId={outletId} filters={filters} />

          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card delay={200} className="p-5">
              <h2 className="mb-4 font-semibold text-white">Profit by dish</h2>
              {/* Horizontal bars so full dish names fit on the axis */}
              <ResponsiveContainer width="100%" height={Math.max(250, data.dishBreakdown.length * 44)}>
                <BarChart data={data.dishBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.06)" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatINR} {...axisProps} />
                  <YAxis type="category" dataKey="dish_name" width={130} interval={0} {...axisProps} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} />
                  <Bar dataKey="profit" name="Profit" radius={[0, 8, 8, 0]} animationDuration={900}>
                    {data.dishBreakdown.map((d) => (
                      <Cell key={d.dish_name} fill={d.profit >= 0 ? 'url(#profitBar)' : 'url(#lossBar)'} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="profitBar" x1="0" x2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
                    <linearGradient id="lossBar" x1="0" x2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card delay={260} className="p-5">
              <h2 className="mb-4 font-semibold text-white">Profit trend</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.trend} margin={{ right: 10 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} /><stop offset="100%" stopColor="#818cf8" stopOpacity={0} /></linearGradient>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.45} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis tickFormatter={formatINR} width={60} {...axisProps} />
                  <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} cursor={{ stroke: 'rgb(255 255 255 / 0.2)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#818cf8" strokeWidth={2} fill="url(#revFill)" animationDuration={1000} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#34d399" strokeWidth={2.5} fill="url(#profitFill)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* AI Assistant */}
          <div className="mb-6">
            <AIChat outletId={outletId} filters={filters} />
          </div>

          {/* Dish table, worst margin first */}
          <Card delay={320} className="overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <h2 className="font-semibold text-white">Dishes ranked by margin</h2>
              <p className="text-sm text-slate-400">Worst performers first</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left font-semibold">Dish</th>
                    <th className="px-5 py-3 text-right font-semibold">Orders</th>
                    <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-5 py-3 text-right font-semibold">Profit</th>
                    <th className="px-5 py-3 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dishBreakdown.map((d, i) => (
                    <tr key={d.dish_name} style={{ animationDelay: `${i * 50}ms` }}
                      className="border-b border-white/5 transition hover:bg-white/[0.04] animate-fade-up">
                      <td className="px-5 py-3.5 font-medium text-slate-100">{d.dish_name}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300">{d.orders}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300">{formatINR(d.revenue)}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${d.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {formatINR(d.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge tone={d.marginPct < 10 ? 'red' : d.marginPct < 20 ? 'amber' : 'green'}>{d.marginPct.toFixed(1)}%</Badge>
                      </td>
                    </tr>
                  ))}
                  {data.dishBreakdown.length === 0 && (
                    <tr><td colSpan="5" className="py-10 text-center text-slate-400">No orders in this range yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
