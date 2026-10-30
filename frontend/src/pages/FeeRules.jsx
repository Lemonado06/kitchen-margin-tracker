import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import { Button, Card, EditingBanner, EmptyState, ErrorText, Field, Input, Select, Skeleton } from '../components/ui';

export default function FeeRules() {
  const { outletId } = useParams();
  const [loaded, loadAll, loadError] = useLoad(() => Promise.all([
    api.get(`/fee-rules/outlet/${outletId}`),
    api.get('/platforms'),
  ]).then(([r, p]) => ({ rules: r.data, platforms: p.data })), [outletId]);
  const rules = loaded?.rules ?? null;
  const platforms = loaded?.platforms ?? [];
  const [platformId, setPlatformId] = useState('');
  const [commission, setCommission] = useState('');
  const [gst, setGst] = useState('18');
  const [editingId, setEditingId] = useState(null);
  const [newPlatform, setNewPlatform] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  function resetForm() {
    setPlatformId('');
    setCommission('');
    setGst('18');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const commissionNum = parseFloat(commission);
    const gstNum = parseFloat(gst);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100 || isNaN(gstNum) || gstNum < 0 || gstNum > 100) {
      setError('Commission and GST must be between 0 and 100');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/fee-rules/${editingId}`, { commission_pct: commissionNum, gst_on_commission_pct: gstNum });
        toast('Fee rule updated');
      } else {
        await api.post('/fee-rules', {
          outlet_id: outletId,
          platform_id: platformId,
          commission_pct: commissionNum,
          gst_on_commission_pct: gstNum,
        });
        toast('Fee rule added');
      }
      resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save fee rule');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setPlatformId(rule.platform_id);
    setCommission(String(rule.commission_pct));
    setGst(String(rule.gst_on_commission_pct));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(rule) {
    const ok = await confirm({
      title: `Delete the ${rule.platform_name} fee rule?`,
      message: 'Its orders will count as 0% commission until you add a new rule.',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/fee-rules/${rule.id}`);
      if (editingId === rule.id) resetForm();
      toast('Fee rule deleted');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete fee rule');
    }
  }

  async function handleAddPlatform(e) {
    e.preventDefault();
    setError('');
    if (!newPlatform.trim()) return;
    try {
      await api.post('/platforms', { name: newPlatform.trim() });
      toast(`${newPlatform.trim()} added`);
      setNewPlatform('');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add platform');
    }
  }

  // Only offer platforms that don't have a rule yet (unless editing)
  const usedPlatformIds = (rules || []).map((r) => r.platform_id);
  const availablePlatforms = platforms.filter((p) => !usedPlatformIds.includes(p.id) || p.id === platformId);

  return (
    <>
      <OutletTabs outletId={outletId} title="Platform fee rules" subtitle="Commission each platform takes, and the GST charged on that commission." />

      <EditingBanner show={!!editingId} />
      <Card as="form" onSubmit={handleSubmit}
        className={`mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 ${editingId ? 'ring-2 ring-warn' : ''}`}>
        <Field label="Platform">
          <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)} disabled={!!editingId} required>
            <option value="">Select platform</option>
            {availablePlatforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Commission (%)">
          <Input type="number" min="0" max="100" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} required />
        </Field>
        <Field label="GST on commission (%)">
          <Input type="number" min="0" max="100" step="0.01" value={gst} onChange={(e) => setGst(e.target.value)} required />
        </Field>
        <div className="flex gap-2 sm:col-span-3">
          <Button type="submit" loading={saving} icon={editingId ? 'check' : 'plus'} className="flex-1">{editingId ? 'Save rule' : 'Add rule'}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </Card>

      <ErrorText>{error || loadError}</ErrorText>

      {!rules ? (
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : rules.length === 0 ? (
        <EmptyState icon="percent" title="No fee rules yet">Orders count as 0% commission until you add one.</EmptyState>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule, i) => {
            const effective = rule.commission_pct * (1 + rule.gst_on_commission_pct / 100);
            return (
              <Card key={rule.id} hover delay={i * 70} className="group p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-lg font-semibold text-ink">{rule.platform_name}</p>
                  <div className="flex gap-1 opacity-70 transition group-hover:opacity-100">
                    <button onClick={() => startEdit(rule)} className="rounded-lg p-1.5 text-muted transition hover:bg-subtle hover:text-ink" aria-label="Edit fee rule">
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                    {isOwner() && (
                      <button onClick={() => handleDelete(rule)} className="rounded-lg p-1.5 text-muted transition hover:bg-bad-bg hover:text-bad" aria-label="Delete fee rule">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted">Commission</p><p className="text-xl font-bold text-ink">{rule.commission_pct}%</p></div>
                  <div><p className="text-xs text-muted">GST on it</p><p className="text-xl font-bold text-ink">{rule.gst_on_commission_pct}%</p></div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted"><span>Effective cut</span><span>{effective.toFixed(1)}% of order</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-[var(--chart-commission)] transition-all duration-700" style={{ width: `${Math.min(100, effective)}%` }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isOwner() && (
        <Card as="form" onSubmit={handleAddPlatform} delay={200} className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
          <span className="text-sm text-muted">Platform missing?</span>
          <Input type="text" placeholder="e.g. Magicpin" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="sm:max-w-xs" />
          <Button type="submit" variant="ghost" icon="plus">Add platform</Button>
        </Card>
      )}
    </>
  );
}
