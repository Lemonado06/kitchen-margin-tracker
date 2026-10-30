import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import { Button, Card, Skeleton } from './ui';

const tones = {
  warning: { icon: 'alert', box: 'border-rose-400/20 bg-rose-500/[0.07]', chip: 'bg-rose-500/15 text-rose-300' },
  positive: { icon: 'trend', box: 'border-emerald-400/20 bg-emerald-500/[0.07]', chip: 'bg-emerald-500/15 text-emerald-300' },
  tip: { icon: 'sparkles', box: 'border-violet-400/20 bg-violet-500/[0.07]', chip: 'bg-violet-500/15 text-violet-300' },
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
    <Card delay={180} className="relative mb-6 overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 p-2 text-white shadow-lg shadow-violet-500/30">
            <Icon name="sparkles" className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-semibold text-white">AI insights</h2>
            <p className="text-sm text-slate-400">
              {result && !stale
                ? result.source === 'ai' ? `Written by ${result.model} from the numbers below` : 'AI is busy, so these are calculated highlights'
                : 'A quick read of what the current filters show'}
            </p>
          </div>
        </div>
        <Button variant={result ? 'ghost' : 'primary'} icon="sparkles" loading={loading} onClick={generate}>
          {result ? (stale ? 'Refresh for new filters' : 'Regenerate') : 'Generate insights'}
        </Button>
      </div>

      {error && <p className="relative mt-4 text-sm text-rose-300">{error}</p>}

      {loading && !result && (
        <div className="relative mt-5 grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      )}

      {result && (
        <div className={`relative mt-5 grid gap-3 md:grid-cols-2 transition duration-300 ${stale || loading ? 'opacity-50' : ''}`}>
          {result.insights.map((ins, i) => {
            const tone = tones[ins.type] || tones.tip;
            return (
              <div key={`${ins.title}-${i}`} style={{ animationDelay: `${i * 90}ms` }}
                className={`flex gap-3 rounded-xl border p-4 animate-fade-up ${tone.box}`}>
                <span className={`h-fit rounded-lg p-1.5 ${tone.chip}`}><Icon name={tone.icon} className="w-4 h-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-white">{ins.title}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{ins.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
