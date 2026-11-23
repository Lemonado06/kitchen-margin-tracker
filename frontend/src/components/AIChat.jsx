
import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import Markdown from './Markdown';
import { Input, Button } from './ui';

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

const toolLabels = {
  get_kpis: 'KPIs',
  cost_breakdown: 'Cost breakdown',
  margin_by_dish: 'Margin by dish',
  margin_by_platform: 'Margin by platform',
  discount_impact: 'Discount impact',
  profit_trend: 'Profit trend',
  menu_costing: 'Menu costing',
  fee_rules: 'Fee rules',
  recent_orders: 'Recent orders',
  price_simulation: 'Price what-if',
  app_stats: 'App & account facts',
  break_even_discount: 'Break-even discount',
  loss_analysis: 'Loss analysis',
  day_of_week_performance: 'Day of week',
  menu_engineering: 'Menu engineering',
  period_comparison: 'Period comparison',
  cost_shock_simulation: 'Ingredient cost what-if',
  platform_shift_simulation: 'Platform shift what-if',
  outlet_comparison: 'Outlet comparison',
  anomaly_detection: 'Anomaly detection',
  profit_forecast: 'Forecast (experiment)',
};

const welcome = {
  role: 'assistant',
  text: 'Ask me anything about the selected outlets\' dishes, platforms, costs or margins. I read your live order data and follow the dashboard filters. I can also compare outlets, flag unusual days and run what-if scenarios.',
};

export default function AIChat({ outletIds, filters }) {
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef(null);

  useEffect(() => {
    const box = scrollRef.current;

    if (box) {
      box.scrollTo({
        top: box.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  const activeFilters = Object.values(filters || {}).filter(Boolean).length;

  async function send(text) {
    const userMessage = text.trim();

    if (!userMessage || loading) return;

    const history = messages
      .slice(1)
      .map(({ role, text: messageText }) => ({
        role,
        text: messageText,
      }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userMessage },
    ]);

    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', {
        message: userMessage,
        outlet_ids: outletIds,
        filters: filters || {},
        history,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.reply,
          tools: res.data.tools_used,
          model: res.data.model,
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to get a response'
      );
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
    setInput('');
  }

  return (
    <section className="flex h-[600px] min-h-[480px] flex-col overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816]">
      {/* Chat header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2F2B] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#49405F] bg-[#211D2B] text-[#B9A1E8]">
            <Icon name="sparkles" className="h-4 w-4" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#F2EDE0]">
                Business assistant
              </h2>

              <span className="flex items-center gap-1.5 rounded border border-[#31513E] bg-[#17221B] px-1.5 py-0.5 font-mono text-[8px] tracking-wider text-[#3DD68C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
                CONNECTED
              </span>
            </div>

            <p className="mt-1 text-[10px] text-[#929891]">
              {outletIds.length > 1
                ? `${outletIds.length} outlets`
                : '1 outlet'}
              {' · '}
              {activeFilters
                ? `${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied`
                : 'All orders'}
              {' · '}
              Live order data
            </p>
          </div>
        </div>

        {messages.length > 1 && (
          <Button
            size="sm"
            variant="subtle"
            icon="x"
            onClick={clearChat}
            disabled={loading}
          >
            New chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto bg-[#101311] p-4 sm:p-5"
      >
        {messages.map((message, i) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={i}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'
                }`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#49405F] bg-[#211D2B] text-[#B9A1E8]">
                  <Icon name="sparkles" className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`min-w-0 max-w-[88%] ${isUser ? 'items-end' : 'items-start'
                  }`}
              >
                <p className="mb-1.5 font-mono text-[8px] tracking-[0.13em] text-[#737B73]">
                  {isUser ? 'YOU' : 'BUSINESS ASSISTANT'}
                </p>

                <div
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${isUser
                      ? 'rounded-tr-sm border border-[#31513E] bg-[#1B2920] text-[#E1F1E5]'
                      : 'rounded-tl-sm border border-[#2A2F2B] bg-[#1A1C1B] text-[#D8DCD5]'
                    }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  ) : (
                    <Markdown text={message.text} />
                  )}
                </div>

                {message.tools?.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Icon
                      name="dashboard"
                      className="h-3 w-3 text-[#858D85]"
                    />

                    {message.tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded border border-[#343A35] bg-[#1A1C1B] px-2 py-1 font-mono text-[9px] text-[#AAB1A8]"
                      >
                        {toolLabels[tool] || tool}
                      </span>
                    ))}

                    {message.model && (
                      <span className="font-mono text-[9px] text-[#737B73]">
                        {message.model}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#343A35] bg-[#222622] text-[#B5BBB3]">
                  <Icon name="user" className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#49405F] bg-[#211D2B] text-[#B9A1E8]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
            </div>

            <div className="rounded-xl rounded-tl-sm border border-[#2A2F2B] bg-[#1A1C1B] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      style={{ animationDelay: `${delay}ms` }}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#B9A1E8]"
                    />
                  ))}
                </div>

                <span className="text-[11px] text-[#929891]">
                  Checking your data...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested questions */}
        {messages.length === 1 && !loading && (
          <div className="pt-2">
            <p className="mb-3 font-mono text-[9px] tracking-[0.13em] text-[#858D85]">
              TRY ASKING
            </p>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-lg border border-[#343A35] bg-[#1A1C1B] px-3 py-2 text-left text-[11px] text-[#B5BBB3] transition-colors hover:border-[#477052] hover:bg-[#1C2820] hover:text-[#3DD68C] disabled:opacity-50"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 border-t border-[#633238] bg-[#211719] px-5 py-2.5 text-xs text-[#E98286]">
          <Icon name="alert" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-[#2A2F2B] bg-[#151816] p-3 sm:p-4"
      >
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your revenue, costs, margins..."
            disabled={loading}
            maxLength={2000}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !input.trim()}
          icon="send"
          aria-label="Send"
        >
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </section>
  );
}
