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
];

// Friendly names for the data tools the assistant can call
const toolLabels = {
  get_kpis: 'KPIs', cost_breakdown: 'Cost breakdown', margin_by_dish: 'Margin by dish', margin_by_platform: 'Margin by platform',
  discount_impact: 'Discount impact', profit_trend: 'Profit trend', menu_costing: 'Menu costing', fee_rules: 'Fee rules',
  recent_orders: 'Recent orders', price_simulation: 'Price what-if',
};

const welcome = { role: 'assistant', text: 'Ask me anything about this outlet\'s dishes, platforms, costs or margins. I read your live order data and follow the dashboard filters.' };

export default function AIChat({ outletId, filters }) {
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
      const res = await api.post('/ai/chat', { message: userMessage, outlet_id: outletId, filters: filters || {}, history });
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
    <Card delay={280} className="flex h-[500px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary p-1.5 text-on-primary">
            <Icon name="sparkles" className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Ask the assistant</h2>
            <p className="text-xs text-muted">
              Live order data · {activeFilters ? `${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied` : 'all orders'}
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <Button size="sm" variant="subtle" icon="x" onClick={clearChat} disabled={loading}>New chat</Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-canvas/50 p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div
                className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary font-medium text-on-primary'
                    : 'rounded-bl-sm border border-line bg-surface text-ink-2 shadow-sm'
                }`}
              >
                {m.role === 'user' ? m.text : <Markdown text={m.text} />}
              </div>
              {m.tools?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <Icon name="dashboard" className="w-3 h-3" />
                  {m.tools.map((t) => (
                    <span key={t} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-medium text-ink-2">{toolLabels[t] || t}</span>
                  ))}
                  {m.model && <span>· {m.model}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-line bg-surface px-4 py-3" aria-label="Thinking">
              {[0, 150, 300].map((d) => (
                <span key={d} style={{ animationDelay: `${d}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-muted" />
              ))}
              <span className="ml-1 text-xs text-muted">Checking your data…</span>
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => send(s)} style={{ animationDelay: `${300 + i * 70}ms` }}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-accent hover:text-accent animate-fade-up">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-2 rounded-lg border border-bad-line bg-bad-bg px-3 py-2 text-xs text-bad">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-line bg-surface p-4">
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
