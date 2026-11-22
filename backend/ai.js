const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { requireAuth } = require('./middleware');
const tools = require('./aiTools');
const { Dish, Platform } = require('./models');
const { outletFor, validId } = require('./access');

const list = (value) => value.split(',').map((m) => m.trim()).filter(Boolean);
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 25000;

// Groq models first (fast, generous free tier), then Gemini as the backup provider.
// Each is tried in order; a busy or failing model falls through to the next one
const MODELS = [
  ...(process.env.GROQ_API_KEY ? list(process.env.GROQ_MODELS || 'openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b').map((model) => ({ provider: 'groq', model })) : []),
  ...(process.env.GEMINI_API_KEY ? list(process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-flash-latest').map((model) => ({ provider: 'gemini', model })) : []),
];

// The SDK's default is 5 retries with up to 60 s between them; keep each call short and let the
// model fallback below handle a busy model instead
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } } })
  : null;

// Tool parameters as JSON Schema (what Groq expects); toGeminiSchema converts them for Gemini
const noArgs = { type: 'object', properties: {} };
const toolDeclarations = [
  { name: 'get_kpis', description: 'Totals for the filtered orders: order count, revenue, profit, margin %, average order value, average profit per order, number of loss-making orders.', parameters: noArgs },
  { name: 'cost_breakdown', description: 'Where the revenue goes: commission, GST on commission, discounts, packaging, food cost and profit, each in rupees and as % of revenue.', parameters: noArgs },
  { name: 'margin_by_dish', description: 'Revenue, profit, order count and margin % per dish, worst margin first.', parameters: noArgs },
  { name: 'margin_by_platform', description: 'Revenue, profit, order count and margin % per delivery platform (e.g. Zomato, Swiggy, Direct), best first.', parameters: noArgs },
  { name: 'discount_impact', description: 'Compares discounted and full-price orders: counts, total discount given and average profit per order.', parameters: noArgs },
  {
    name: 'profit_trend', description: 'Revenue and profit per day or per week, oldest first.',
    parameters: { type: 'object', properties: { group_by: { type: 'string', enum: ['day', 'week'], description: 'Bucket size, default day' } } },
  },
  { name: 'menu_costing', description: 'For every dish on the menu: price, food cost from its recipe items, food cost % and gross margin per plate. Ignores order filters.', parameters: noArgs },
  { name: 'fee_rules', description: 'Commission % and GST-on-commission % each platform charges this outlet, and the effective cut.', parameters: noArgs },
  {
    name: 'recent_orders', description: 'The most recent orders with dish, platform, value, discount and profit.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'How many orders, 1-25, default 10' } } },
  },
  {
    name: 'price_simulation', description: 'What-if analysis: profit on a dish\'s past orders if its price were different. Give new_price or change_pct. Optionally give volume_change_pct to model fewer or more orders. When a rise would help, it also returns how far orders can fall before the rise stops paying off.',
    parameters: {
      type: 'object',
      properties: {
        dish_name: { type: 'string', description: 'Dish name as on the menu' },
        new_price: { type: 'number', description: 'New menu price in rupees' },
        change_pct: { type: 'number', description: 'Price change in percent, e.g. 10 or -5' },
        volume_change_pct: { type: 'number', description: 'Assumed change in number of orders in percent, e.g. -10 for 10% fewer orders. Omit to keep volume the same.' },
      },
      required: ['dish_name'],
    },
  },
  { name: 'app_stats', description: 'Facts about the app itself (name, purpose, profit formula, owner and manager roles) and counts for this account: outlets, managers, dishes, orders, fee rules, platforms and the first and last order dates. Counts cover only the signed-in owner\'s account. Ignores order filters.', parameters: noArgs },
  {
    name: 'break_even_discount', description: 'For each dish on each platform: the most discount an order can carry before it loses money, the average discount actually given, and the headroom between them. Smallest headroom first.',
    parameters: { type: 'object', properties: { dish_name: { type: 'string', description: 'Optional: limit to one dish' } } },
  },
  { name: 'loss_analysis', description: 'Why orders lose money: how many orders are loss-making, the total loss, and the worst dish and platform combinations with their average discount, food cost, platform fees and which cost is the largest.', parameters: noArgs },
  { name: 'day_of_week_performance', description: 'Orders, revenue, profit, margin % and average profit per order for each day of the week. Shows whether weekends are more profitable or just busier.', parameters: noArgs },
  { name: 'menu_engineering', description: 'Sorts every dish into Star (popular and profitable), Plowhorse (popular but thin), Puzzle (profitable but rarely ordered) or Dog (neither), with a suggested action for each.', parameters: noArgs },
  {
    name: 'period_comparison', description: 'Compares the latest N days with the N days before them: orders, revenue, profit, margin and the % change. Uses the platform and dish filters but sets its own date ranges.',
    parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Length of each period in days, 1-180, default 30' } } },
  },
  {
    name: 'cost_shock_simulation', description: 'What-if analysis: effect on profit if an ingredient\'s cost goes up or down, for every dish that uses it. Prices and order volumes are held the same.',
    parameters: {
      type: 'object',
      properties: {
        ingredient_name: { type: 'string', description: 'Ingredient name or part of it, e.g. Chicken' },
        change_pct: { type: 'number', description: 'Cost change in percent, e.g. 10 or -5' },
      },
      required: ['ingredient_name', 'change_pct'],
    },
  },
  {
    name: 'platform_shift_simulation', description: 'What-if analysis: profit change if some orders moved from one platform to another (e.g. Swiggy to Direct). Only platform fees change; it does not predict whether customers would switch.',
    parameters: {
      type: 'object',
      properties: {
        from_platform: { type: 'string', description: 'Platform the orders move from, e.g. Swiggy' },
        to_platform: { type: 'string', description: 'Platform the orders move to, e.g. Direct' },
        dish_name: { type: 'string', description: 'Optional: limit to one dish' },
        share_pct: { type: 'number', description: 'Percent of those orders that move, 0-100, default 100' },
      },
      required: ['from_platform', 'to_platform'],
    },
  },
  { name: 'outlet_comparison', description: 'Compares the selected outlets: orders, revenue, profit, margin %, discount share, loss-making share, each outlet\'s best and worst dish and platform, ranked by profit. Most useful when several outlets are selected.', parameters: noArgs },
  {
    name: 'anomaly_detection', description: 'Finds unusual days (order count, margin %) and unusual dish-weeks (weekly margin %) compared with the same weekday or the dish\'s own previous weeks. Needs at least 5 weeks of orders.',
    parameters: { type: 'object', properties: { threshold: { type: 'number', description: 'Sensitivity in robust standard deviations, 2 to 6, default 3. Lower finds more.' } } },
  },
  {
    name: 'profit_forecast', description: 'EXPERIMENT: projects daily profit forward from the weekday pattern and trend of the last 8 weeks, and backtests the same method on the last 4 weeks. Needs at least 4 weeks of orders.',
    parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Days to project, 1-28, default 14' } } },
  },
];

// Gemini's schema uses upper-case type names (OBJECT, STRING, ...)
function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : toGeminiSchema(v)]));
}
const geminiTools = [{ functionDeclarations: toolDeclarations.map((t) => ({ ...t, parameters: toGeminiSchema(t.parameters) })) }];
const groqTools = toolDeclarations.map((t) => ({ type: 'function', function: t }));

const toolImpl = {
  get_kpis: (o, f) => tools.getKpis(o, f),
  cost_breakdown: (o, f) => tools.costBreakdown(o, f),
  margin_by_dish: (o, f) => tools.marginByDish(o, f),
  margin_by_platform: (o, f) => tools.marginByPlatform(o, f),
  discount_impact: (o, f) => tools.discountImpact(o, f),
  profit_trend: (o, f, a) => tools.profitTrend(o, f, a),
  menu_costing: (o) => tools.menuCosting(o),
  fee_rules: (o) => tools.feeRules(o),
  recent_orders: (o, f, a) => tools.recentOrders(o, f, a),
  price_simulation: (o, f, a) => tools.priceSimulation(o, f, a),
  app_stats: (o) => tools.appStats(o),
  break_even_discount: (o, f, a) => tools.breakEvenDiscount(o, f, a),
  loss_analysis: (o, f) => tools.lossAnalysis(o, f),
  day_of_week_performance: (o, f) => tools.dayOfWeekPerformance(o, f),
  menu_engineering: (o, f) => tools.menuEngineering(o, f),
  period_comparison: (o, f, a) => tools.periodComparison(o, f, a),
  cost_shock_simulation: (o, f, a) => tools.costShockSimulation(o, f, a),
  platform_shift_simulation: (o, f, a) => tools.platformShiftSimulation(o, f, a),
  outlet_comparison: (o, f) => tools.outletComparison(o, f),
  anomaly_detection: (o, f, a) => tools.anomalyDetection(o, f, a),
  profit_forecast: (o, f, a) => tools.profitForecast(o, f, a),
};

const isBusy = (err) => /503|504|429|UNAVAILABLE|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|overloaded|high demand|rate limit|timed? ?out|abort/i.test(`${err?.name} ${err?.message}`);

// Keep only the filters the margin engine understands, with valid ids
function cleanFilters(filters = {}) {
  const out = {};
  for (const key of ['platform_id', 'dish_id']) if (filters[key] && validId(filters[key])) out[key] = filters[key];
  for (const key of ['date_from', 'date_to']) if (/^\d{4}-\d{2}-\d{2}$/.test(filters[key] || '')) out[key] = filters[key];
  return out;
}

// Plain-English description of the active dashboard filters for the system prompt
async function describeFilters(filters) {
  const parts = [];
  if (filters.platform_id) parts.push(`platform = ${(await Platform.findById(filters.platform_id))?.name}`);
  if (filters.dish_id) parts.push(`dish = ${(await Dish.findById(filters.dish_id))?.name}`);
  if (filters.date_from) parts.push(`from ${filters.date_from}`);
  if (filters.date_to) parts.push(`to ${filters.date_to}`);
  return parts.length ? parts.join(', ') : 'none (all orders)';
}

const outletLabel = (o) => `"${o.name}"${o.city ? ` (${o.city})` : ''}`;

async function systemPrompt(outlets, filters, user) {
  const multi = outlets.length > 1;
  return [
    multi
      ? `You are the margin analyst inside Kitchen Margin Tracker, helping ${user.name} (${user.role}) analyse ${outlets.length} cloud kitchen outlets together: ${outlets.map(outletLabel).join(', ')}.`
      : `You are the margin analyst inside Kitchen Margin Tracker, helping ${user.name} (${user.role}) run the cloud kitchen outlet ${outletLabel(outlets[0])}.`,
    ...(multi ? ['Several outlets are selected: every tool combines them. Dish names in tool results carry their outlet in brackets because the same dish can exist at more than one outlet; keep that when you quote them. Fee rules and recipes differ per outlet. To compare outlets, call outlet_comparison. Only these outlets are in scope; if asked about any other outlet, say it is not selected.'] : []),
    `Today is ${new Date().toISOString().slice(0, 10)}. Currency is Indian rupees; write amounts like ₹1,250.`,
    `Active dashboard filters: ${await describeFilters(filters)}. Every tool except menu_costing, fee_rules and app_stats already applies these filters (period_comparison applies only the platform and dish filters, because it sets its own date ranges); mention them when they narrow the answer.`,
    'About the app: Kitchen Margin Tracker is a profit tracker for cloud kitchens selling on Zomato, Swiggy and direct orders. It works out the real profit on every order and shows it on a dashboard with this assistant. There are three roles: an owner (full access, manages outlets, platforms and the team), a manager (can view, add and edit data, but cannot delete or manage platforms and the team) and kitchen staff (can only add and view orders, with no access to profit data or this assistant). For questions about the app itself or about how many outlets, managers, dishes or orders this account has, call app_stats. Report counts only for the signed-in owner\'s account; never state how many accounts, customers or users the whole app has, and never reveal other users\' names, emails or details.',
    'Profit per order = order value − platform commission − GST on that commission − discount − packaging − food cost (sum of the dish\'s recipe items).',
    'price_simulation, cost_shock_simulation and platform_shift_simulation are what-if scenarios on past orders, not forecasts. State the assumption the tool returns, and say that real customer response is not modelled. For menu questions, menu_engineering classifies dishes; for losses, use loss_analysis and break_even_discount.',
    'profit_forecast is an EXPERIMENT: a statistical projection of the past weekday and trend pattern. Always quote the backtest error it returns (or say it had too little history to be tested), say whether it beat the naive baseline, and call the result an estimate, never a promise. anomaly_detection flags unusual days or dish-weeks; present them as leads to investigate, not proven causes, and offer loss_analysis or discount_impact to look for the cause.',
    'Always call tools to get numbers. Never invent or estimate figures the tools did not return. Call several tools when a question needs them, and call them again for each new question instead of reusing numbers from earlier answers.',
    'Answer in 2-6 short sentences or a short bulleted list. Lead with the answer, quote the key numbers, and end with one concrete, practical suggestion when it fits.',
    'If there is no data for the filters, say so and suggest widening them. Politely decline questions unrelated to the kitchen\'s business.',
  ].join('\n');
}

// Runs one tool call from the model and returns its result (errors become { error })
async function runTool(name, args, outletIds, filters) {
  const impl = toolImpl[name];
  try {
    return impl ? await impl(outletIds, filters, args || {}) : { error: `Unknown tool ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

const FALLBACK_REPLY = 'Sorry, I could not work that out. Try rephrasing the question.';
// Some open models write their reasoning inside <think> tags; keep only the answer
const cleanReply = (text) => (text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

// One call to Groq's OpenAI-compatible chat completions API
async function groqRequest(body) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Groq ${res.status}: ${json.error?.message || res.statusText}`);
  return json.choices[0].message;
}

// One full question → answer exchange with tool calls, on one Groq model
async function runGroqChat(model, { system, history, message, outletIds, filters }) {
  const messages = [
    { role: 'system', content: system },
    ...history.map((h) => ({ role: h.role, content: h.text })),
    { role: 'user', content: message },
  ];
  const used = [];
  for (let round = 0; round <= 6; round++) {
    // After 6 rounds of tool calls, ask for the final answer
    const reply = await groqRequest({ model, messages, tools: groqTools, tool_choice: round < 6 ? 'auto' : 'none', temperature: 0.2 });
    if (!reply.tool_calls?.length) return { reply: cleanReply(reply.content) || FALLBACK_REPLY, tools_used: [...new Set(used)] };
    messages.push({ role: 'assistant', content: reply.content || null, tool_calls: reply.tool_calls });
    const results = await Promise.all(reply.tool_calls.map(async (call) => {
      used.push(call.function.name);
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* run with the defaults */ }
      const result = await runTool(call.function.name, args, outletIds, filters);
      return { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) };
    }));
    messages.push(...results);
  }
  return { reply: FALLBACK_REPLY, tools_used: [...new Set(used)] };
}

// One full question → answer exchange with tool calls, on one Gemini model
async function runGeminiChat(model, { system, history, message, outletIds, filters }) {
  // Gemini calls the assistant "model", and its history must start with a user turn
  const past = history.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }));
  while (past.length && past[0].role !== 'user') past.shift();
  const chat = gemini.chats.create({ model, config: { systemInstruction: system, tools: geminiTools }, history: past });
  const used = [];
  let response = await chat.sendMessage({ message });
  for (let round = 0; round < 6 && response.functionCalls?.length; round++) {
    const parts = await Promise.all(response.functionCalls.map(async (call) => {
      used.push(call.name);
      const result = await runTool(call.name, call.args, outletIds, filters);
      return { functionResponse: { name: call.name, response: { result } } };
    }));
    response = await chat.sendMessage({ message: parts });
  }
  return { reply: cleanReply(response.text) || FALLBACK_REPLY, tools_used: [...new Set(used)] };
}

const runChat = ({ provider, model }, input) => (provider === 'groq' ? runGroqChat(model, input) : runGeminiChat(model, input));

// A model that was just busy is tried last for the next 2 minutes, so users don't wait on it again
const coolingUntil = new Map();
const COOLDOWN_MS = 2 * 60 * 1000;
const key = (m) => `${m.provider}:${m.model}`;
function modelOrder() {
  const now = Date.now();
  const ready = MODELS.filter((m) => !(coolingUntil.get(key(m)) > now));
  return [...ready, ...MODELS.filter((m) => !ready.includes(m))];
}

// Try each model in turn (Groq first, then Gemini); any failure moves on to the next model
async function withFallback(fn) {
  if (!MODELS.length) throw new Error('No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY in backend/.env');
  const started = Date.now();
  let lastErr;
  for (const m of modelOrder()) {
    if (lastErr && Date.now() - started > 75000) break; // give up rather than keep the user waiting
    try {
      return { ...(await fn(m)), model: m.model, provider: m.provider };
    } catch (err) {
      lastErr = err;
      coolingUntil.set(key(m), Date.now() + COOLDOWN_MS);
      console.log(`AI model ${key(m)} failed: ${err.message?.slice(0, 120)}`);
    }
  }
  throw lastErr;
}

// Rule-based highlights used when every model is busy, so the dashboard always has something to show
function computedInsights(kpis, byDish, byPlatform, costs) {
  const insights = [];
  const worst = byDish[0];
  const best = byDish[byDish.length - 1];
  if (worst && worst.profit < 0) insights.push({ type: 'warning', title: `${worst.dish_name} is losing money`, detail: `₹${Math.abs(worst.profit).toLocaleString('en-IN')} lost over ${worst.orders} orders (${worst.marginPct}% margin). Check its discounts and recipe cost.` });
  else if (worst) insights.push({ type: 'tip', title: `${worst.dish_name} has the thinnest margin`, detail: `${worst.marginPct}% margin over ${worst.orders} orders.` });
  if (best && best !== worst) insights.push({ type: 'positive', title: `${best.dish_name} earns the most per rupee`, detail: `${best.marginPct}% margin, ₹${best.profit.toLocaleString('en-IN')} profit from ${best.orders} orders.` });
  if (byPlatform.length > 1) {
    const top = byPlatform[0], low = byPlatform[byPlatform.length - 1];
    insights.push({ type: 'tip', title: `${top.platform_name} keeps more of each order`, detail: `${top.marginPct}% margin vs ${low.marginPct}% on ${low.platform_name}.` });
  }
  const disc = costs.breakdown.discounts;
  if (disc.pctOfRevenue >= 5) insights.push({ type: 'warning', title: 'Discounts are eating into profit', detail: `₹${disc.amount.toLocaleString('en-IN')} given away, ${disc.pctOfRevenue}% of revenue.` });
  if (!insights.length) insights.push({ type: 'tip', title: 'Not enough data yet', detail: `${kpis.orders} orders in this range. Add more orders or widen the filters.` });
  return insights.slice(0, 4);
}

// Insight cards as JSON from one model
const INSIGHT_TYPES = ['warning', 'positive', 'tip'];
async function generateInsights({ provider, model }, prompt) {
  let items;
  if (provider === 'groq') {
    const reply = await groqRequest({
      model,
      messages: [{ role: 'user', content: `${prompt}\n\nReply with JSON only: {"insights": [{"type": "warning" | "positive" | "tip", "title": "...", "detail": "..."}]}` }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    items = JSON.parse(cleanReply(reply.content)).insights;
  } else {
    const response = await gemini.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string', enum: INSIGHT_TYPES }, title: { type: 'string' }, detail: { type: 'string' } },
            required: ['type', 'title', 'detail'],
          },
        }),
      },
    });
    items = JSON.parse(response.text);
  }
  const insights = (Array.isArray(items) ? items : [])
    .filter((i) => i && INSIGHT_TYPES.includes(i.type) && i.title && i.detail)
    .slice(0, 4);
  if (!insights.length) throw new Error('Model returned no usable insights');
  return { insights };
}

const MAX_OUTLETS = 10;

// The outlets a request covers: outlet_ids (a list) or the older single outlet_id.
// Every one must belong to the caller's account. Returns { outlets } or { status, error }.
async function resolveOutlets(req) {
  if (req.user.role === 'staff') return { status: 403, error: 'Your role does not have access to the AI assistant' };
  const { outlet_id, outlet_ids } = req.body;
  const raw = Array.isArray(outlet_ids) && outlet_ids.length ? outlet_ids : [outlet_id];
  const wanted = [...new Set(raw.filter(Boolean).map(String))];
  if (!wanted.length) return { status: 400, error: 'outlet_ids (or outlet_id) required' };
  if (wanted.length > MAX_OUTLETS) return { status: 400, error: `Select at most ${MAX_OUTLETS} outlets` };
  const outlets = [];
  for (const id of wanted) {
    const outlet = await outletFor(id, req.user);
    if (!outlet) return { status: 403, error: 'You do not own this outlet' };
    outlets.push(outlet);
  }
  return { outlets };
}

module.exports = () => {
  // CHAT: multi-turn question answering grounded in the selected outlets' data
  router.post('/chat', requireAuth, async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    try {
      const scope = await resolveOutlets(req);
      if (scope.error) return res.status(scope.status).json({ error: scope.error });
      const { outlets } = scope;
      const filters = cleanFilters(req.body.filters);

      // Last 10 turns of the conversation
      const past = (Array.isArray(history) ? history : [])
        .filter((h) => h && typeof h.text === 'string' && h.text.trim() && ['user', 'assistant'].includes(h.role))
        .slice(-10)
        .map((h) => ({ role: h.role, text: h.text.slice(0, 4000) }));

      const system = await systemPrompt(outlets, filters, req.user);
      const result = await withFallback((m) => runChat(m, { system, history: past, message: String(message).slice(0, 2000), outletIds: outlets.map((o) => o._id), filters }));
      res.json(result);
    } catch (err) {
      console.error('AI chat error:', err.message);
      const busy = isBusy(err);
      res.status(busy ? 503 : 500).json({ error: busy ? 'The AI service is busy right now. Please try again in a minute.' : err.message || 'AI request failed' });
    }
  });

  // INSIGHTS: 3-4 short highlight cards for the current dashboard filters
  router.post('/insights', requireAuth, async (req, res) => {
    try {
      const scope = await resolveOutlets(req);
      if (scope.error) return res.status(scope.status).json({ error: scope.error });
      const { outlets } = scope;
      const ids = outlets.map((o) => o._id);
      const filters = cleanFilters(req.body.filters);
      const [kpis, byDish, byPlatform, costs, menu] = await Promise.all([
        tools.getKpis(ids, filters), tools.marginByDish(ids, filters), tools.marginByPlatform(ids, filters),
        tools.costBreakdown(ids, filters), tools.menuCosting(ids),
      ]);
      if (kpis.orders === 0) {
        return res.json({ insights: computedInsights(kpis, byDish, byPlatform, costs), source: 'computed' });
      }

      const data = JSON.stringify({ filters: await describeFilters(filters), kpis, byDish, byPlatform, costs, menu });
      const names = outlets.map((o) => `"${o.name}"`).join(', ');
      const prompt = `Here is the profit data for the cloud kitchen ${outlets.length > 1 ? `outlets ${names}, combined` : `outlet ${names}`} (amounts in Indian rupees):\n${data}\n\nWrite 3 or 4 insights a kitchen owner can act on. Each: a short title (max 8 words) and a detail of one or two sentences quoting the numbers. Write money with the ₹ sign (₹1,250), never the word rupees. Use only these numbers, and only make comparisons they support (check which cost is largest before saying so). Type is "warning" for problems, "positive" for things going well, "tip" for suggestions.`;
      try {
        const result = await withFallback((m) => generateInsights(m, prompt));
        res.json({ ...result, source: 'ai' });
      } catch (err) {
        console.log('Insights falling back to computed highlights:', err.message?.slice(0, 120));
        res.json({ insights: computedInsights(kpis, byDish, byPlatform, costs), source: 'computed' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};