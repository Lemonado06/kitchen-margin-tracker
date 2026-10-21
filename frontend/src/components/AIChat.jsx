import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import { Card, Input, Button } from './ui';

const suggestions = ['Which dishes lose money?', 'Which platform earns me the most?', 'Are discounts hurting my profit?'];

export default function AIChat({ outletId, filters }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Ask me about your dishes, platforms, or margins — e.g. \"which dishes lose money?\"" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Keep the latest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  async function send(text) {
    const userMessage = text.trim();
    if (!userMessage || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', {
        message: userMessage,
        outlet_id: outletId,
        filters: filters || {},
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply }]);
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

  return (
    <Card delay={280} className="relative flex h-[500px] flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex items-center gap-3 border-b border-white/10 p-5">
        <span className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 p-2 text-white shadow-lg shadow-violet-500/30">
          <Icon name="sparkles" className="w-4 h-4" />
        </span>
        <div>
          <h2 className="font-semibold text-white">Ask the assistant</h2>
          <p className="text-sm text-slate-400">Powered by your live order data</p>
        </div>
      </div>

      <div className="relative flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex animate-fade-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-medium shadow-lg shadow-emerald-500/20'
                  : 'rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3.5" aria-label="Thinking">
              {[0, 150, 300].map((d) => (
                <span key={d} style={{ animationDelay: `${d}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
              ))}
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => send(s)} style={{ animationDelay: `${300 + i * 80}ms` }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:text-emerald-200 animate-fade-up">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-5 pb-2 text-xs text-rose-300">{error}</p>}

      <form onSubmit={handleSend} className="relative flex gap-2 border-t border-white/10 p-4">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} icon="send" aria-label="Send">Send</Button>
      </form>
    </Card>
  );
}
