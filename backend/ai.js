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
    name: 'price_simulation', description: 'What-if analysis: profit on a dish\'s past orders if its price were different. Give new_price or change_pct.',
    parameters: {
      type: 'object',
      properties: {
        dish_name: { type: 'string', description: 'Dish name as on the menu' },
        new_price: { type: 'number', description: 'New menu price in rupees' },
        change_pct: { type: 'number', description: 'Price change in percent, e.g. 10 or -5' },
      },
      required: ['dish_name'],
    },
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

async function systemPrompt(outlet, filters, user) {
  return [
    `You are the margin analyst inside Kitchen Margin Tracker, helping ${user.name} (${user.role}) run the cloud kitchen outlet "${outlet.name}"${outlet.city ? ` in ${outlet.city}` : ''}.`,
    `Today is ${new Date().toISOString().slice(0, 10)}. Currency is Indian rupees; write amounts like ₹1,250.`,
    `Active dashboard filters: ${await describeFilters(filters)}. Every tool except menu_costing and fee_rules already applies these filters; mention them when they narrow the answer.`,
    'Profit per order = order value − platform commission − GST on that commission − discount − packaging − food cost (sum of the dish\'s recipe items).',
    'Always call tools to get numbers. Never invent or estimate figures the tools did not return. Call several tools when a question needs them, and call them again for each new question instead of reusing numbers from earlier answers.',
    'Answer in 2-6 short sentences or a short bulleted list. Lead with the answer, quote the key numbers, and end with one concrete, practical suggestion when it fits.',
    'If there is no data for the filters, say so and suggest widening them. Politely decline questions unrelated to the kitchen\'s business.',
  ].join('\n');
}

// Runs one tool call from the model and returns its result (errors become { error })
async function runTool(name, args, outletId, filters) {
  const impl = toolImpl[name];
  try {
    return impl ? await impl(outletId, filters, args || {}) : { error: `Unknown tool ${name}` };
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
async function runGroqChat(model, { system, history, message, outletId, filters }) {
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
      const result = await runTool(call.function.name, args, outletId, filters);
      return { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) };
    }));
    messages.push(...results);
  }
  return { reply: FALLBACK_REPLY, tools_used: [...new Set(used)] };
}

// One full question → answer exchange with tool calls, on one Gemini model
async function runGeminiChat(model, { system, history, message, outletId, filters }) {
  // Gemini calls the assistant "model", and its history must start with a user turn
  const past = history.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }));
  while (past.length && past[0].role !== 'user') past.shift();
  const chat = gemini.chats.create({ model, config: { systemInstruction: system, tools: geminiTools }, history: past });
  const used = [];
  let response = await chat.sendMessage({ message });
  for (let round = 0; round < 6 && response.functionCalls?.length; round++) {
    const parts = await Promise.all(response.functionCalls.map(async (call) => {
      used.push(call.name);
      const result = await runTool(call.name, call.args, outletId, filters);
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

module.exports = () => {
  // CHAT: multi-turn question answering grounded in the outlet's data
  router.post('/chat', requireAuth, async (req, res) => {
    const { message, outlet_id, history } = req.body;
    if (!message || !outlet_id) return res.status(400).json({ error: 'message and outlet_id required' });
    try {
      const outlet = await outletFor(outlet_id, req.user);
      if (!outlet) return res.status(403).json({ error: 'You do not own this outlet' });
      const filters = cleanFilters(req.body.filters);

      // Last 10 turns of the conversation
      const past = (Array.isArray(history) ? history : [])
        .filter((h) => h && typeof h.text === 'string' && h.text.trim() && ['user', 'assistant'].includes(h.role))
        .slice(-10)
        .map((h) => ({ role: h.role, text: h.text.slice(0, 4000) }));

      const system = await systemPrompt(outlet, filters, req.user);
      const result = await withFallback((m) => runChat(m, { system, history: past, message: String(message).slice(0, 2000), outletId: outlet._id, filters }));
      res.json(result);
    } catch (err) {
      console.error('AI chat error:', err.message);
      const busy = isBusy(err);
      res.status(busy ? 503 : 500).json({ error: busy ? 'The AI service is busy right now. Please try again in a minute.' : err.message || 'AI request failed' });
    }
  });

  // INSIGHTS: 3-4 short highlight cards for the current dashboard filters
  router.post('/insights', requireAuth, async (req, res) => {
    const { outlet_id } = req.body;
    if (!outlet_id) return res.status(400).json({ error: 'outlet_id required' });
    try {
      const outlet = await outletFor(outlet_id, req.user);
      if (!outlet) return res.status(403).json({ error: 'You do not own this outlet' });
      const filters = cleanFilters(req.body.filters);
      const [kpis, byDish, byPlatform, costs, menu] = await Promise.all([
        tools.getKpis(outlet._id, filters), tools.marginByDish(outlet._id, filters), tools.marginByPlatform(outlet._id, filters),
        tools.costBreakdown(outlet._id, filters), tools.menuCosting(outlet._id),
      ]);
      if (kpis.orders === 0) {
        return res.json({ insights: computedInsights(kpis, byDish, byPlatform, costs), source: 'computed' });
      }

      const data = JSON.stringify({ filters: await describeFilters(filters), kpis, byDish, byPlatform, costs, menu });
      const prompt = `Here is the profit data for the cloud kitchen outlet "${outlet.name}" (amounts in Indian rupees):\n${data}\n\nWrite 3 or 4 insights a kitchen owner can act on. Each: a short title (max 8 words) and a detail of one or two sentences quoting the numbers. Write money with the ₹ sign (₹1,250), never the word rupees. Use only these numbers, and only make comparisons they support (check which cost is largest before saying so). Type is "warning" for problems, "positive" for things going well, "tip" for suggestions.`;
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
