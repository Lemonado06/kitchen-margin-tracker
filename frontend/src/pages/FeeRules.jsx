
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import {
  Button,
  EditingBanner,
  ErrorText,
  Field,
  Input,
  Select,
  Skeleton,
} from '../components/ui';

export default function FeeRules() {
  const { outletId } = useParams();

  const [loaded, loadAll, loadError] = useLoad(
    () =>
      Promise.all([
        api.get(`/fee-rules/outlet/${outletId}`),
        api.get('/platforms'),
      ]).then(([r, p]) => ({
        rules: r.data,
        platforms: p.data,
      })),
    [outletId]
  );

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
  const owner = isOwner();

  function resetForm() {
    setPlatformId('');
    setCommission('');
    setGst('18');
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const commissionNum = parseFloat(commission);
    const gstNum = parseFloat(gst);

    if (
      isNaN(commissionNum) ||
      commissionNum < 0 ||
      commissionNum > 100 ||
      isNaN(gstNum) ||
      gstNum < 0 ||
      gstNum > 100
    ) {
      setError('Commission and GST must be between 0 and 100');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/fee-rules/${editingId}`, {
          commission_pct: commissionNum,
          gst_on_commission_pct: gstNum,
        });

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
    setError('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(rule) {
    const ok = await confirm({
      title: `Delete the ${rule.platform_name} fee rule?`,
      message:
        'Its orders will count as 0% commission until you add a new rule.',
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
      await api.post('/platforms', {
        name: newPlatform.trim(),
      });

      toast(`${newPlatform.trim()} added`);
      setNewPlatform('');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add platform');
    }
  }

  const usedPlatformIds = (rules || []).map((rule) => rule.platform_id);

  const availablePlatforms = platforms.filter(
    (platform) =>
      !usedPlatformIds.includes(platform.id) ||
      platform.id === platformId
  );

  const previewCommission = parseFloat(commission) || 0;
  const previewGst = parseFloat(gst) || 0;

  const effectivePreview =
    previewCommission * (1 + previewGst / 100);

  const totalEffective = (rules || []).reduce(
    (sum, rule) =>
      sum +
      rule.commission_pct *
      (1 + rule.gst_on_commission_pct / 100),
    0
  );

  return (
    <div className="space-y-7">
      <OutletTabs
        outletId={outletId}
        title="Platform fee rules"
        subtitle="Configure delivery platform commissions and GST charged on those commissions."
      />

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            CONFIGURED PLATFORMS
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
            {rules ? rules.length : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            AVERAGE EFFECTIVE CUT
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2B134]">
            {rules?.length
              ? `${(totalEffective / rules.length).toFixed(2)}%`
              : rules
                ? '0.00%'
                : '—'}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-[#2A2F2B] bg-[#151816] p-4 sm:col-span-1">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            GST DEFAULT
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
            18%
          </p>
        </div>
      </div>

      {/* Fee rule form */}
      <section
        className={[
          'rounded-xl border bg-[#151816] p-5 sm:p-6',
          editingId ? 'border-[#8C6928]' : 'border-[#2A2F2B]',
        ].join(' ')}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
              PLATFORM CONFIGURATION
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#F2EDE0]">
              {editingId ? 'Update fee rule' : 'Add platform fee rule'}
            </h2>
            <p className="mt-1 text-xs text-[#929891]">
              Set the commission rate and GST applicable to that commission.
            </p>
          </div>

          <span className="rounded border border-[#2A2F2B] bg-[#1A1D1B] px-2.5 py-1 font-mono text-[9px] tracking-wider text-[#929891]">
            {editingId ? 'EDIT MODE' : 'NEW RULE'}
          </span>
        </div>

        <EditingBanner show={!!editingId} />

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Platform">
              <Select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                disabled={!!editingId}
                required
              >
                <option value="">Select platform</option>
                {availablePlatforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Commission (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 25"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                required
              />
            </Field>

            <Field label="GST on commission (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="18"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                required
              />
            </Field>
          </div>

          {/* Live calculation preview */}
          <div className="mt-5 rounded-lg border border-[#394039] bg-[#111412] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.14em] text-[#858D85]">
                  EFFECTIVE PLATFORM DEDUCTION
                </p>
                <p className="mt-1 text-xs text-[#929891]">
                  Commission plus GST on commission
                </p>
              </div>

              <p className="font-mono text-2xl font-semibold tabular-nums text-[#F2B134]">
                {effectivePreview.toFixed(2)}%
              </p>
            </div>

            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#292E2A]">
              <div
                className="h-full rounded-full bg-[#F2B134] transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, effectivePreview))}%`,
                }}
              />
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-[#858D85]">
              Example: On a ₹1,000 order, this rate represents a platform
              deduction of ₹{(1000 * effectivePreview / 100).toFixed(2)}.
            </p>
          </div>

          <ErrorText>{error}</ErrorText>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="submit"
              loading={saving}
              icon={editingId ? 'check' : 'plus'}
            >
              {editingId ? 'Save rule' : 'Add fee rule'}
            </Button>

            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <ErrorText>{loadError}</ErrorText>

      {/* Existing rules */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F2EDE0]">
              Configured fee rules
            </h2>
            <p className="mt-1 text-xs text-[#929891]">
              Commission and effective deductions by platform.
            </p>
          </div>

          {rules && (
            <span className="font-mono text-[9px] tracking-wider text-[#858D85]">
              {rules.length} RULES
            </span>
          )}
        </div>

        {!rules ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#394039] bg-[#151816] px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A2F2B] bg-[#1A1D1B] text-[#F2B134]">
              <Icon name="percent" className="h-5 w-5" />
            </div>

            <h3 className="text-base font-semibold text-[#F2EDE0]">
              No fee rules yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-[#929891]">
              Orders count as 0% commission until you configure a platform fee
              rule.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => {
              const effective =
                rule.commission_pct *
                (1 + rule.gst_on_commission_pct / 100);

              return (
                <article
                  key={rule.id}
                  className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-5 transition-colors hover:border-[#465047]"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] tracking-[0.14em] text-[#858D85]">
                        PLATFORM
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[#F2EDE0]">
                        {rule.platform_name}
                      </h3>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        aria-label={`Edit ${rule.platform_name} fee rule`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#292E2A] hover:text-[#F2EDE0]"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>

                      {owner && (
                        <button
                          type="button"
                          onClick={() => handleDelete(rule)}
                          aria-label={`Delete ${rule.platform_name} fee rule`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#321F20] hover:text-[#E5484D]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#2A2F2B] bg-[#111412] p-3">
                      <p className="text-[10px] text-[#858D85]">
                        Commission
                      </p>
                      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
                        {rule.commission_pct}%
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#2A2F2B] bg-[#111412] p-3">
                      <p className="text-[10px] text-[#858D85]">
                        GST on commission
                      </p>
                      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
                        {rule.gst_on_commission_pct}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#2A2F2B] pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#929891]">
                        Effective deduction
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#F2B134]">
                        {effective.toFixed(2)}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#292E2A]">
                      <div
                        className="h-full rounded-full bg-[#F2B134] transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, effective))}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 font-mono text-[10px] text-[#858D85]">
                      ₹{(1000 * effective / 100).toFixed(2)} per ₹1,000 order
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Owner-only platform creation */}
      {owner && (
        <section className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-5">
          <div className="mb-4">
            <p className="font-mono text-[9px] tracking-[0.14em] text-[#858D85]">
              PLATFORM MANAGEMENT
            </p>
            <h2 className="mt-1 text-sm font-semibold text-[#F2EDE0]">
              Add a missing platform
            </h2>
            <p className="mt-1 text-xs text-[#929891]">
              Create a platform before configuring its fee rule.
            </p>
          </div>

          <form
            onSubmit={handleAddPlatform}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="w-full sm:max-w-sm">
              <Field label="Platform name">
                <Input
                  type="text"
                  placeholder="e.g. Magicpin"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                />
              </Field>
            </div>

            <Button
              type="submit"
              variant="ghost"
              icon="plus"
              disabled={!newPlatform.trim()}
            >
              Add platform
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
