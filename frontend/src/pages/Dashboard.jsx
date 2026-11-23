
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import api, { getUser } from '../api/client';
import AIChat from '../components/AIChat';
import AIInsights from '../components/AIInsights';
import OutletPicker from '../components/OutletPicker';
import { formatINR } from '../hooks';
import Icon from '../components/Icon';
import { Button, EmptyState, ErrorText, Field, Input, Select, Skeleton } from '../components/ui';

const COLORS = {
  steel: '#ABABA9',
  profit: '#3DD68C',
  deduction: '#E5484D',
  amber: '#F2B134',
  paper: '#F2EDE0',
  muted: '#777D78',
  grid: '#2A2F2B',
  panel: '#151816',
};

const COST_COLORS = {
  'Food cost': '#D4A85C',
  Commission: '#E5484D',
  'GST on commission': '#F2B134',
  Discounts: '#B76B79',
  Packaging: '#7E9FBA',
  Profit: '#3DD68C',
};

const axisProps = {
  stroke: COLORS.muted,
  tick: { fill: COLORS.muted, fontSize: 10, fontFamily: 'JetBrains Mono' },
  tickLine: false,
  axisLine: false,
};

const tooltipProps = {
  contentStyle: {
    background: '#1A1C1B',
    border: '1px solid #3A403B',
    borderRadius: 6,
    color: '#F1F1EE',
    fontSize: 12,
    fontFamily: 'JetBrains Mono',
  },
  labelStyle: { color: '#F1F1EE', marginBottom: 4 },
  itemStyle: { color: '#F1F1EE' },
  cursor: { fill: 'rgba(255,255,255,0.035)' },
};

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function money(value) {
  return formatINR(Number(value) || 0);
}

function Panel({ children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-md border border-hairline bg-panel ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-on-steel">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-on-steel-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Kpi({ label, value, note, tone = 'normal', icon }) {
  const valueColor = {
    normal: 'text-on-steel',
    profit: 'text-profit',
    deduction: 'text-deduction',
    amber: 'text-amber',
  }[tone];

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-on-steel-muted">{label}</p>
        {icon && (
          <span className="rounded-sm border border-hairline bg-panel-elevated p-2 text-on-steel-muted">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-3 break-words font-mono text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${valueColor}`}>
        {value}
      </p>
      {note && <p className="mt-2 text-[11px] leading-relaxed text-on-steel-muted">{note}</p>}
    </Panel>
  );
}

function DateRangeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-sm border px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-hairline bg-panel-elevated text-on-steel'
          : 'border-transparent text-on-steel-muted hover:text-on-steel',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ChartEmpty({ children = 'No data available for this selection.' }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-center text-xs text-on-steel-muted">
      {children}
    </div>
  );
}

function MarginLabel({ value }) {
  const tone = value < 10 ? 'text-deduction' : value < 20 ? 'text-amber' : 'text-profit';
  return (
    <span className={`font-mono text-xs tabular-nums ${tone}`}>
      {Number(value || 0).toFixed(1)}%
    </span>
  );
}

function DishRanking({ dishes, direction = 'best' }) {
  const sorted = [...dishes].sort((a, b) =>
    direction === 'best' ? b.profit - a.profit : a.profit - b.profit
  );
  const visible = sorted.slice(0, 4);

  if (!visible.length) {
    return <ChartEmpty>No dish performance data yet.</ChartEmpty>;
  }

  return (
    <div className="divide-y divide-hairline">
      {visible.map((dish, index) => (
        <div
          key={`${dish.dish_name}-${index}`}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-steel">{dish.dish_name}</p>
            <p className="mt-1 font-mono text-[10px] text-on-steel-muted">
              {dish.orders} orders · {money(dish.revenue)} revenue
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-mono text-sm font-semibold tabular-nums ${dish.profit >= 0 ? 'text-profit' : 'text-deduction'}`}>
              {dish.profit < 0 ? '−' : '+'}{money(Math.abs(dish.profit))}
            </p>
            <MarginLabel value={dish.marginPct} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();

  const [outlets, setOutlets] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [outletIds, setOutletIds] = useState([]);
  const [platformId, setPlatformId] = useState('');
  const [dishes, setDishes] = useState([]);
  const [dishId, setDishId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const [outletsRes, platformsRes] = await Promise.all([
          api.get('/outlets'),
          api.get('/platforms'),
        ]);

        if (cancelled) return;

        setOutlets(outletsRes.data);
        setPlatforms(platformsRes.data);
        setOutletIds(outletsRes.data.slice(0, 10).map((outlet) => outlet.id));
      } catch {
        if (!cancelled) setError('Failed to load dashboard filters.');
      }
    }

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  const outletKey = outletIds.join(',');
  const multi = outletIds.length > 1;

  const outletNames = useMemo(
    () => new Map((outlets || []).map((outlet) => [outlet.id, outlet.name])),
    [outlets]
  );

  // Hide stale dashboard data when no outlets are selected.
  const visibleData = outletIds.length > 0 ? data : null;

  useEffect(() => {
    if (!outlets || !outletKey) return;

    let cancelled = false;

    Promise.all(
      outletIds.map((id) =>
        api.get(`/dishes/outlet/${id}`).then((res) =>
          res.data.map((dish) => ({
            ...dish,
            label: multi
              ? `${dish.name} (${outletNames.get(id) || ''})`
              : dish.name,
          }))
        )
      )
    )
      .then((lists) => {
        if (!cancelled) setDishes(lists.flat());
      })
      .catch(() => {
        if (!cancelled) setDishes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [outletKey, outletIds, outlets, multi, outletNames]);

  useEffect(() => {
    if (!outletKey) return;

    let cancelled = false;

    async function loadMargins() {
      setLoading(true);

      try {
        const params = { outlet_ids: outletKey };

        if (platformId) params.platform_id = platformId;
        if (dishId) params.dish_id = dishId;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const res = await api.get('/dashboard/margins', { params });

        if (!cancelled) {
          setData(res.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load dashboard data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMargins();

    return () => {
      cancelled = true;
    };
  }, [outletKey, outletIds.length, platformId, dishId, dateFrom, dateTo]);

  const hasFilters = Boolean(platformId || dishId || dateFrom || dateTo);

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

  function setQuickRange(days) {
    if (days === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }

    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));

    setDateFrom(localDate(from));
    setDateTo(localDate(today));
  }

  const today = new Date();
  const greeting =
    today.getHours() < 12
      ? 'Good morning'
      : today.getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';

  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';

  if (outlets && outlets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="border-b border-hairline pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-steel-muted">
            Overview / Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl text-on-steel">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-on-steel-muted">Your financial overview.</p>
        </div>

        <EmptyState icon="store" title="No outlets yet">
          Add your first outlet, then its dishes and orders, and your margins will show up here.
          <span className="mt-4 block">
            <Button icon="plus" onClick={() => navigate('/outlets')}>
              Add an outlet
            </Button>
          </span>
        </EmptyState>
      </div>
    );
  }

  const kpis = visibleData?.kpis || {};
  const dishBreakdown = visibleData?.dishBreakdown || [];
  const platformBreakdown = visibleData?.platformBreakdown || [];
  const outletBreakdown = visibleData?.outletBreakdown || [];
  const trend = visibleData?.trend || [];
  const costBreakdown = visibleData?.costBreakdown || [];

  const lossDishes = dishBreakdown.filter((dish) => dish.profit < 0);
  const lowMarginDishes = dishBreakdown.filter(
    (dish) => dish.profit >= 0 && dish.marginPct < 10
  );

  const totalRevenue = Number(kpis.totalRevenue || 0);
  const costParts = costBreakdown.filter((item) => item.amount > 0);

  const platformTotal = platformBreakdown.reduce(
    (sum, platform) => sum + Number(platform.revenue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Dashboard heading */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-steel-muted">
            Overview / Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-on-steel sm:text-4xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-on-steel-muted">
            Revenue is vanity. Profit after every deduction is what matters.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-sm border border-hairline bg-panel px-3 py-2">
          <span className={`h-2 w-2 rounded-full ${loading ? 'bg-amber' : 'bg-profit'}`} />
          <span className="font-mono text-[10px] uppercase tracking-wide text-on-steel-muted">
            {loading ? 'Updating data' : 'Live dashboard'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Panel className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-on-steel">Report filters</p>
            <p className="mt-1 text-xs text-on-steel-muted">
              Select outlets, channels, dishes and reporting dates.
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-profit hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Outlets">
            <OutletPicker
              outlets={outlets || []}
              selected={outletIds}
              onChange={(ids) => {
                setOutletIds(ids);
                setDishId('');
              }}
            />
          </Field>

          <Field label="Platform">
            <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
              <option value="">All platforms</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Dish">
            <Select value={dishId} onChange={(e) => setDishId(e.target.value)}>
              <option value="">All dishes</option>
              {dishes.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.label || dish.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Field>

          <Field label="To">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1 rounded-sm border border-hairline bg-stainless-bg p-1">
          <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-on-steel-muted">
            Quick range
          </span>
          <DateRangeButton active={!dateFrom && !dateTo} onClick={() => setQuickRange('all')}>
            All time
          </DateRangeButton>
          <DateRangeButton
            active={dateFrom === localDate(today) && dateTo === localDate(today)}
            onClick={() => setQuickRange(1)}
          >
            Today
          </DateRangeButton>
          <DateRangeButton
            active={dateFrom === localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)) && dateTo === localDate(today)}
            onClick={() => setQuickRange(7)}
          >
            7 days
          </DateRangeButton>
          <DateRangeButton
            active={dateFrom === localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)) && dateTo === localDate(today)}
            onClick={() => setQuickRange(30)}
          >
            30 days
          </DateRangeButton>
        </div>
      </Panel>

      <ErrorText>{error}</ErrorText>

      {!visibleData ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-steel-muted">
                Financial summary
              </p>
              <span className="font-mono text-[10px] text-on-steel-muted">
                {outletIds.length} selected outlet{outletIds.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Total revenue"
                value={money(kpis.totalRevenue)}
                note="Gross order value"
                icon="wallet"
              />
              <Kpi
                label="Net profit"
                value={money(kpis.totalProfit)}
                note="After all recorded costs and fees"
                icon="trend"
                tone={Number(kpis.totalProfit) >= 0 ? 'profit' : 'deduction'}
              />
              <Kpi
                label="Profit margin"
                value={`${Number(kpis.marginPct || 0).toFixed(1)}%`}
                note="Net profit as a share of revenue"
                icon="percent"
                tone={Number(kpis.marginPct) < 10 ? 'amber' : 'profit'}
              />
              <Kpi
                label="Total orders"
                value={Number(kpis.orderCount || 0).toLocaleString('en-IN')}
                note="Orders in the selected period"
                icon="bag"
              />
            </div>
          </section>

          {/* Loss-making dish alert */}
          {(lossDishes.length > 0 || lowMarginDishes.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber/40 bg-panel px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 shrink-0 text-amber">
                  <Icon name="alert" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber">
                    {lossDishes.length > 0
                      ? `${lossDishes.length} loss-making dish${lossDishes.length === 1 ? '' : 'es'} detected`
                      : `${lowMarginDishes.length} dish${lowMarginDishes.length === 1 ? '' : 'es'} with low margins`}
                  </p>
                  <p className="mt-1 text-xs text-on-steel-muted">
                    {lossDishes.length > 0
                      ? `${lossDishes.slice(0, 2).map((dish) => dish.dish_name).join(', ')} ${lossDishes.length > 1 ? 'are' : 'is'} currently operating at a loss.`
                      : `${lowMarginDishes.slice(0, 2).map((dish) => dish.dish_name).join(', ')} ${lowMarginDishes.length > 1 ? 'have' : 'has'} a margin below 10%.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/outlets')}
                className="shrink-0 font-mono text-xs text-amber hover:underline"
              >
                Review menu →
              </button>
            </div>
          )}

          {/* AI insights */}
          <AIInsights outletIds={outletIds} filters={filters} />

          {/* Trend and platform */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <Panel className="p-4 sm:p-6 xl:col-span-8">
              <SectionHeading
                title="Revenue & net profit trend"
                subtitle="Gross order value against net kitchen profit"
              />

              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.steel} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={COLORS.steel} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashboardProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.profit} stopOpacity={0.24} />
                        <stop offset="100%" stopColor={COLORS.profit} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="date" {...axisProps} tickMargin={10} />
                    <YAxis
                      {...axisProps}
                      width={65}
                      tickFormatter={(value) => {
                        const amount = Number(value) || 0;
                        return amount >= 1000
                          ? `₹${(amount / 1000).toFixed(0)}k`
                          : `₹${amount}`;
                      }}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value) => money(value)}
                    />
                    <Legend
                      wrapperStyle={{
                        color: COLORS.steel,
                        fontSize: 11,
                        paddingTop: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={COLORS.steel}
                      strokeWidth={2}
                      fill="url(#dashboardRevenueFill)"
                      activeDot={{ r: 4, fill: COLORS.steel }}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Net profit"
                      stroke={COLORS.profit}
                      strokeWidth={2.5}
                      fill="url(#dashboardProfitFill)"
                      activeDot={{ r: 4, fill: COLORS.profit }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>No order history for the selected dates.</ChartEmpty>
              )}
            </Panel>

            <Panel className="p-4 sm:p-6 xl:col-span-4">
              <SectionHeading
                title="Revenue by platform"
                subtitle="Channel share and effective margin"
              />

              {platformBreakdown.length > 0 ? (
                <div className="space-y-5">
                  {platformBreakdown.map((platform) => {
                    const share = platformTotal > 0
                      ? (Number(platform.revenue || 0) / platformTotal) * 100
                      : 0;

                    return (
                      <div key={platform.platform_name}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-on-steel">
                            {platform.platform_name}
                          </span>
                          <span className="font-mono text-xs tabular-nums text-on-steel">
                            {money(platform.revenue)}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-sm bg-stainless-bg">
                          <div
                            className="h-full rounded-sm bg-profit transition-all"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-on-steel-muted">
                            {share.toFixed(1)}% of revenue
                          </span>
                          <MarginLabel value={platform.marginPct} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ChartEmpty>No platform data available.</ChartEmpty>
              )}
            </Panel>
          </section>

          {/* Dish rankings */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel className="p-4 sm:p-6">
              <SectionHeading
                title="Most profitable dishes"
                subtitle="Highest total profit in the selected period"
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/outlets')}
                    className="font-mono text-[10px] text-profit hover:underline"
                  >
                    View menu →
                  </button>
                }
              />
              <DishRanking dishes={dishBreakdown} direction="best" />
            </Panel>

            <Panel className="p-4 sm:p-6">
              <SectionHeading
                title="Least profitable dishes"
                subtitle="Lowest total profit in the selected period"
                action={
                  lossDishes.length > 0 ? (
                    <span className="rounded-sm bg-deduction/10 px-2 py-1 font-mono text-[10px] text-deduction">
                      Action needed
                    </span>
                  ) : null
                }
              />
              <DishRanking dishes={dishBreakdown} direction="worst" />
            </Panel>
          </section>

          {/* Outlet comparison and profit by dish */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {multi && (
              <Panel className="p-4 sm:p-6">
                <SectionHeading
                  title="Outlet performance"
                  subtitle="Revenue, net profit and margin by location"
                  action={
                    <button
                      type="button"
                      onClick={() => navigate('/outlets')}
                      className="font-mono text-[10px] text-profit hover:underline"
                    >
                      Manage →
                    </button>
                  }
                />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[430px] text-left">
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-wide text-on-steel-muted">
                        <th className="pb-3 font-medium">Outlet</th>
                        <th className="pb-3 text-right font-medium">Revenue</th>
                        <th className="pb-3 text-right font-medium">Profit</th>
                        <th className="pb-3 text-right font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {outletBreakdown.map((outlet) => (
                        <tr key={outlet.outlet_id}>
                          <td className="py-3 pr-2 text-xs font-medium text-on-steel">
                            {outlet.outlet_name}
                          </td>
                          <td className="py-3 text-right font-mono text-[11px] tabular-nums text-on-steel">
                            {money(outlet.revenue)}
                          </td>
                          <td className={`py-3 text-right font-mono text-[11px] tabular-nums ${outlet.profit >= 0 ? 'text-profit' : 'text-deduction'}`}>
                            {money(outlet.profit)}
                          </td>
                          <td className="py-3 text-right">
                            <MarginLabel value={outlet.marginPct} />
                          </td>
                        </tr>
                      ))}
                      {outletBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-on-steel-muted">
                            No outlet comparison data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            <Panel className={`p-4 sm:p-6 ${multi ? '' : 'xl:col-span-2'}`}>
              <SectionHeading
                title="Profit by dish"
                subtitle="Total net profit after all recorded deductions"
              />

              {dishBreakdown.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(230, Math.min(dishBreakdown.length, 9) * 38)}
                >
                  <BarChart
                    data={dishBreakdown.slice(0, 9)}
                    layout="vertical"
                    margin={{ left: 4, right: 18, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      {...axisProps}
                      tickFormatter={(value) => {
                        const amount = Number(value) || 0;
                        return amount >= 1000
                          ? `₹${(amount / 1000).toFixed(0)}k`
                          : `₹${amount}`;
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="dish_name"
                      width={125}
                      interval={0}
                      {...axisProps}
                      tick={{ fill: COLORS.steel, fontSize: 10 }}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value) => money(value)}
                    />
                    <Bar dataKey="profit" name="Net profit" radius={[0, 3, 3, 0]}>
                      {dishBreakdown.slice(0, 9).map((dish, index) => (
                        <Cell
                          key={`${dish.dish_name}-${index}`}
                          fill={dish.profit >= 0 ? COLORS.profit : COLORS.deduction}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>No dish profit data available.</ChartEmpty>
              )}
            </Panel>
          </section>

          {/* Cost breakdown receipt */}
          <Panel className="overflow-hidden">
            <div className="border-b border-hairline p-4 sm:p-6">
              <SectionHeading
                title="Where the money goes"
                subtitle="A breakdown of revenue after costs, commissions and deductions"
              />
            </div>

            {totalRevenue > 0 && costParts.length > 0 ? (
              <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
                <div className="flex min-w-0 items-center justify-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={costParts}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={66}
                        outerRadius={102}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {costParts.map((item) => (
                          <Cell
                            key={item.name}
                            fill={COST_COLORS[item.name] || COLORS.steel}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        {...tooltipProps}
                        formatter={(value) => money(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="receipt-paper receipt-edge mx-auto w-full max-w-lg p-5 sm:p-7">
                  <div className="text-center">
                    <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink-muted">
                      KITCHEN MARGIN TRACKER
                    </p>
                    <h3 className="mt-2 font-display text-2xl text-ink">
                      Financial receipt
                    </h3>
                    <p className="mt-1 font-mono text-[10px] text-ink-muted">
                      {dateFrom || 'All time'} — {dateTo || 'Present'}
                    </p>
                  </div>

                  <hr className="receipt-divider my-5" />

                  <div className="flex items-center justify-between gap-3 font-mono text-xs font-bold text-ink">
                    <span>GROSS REVENUE</span>
                    <span className="tabular-nums">{money(totalRevenue)}</span>
                  </div>

                  <hr className="receipt-divider my-4" />

                  <div className="space-y-3">
                    {costBreakdown.map((item) => {
                      const isProfit = item.name === 'Profit';
                      const amount = Number(item.amount || 0);
                      const percentage = totalRevenue > 0
                        ? (amount / totalRevenue) * 100
                        : 0;

                      return (
                        <div
                          key={item.name}
                          className="flex items-start justify-between gap-4 font-mono text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2 text-ink">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: COST_COLORS[item.name] || COLORS.steel,
                              }}
                            />
                            <span className="truncate">{item.name}</span>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className={`tabular-nums ${isProfit ? amount >= 0 ? 'font-bold text-profit-ink' : 'font-bold text-deduction-ink' : 'text-ink'}`}>
                              {money(amount)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-ink-muted">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <hr className="receipt-divider my-4" />

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-ink">
                      NET PROFIT
                    </span>
                    <span className={`font-mono text-lg font-bold tabular-nums ${Number(kpis.totalProfit) >= 0 ? 'text-profit-ink' : 'text-deduction-ink'}`}>
                      {money(kpis.totalProfit)}
                    </span>
                  </div>

                  <p className="mt-5 text-center font-mono text-[9px] tracking-wide text-ink-muted">
                    EVERY RUPEE ACCOUNTED FOR
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-on-steel-muted">
                No revenue or cost data in the selected period.
              </div>
            )}
          </Panel>

          {/* AI assistant */}
          <section>
            <div className="mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-steel-muted">
                Ask your data
              </p>
              <h2 className="mt-1 font-display text-2xl text-on-steel">
                The numbers can answer back.
              </h2>
            </div>
            <AIChat outletIds={outletIds} filters={filters} />
          </section>

          {/* Full dish table */}
          <Panel className="overflow-hidden">
            <div className="border-b border-hairline p-4 sm:p-6">
              <SectionHeading
                title="Dish performance register"
                subtitle="All dishes ranked by profit margin, lowest first"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-wide text-on-steel-muted">
                    <th className="px-5 py-3 text-left font-medium">Dish</th>
                    <th className="px-5 py-3 text-right font-medium">Orders</th>
                    <th className="px-5 py-3 text-right font-medium">Revenue</th>
                    <th className="px-5 py-3 text-right font-medium">Profit</th>
                    <th className="px-5 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-hairline">
                  {[...dishBreakdown]
                    .sort((a, b) => a.marginPct - b.marginPct)
                    .map((dish, index) => (
                      <tr
                        key={`${dish.dish_name}-${index}`}
                        className="transition-colors hover:bg-panel-elevated"
                      >
                        <td className="px-5 py-3.5 font-medium text-on-steel">
                          {dish.dish_name}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-on-steel-muted">
                          {dish.orders}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-on-steel">
                          {money(dish.revenue)}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-mono text-xs font-semibold tabular-nums ${dish.profit >= 0 ? 'text-profit' : 'text-deduction'}`}>
                          {money(dish.profit)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <MarginLabel value={dish.marginPct} />
                        </td>
                      </tr>
                    ))}

                  {dishBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-xs text-on-steel-muted">
                        No dish data in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
