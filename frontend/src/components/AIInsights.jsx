import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import { Badge, Button, Card, Skeleton } from './ui';

const tones = {
  warning: { icon: 'alert', box: 'border-bad-line bg-bad-bg', text: 'text-bad', label: 'Problem' },
  positive: { icon: 'trend', box: 'border-good-line bg-good-bg', text: 'text-good', label: 'Going well' },
  tip: { icon: 'sparkles', box: 'border-info-line bg-info-bg', text: 'text-info', label: 'Suggestion' },
};

// One-click AI summary of the dashboard's current (filtered) numbers
export default function AIInsights({ outletId, filters }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const filterKey = JSON.stringify([outletId, filters]);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/insights', { outlet_id: outletId, filters });
      setResult({ ...res.data, key: filterKey });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate insights');
    } finally {
      setLoading(false);
    }
  }

  const stale = result && result.key !== filterKey;

  return (
    <Card delay={120} className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-primary p-1.5 text-on-primary"><Icon name="sparkles" className="w-4 h-4" /></span>
          <h2 className="text-sm font-bold text-ink">AI insights</h2>
          {result && !stale && (
            <Badge tone={result.source === 'ai' ? 'violet' : 'slate'}>{result.source === 'ai' ? result.model : 'Calculated'}</Badge>
          )}
          <span className="hidden text-xs text-muted sm:inline">
            {result && !stale
              ? result.source === 'ai' ? 'Written from the numbers below' : 'AI is busy, so these are calculated highlights'
              : 'A quick read of what the current filters show'}
          </span>
        </div>
        <Button variant={result ? 'ghost' : 'primary'} size="sm" icon="sparkles" loading={loading} onClick={generate}>
          {result ? (stale ? 'Refresh for new filters' : 'Regenerate') : 'Generate insights'}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      {loading && !result && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      {result && (
        <div className={`mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 transition duration-300 ${stale || loading ? 'opacity-50' : ''}`}>
          {result.insights.map((ins, i) => {
            const tone = tones[ins.type] || tones.tip;
            return (
              <div key={`${ins.title}-${i}`} style={{ animationDelay: `${i * 70}ms` }}
                className={`rounded-lg border p-3.5 animate-fade-up ${tone.box}`}>
                <p className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${tone.text}`}>
                  <Icon name={tone.icon} className="w-3.5 h-3.5" /> {tone.label}
                </p>
                <p className="text-sm font-semibold text-ink">{ins.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{ins.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
