import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { getUser } from '../api/client';
import AIChat from '../components/AIChat';
import AIInsights from '../components/AIInsights';
import { formatINR } from '../hooks';
import Icon from '../components/Icon';
import { AnimatedNumber, Badge, Button, Card, EmptyState, ErrorText, Input, PageHeader, Select, Skeleton } from '../components/ui';

// Chart colours are CSS variables from index.css, so they follow the light/dark theme
const axisProps = { stroke: 'var(--line)', tick: { fill: 'var(--muted)', fontSize: 11 }, tickLine: false, axisLine: false };
const tooltipProps = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 4px 16px rgb(15 23 42 / 0.08)', fontSize: 12 },
  labelStyle: { color: 'var(--ink)', fontWeight: 600 },
  itemStyle: { color: 'var(--ink-2)' },
  cursor: { fill: 'var(--subtle)' },
};
const costColors = {
  'Food cost': 'var(--chart-food)', Commission: 'var(--chart-commission)', 'GST on commission': 'var(--chart-gst)',
  Discounts: 'var(--chart-discount)', Packaging: 'var(--chart-packaging)', Profit: 'var(--chart-profit)',
};

const marginTone = (pct) => (pct < 0 ? 'red' : pct < 20 ? 'amber' : 'green');
const marginLabel = (pct) => (pct < 0 ? 'Loss' : pct < 20 ? 'Thin' : 'Healthy');

function Kpi({ label, icon, value, format, valueClass = 'text-ink', footer, delay }) {
  return (
    <Card delay={delay} className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <Icon name={icon} className="w-4 h-4 text-muted" />
      </div>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${valueClass}`}>
        <AnimatedNumber value={value} format={format} />
      </p>
      <div className="mt-1.5 text-xs text-muted">{footer}</div>
    </Card>
  );
}

function ChartCard({ title, subtitle, delay, className = '', children }) {
  return (
    <Card delay={delay} className={`p-5 ${className}`}>
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Legend({ items }) {
  return (
    <div className="flex items-center gap-4 text-xs font-medium text-ink-2">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
      ))}
    </div>
  );
}

const filterSelect = 'w-auto! py-1.5 text-xs font-semibold';

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

  const k = data?.kpis;
  const perOrder = (v) => (k?.orderCount ? formatINR(v / k.orderCount) : '₹0');

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name?.split(' ')[0]}`} subtitle="Profit after commission, GST, discounts, packaging and food cost." />

      {/* Filter bar */}
      <Card className="relative z-10 mb-6 flex flex-wrap items-center gap-2 px-4 py-3">
        <Icon name="filter" className="mr-1 w-4 h-4 text-muted" />
        <Select aria-label="Outlet" className={filterSelect} value={outletId} onChange={(e) => { setOutletId(e.target.value); setDishId(''); }}>
          {(outlets || []).map((o) => <option key={o.id} value={o.id}>{o.name}{o.city ? ` · ${o.city}` : ''}</option>)}
        </Select>
        <Select aria-label="Platform" className={filterSelect} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label="Dish" className={filterSelect} value={dishId} onChange={(e) => setDishId(e.target.value)}>
          <option value="">All dishes</option>
          {dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" aria-label="From date" className={filterSelect} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-xs text-muted">to</span>
          <Input type="date" aria-label="To date" className={filterSelect} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto text-xs font-semibold text-accent hover:underline animate-fade-in">
            Clear filters
          </button>
        )}
      </Card>

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          <Skeleton className="col-span-2 h-72" />
          <Skeleton className="col-span-2 h-72" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Revenue" icon="wallet" value={k.totalRevenue} format={formatINR} delay={0}
              footer={<>Avg order <span className="font-semibold text-ink-2">{perOrder(k.totalRevenue)}</span></>} />
            <Kpi label="Net profit" icon="trend" value={k.totalProfit} format={formatINR} delay={50}
              valueClass={k.totalProfit >= 0 ? 'text-ink' : 'text-bad'}
              footer={<><span className="font-semibold text-ink-2">{perOrder(k.totalProfit)}</span> per order</>} />
            <Kpi label="Net margin" icon="percent" value={k.marginPct} format={(v) => `${v.toFixed(1)}%`} delay={100}
              valueClass={k.marginPct < 0 ? 'text-bad' : 'text-good'}
              footer={<Badge tone={marginTone(k.marginPct)}>{marginLabel(k.marginPct)}</Badge>} />
            <Kpi label="Orders" icon="bag" value={k.orderCount} format={(v) => Math.round(v)} delay={150}
              footer={data.platformBreakdown.map((p) => `${p.platform_name} ${p.orders}`).join(' · ') || 'No orders yet'} />
          </div>

          <AIInsights outletId={outletId} filters={filters} />

          {/* Trend + cost split */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Revenue vs profit" subtitle="Daily totals for the selected filters" delay={150} className="lg:col-span-2">
              <div className="-mt-9 mb-3 flex justify-end"><Legend items={[['Revenue', 'var(--chart-revenue)'], ['Profit', 'var(--chart-profit)']]} /></div>
              <ResponsiveContainer width="100%" height={330}>
                <AreaChart data={data.trend} margin={{ right: 8, left: -8 }}>
                  <defs>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-profit)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-profit)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tickFormatter={formatINR} width={60} {...axisProps} />
                  <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} cursor={{ stroke: 'var(--line)' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-revenue)" strokeWidth={2} strokeDasharray="4 4" fill="none" animationDuration={800} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="var(--chart-profit)" strokeWidth={2.5} fill="url(#profitFill)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Where the money goes" subtitle="Share of revenue taken by each cost" delay={200}>
              {k.totalRevenue > 0 ? (
                <>
                  <div className="relative mx-auto h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.costBreakdown.filter((c) => c.amount > 0)} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={1.5} stroke="none" animationDuration={800}>
                          {data.costBreakdown.filter((c) => c.amount > 0).map((c) => <Cell key={c.name} fill={costColors[c.name]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-extrabold text-ink">₹{k.marginPct.toFixed(1)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-good">kept per ₹100</span>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs">
                    {data.costBreakdown.map((c) => (
                      <li key={c.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-ink-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: costColors[c.name] }} />{c.name}
                        </span>
                        <span className={`font-semibold ${c.name === 'Profit' ? (c.amount >= 0 ? 'text-good' : 'text-bad') : 'text-ink'}`}>
                          {formatINR(c.amount)} <span className="font-normal text-muted">{((c.amount / k.totalRevenue) * 100).toFixed(1)}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="py-10 text-center text-sm text-muted">No orders in this range yet.</p>}
            </ChartCard>
          </div>

          {/* Dish + platform */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Profit by dish" subtitle="Total profit per dish, losses in red" delay={250}>
              <ResponsiveContainer width="100%" height={Math.max(220, data.dishBreakdown.length * 44)}>
                <BarChart data={data.dishBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatINR} {...axisProps} />
                  <YAxis type="category" dataKey="dish_name" width={130} interval={0} {...axisProps} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} />
                  <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]} barSize={18} animationDuration={800}>
                    {data.dishBreakdown.map((d) => <Cell key={d.dish_name} fill={d.profit >= 0 ? 'var(--chart-profit)' : 'var(--chart-loss)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Profit by platform" subtitle="Revenue vs what you keep, best margin first" delay={300}>
              <div className="-mt-9 mb-3 flex justify-end"><Legend items={[['Revenue', 'var(--chart-revenue)'], ['Profit', 'var(--chart-profit)']]} /></div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.platformBreakdown} margin={{ right: 8, left: -8 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="platform_name" {...axisProps} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} />
                  <YAxis tickFormatter={formatINR} width={60} {...axisProps} />
                  <Tooltip formatter={(v) => formatINR(v)} {...tooltipProps} />
                  <Bar dataKey="revenue" name="Revenue" fill="var(--chart-revenue)" fillOpacity={0.45} radius={[4, 4, 0, 0]} barSize={28} animationDuration={800} />
                  <Bar dataKey="profit" name="Profit" fill="var(--chart-profit)" radius={[4, 4, 0, 0]} barSize={28} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.platformBreakdown.map((p) => (
                  <Badge key={p.platform_name} tone={marginTone(p.marginPct)}>{p.platform_name} · {p.marginPct.toFixed(1)}%</Badge>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* AI Assistant */}
          <div className="mb-6">
            <AIChat outletId={outletId} filters={filters} />
          </div>

          {/* Dish table, worst margin first */}
          <Card delay={350} className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-sm font-bold text-ink">Dishes ranked by margin</h2>
              <p className="text-xs text-muted">Worst performers first</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-[11px] uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2.5 text-left font-bold">Dish</th>
                    <th className="px-5 py-2.5 text-right font-bold">Orders</th>
                    <th className="px-5 py-2.5 text-right font-bold">Revenue</th>
                    <th className="px-5 py-2.5 text-right font-bold">Profit</th>
                    <th className="px-5 py-2.5 text-right font-bold">Margin</th>
                    <th className="px-5 py-2.5 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dishBreakdown.map((d, i) => (
                    <tr key={d.dish_name} style={{ animationDelay: `${i * 40}ms` }}
                      className="border-b border-line transition last:border-0 hover:bg-subtle animate-fade-up">
                      <td className="px-5 py-3 font-semibold text-ink">{d.dish_name}</td>
                      <td className="px-5 py-3 text-right text-ink-2">{d.orders}</td>
                      <td className="px-5 py-3 text-right text-ink-2">{formatINR(d.revenue)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${d.profit >= 0 ? 'text-good' : 'text-bad'}`}>{formatINR(d.profit)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-ink">{d.marginPct.toFixed(1)}%</td>
                      <td className="px-5 py-3 text-right"><Badge tone={marginTone(d.marginPct)}>{marginLabel(d.marginPct)}</Badge></td>
                    </tr>
                  ))}
                  {data.dishBreakdown.length === 0 && (
                    <tr><td colSpan="6" className="py-10 text-center text-muted">No orders in this range yet.</td></tr>
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
