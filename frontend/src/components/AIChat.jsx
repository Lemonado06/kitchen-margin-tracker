import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import Markdown from './Markdown';
import { Card, Input, Button } from './ui';

const suggestions = [
  'Which dishes lose money?',
  'Which platform earns me the most?',
  'Where does my revenue go?',
  'Are discounts hurting my profit?',
  'What if I raise Paneer Tikka by 15%?',
  'How did profit move week by week?',
  'Compare my outlets',
  'Any unusual days lately?',
  'Forecast profit for the next 2 weeks',
];

// Friendly names for the data tools the assistant can call
const toolLabels = {
  get_kpis: 'KPIs', cost_breakdown: 'Cost breakdown', margin_by_dish: 'Margin by dish', margin_by_platform: 'Margin by platform',
  discount_impact: 'Discount impact', profit_trend: 'Profit trend', menu_costing: 'Menu costing', fee_rules: 'Fee rules',
  recent_orders: 'Recent orders', price_simulation: 'Price what-if', app_stats: 'App & account facts', break_even_discount: 'Break-even discount',
  loss_analysis: 'Loss analysis', day_of_week_performance: 'Day of week', menu_engineering: 'Menu engineering', period_comparison: 'Period comparison',
  cost_shock_simulation: 'Ingredient cost what-if', platform_shift_simulation: 'Platform shift what-if', outlet_comparison: 'Outlet comparison',
  anomaly_detection: 'Anomaly detection', profit_forecast: 'Forecast (experiment)',
};

const welcome = { role: 'assistant', text: 'Ask me anything about the selected outlets\' dishes, platforms, costs or margins. I read your live order data and follow the dashboard filters. I can also compare outlets, flag unusual days and run what-if scenarios.' };

export default function AIChat({ outletIds, filters }) {
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  // Keep the latest message in view (scrolls the chat box only, not the page)
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const activeFilters = Object.values(filters || {}).filter(Boolean).length;

  async function send(text) {
    const userMessage = text.trim();
    if (!userMessage || loading) return;
    // Earlier turns (minus the greeting) go along so follow-up questions have context
    const history = messages.slice(1).map(({ role, text: t }) => ({ role, text: t }));
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', { message: userMessage, outlet_ids: outletIds, filters: filters || {}, history });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply, tools: res.data.tools_used, model: res.data.model }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get a response');
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    send(input);
  }

  function clearChat() {
    setMessages([welcome]);
    setError('');
  }

  return (
    <Card delay={280} className="relative flex h-[560px] flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 p-2 text-white shadow-lg shadow-violet-500/30">
            <Icon name="sparkles" className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Ask the assistant</h2>
            <p className="text-sm text-slate-400">
              Live order data · {outletIds.length > 1 ? `${outletIds.length} outlets` : '1 outlet'} · {activeFilters ? `${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied` : 'all orders'}
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <Button size="sm" variant="subtle" icon="x" onClick={clearChat} disabled={loading}>New chat</Button>
        )}
      </div>

      <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user'
                    ? 'rounded-br-md bg-gradient-to-r from-emerald-500 to-cyan-500 font-medium text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100'
                  }`}
              >
                {m.role === 'user' ? m.text : <Markdown text={m.text} />}
              </div>
              {m.tools?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <Icon name="dashboard" className="w-3 h-3" />
                  {m.tools.map((t) => (
                    <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{toolLabels[t] || t}</span>
                  ))}
                  {m.model && <span className="text-slate-500">· {m.model}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3" aria-label="Thinking">
              {[0, 150, 300].map((d) => (
                <span key={d} style={{ animationDelay: `${d}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
              ))}
              <span className="ml-1 text-xs text-slate-400">Checking your data…</span>
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => send(s)} style={{ animationDelay: `${300 + i * 70}ms` }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:text-emerald-200 animate-fade-up">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="relative flex gap-2 border-t border-white/10 p-4">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question, or try a follow-up…"
          disabled={loading}
          maxLength={2000}
        />
        <Button type="submit" disabled={loading || !input.trim()} icon="send" aria-label="Send">Send</Button>
      </form>
    </Card>
  );
}