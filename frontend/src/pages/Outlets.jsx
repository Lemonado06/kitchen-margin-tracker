import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import { Button, Card, EditingBanner, EmptyState, ErrorText, Input, PageHeader, Skeleton } from '../components/ui';

const links = [
  { to: 'dishes', label: 'Dishes', icon: 'chef' },
  { to: 'orders', label: 'Orders', icon: 'receipt' },
  { to: 'fee-rules', label: 'Fee rules', icon: 'percent' },
];

export default function Outlets() {
  const [outlets, loadOutlets, loadError] = useLoad(() => api.get('/outlets').then((res) => res.data), []);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  function resetForm() {
    setName('');
    setCity('');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Outlet name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/outlets/${editingId}`, { name: name.trim(), city: city.trim() });
        toast('Outlet updated');
      } else {
        await api.post('/outlets', { name: name.trim(), city: city.trim() });
        toast('Outlet added');
      }
      resetForm();
      loadOutlets(); // refresh list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save outlet');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(outlet) {
    setEditingId(outlet.id);
    setName(outlet.name);
    setCity(outlet.city || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(outlet) {
    const ok = await confirm({
      title: `Delete "${outlet.name}"?`,
      message: 'Its dishes, orders and fee rules will also be deleted. This cannot be undone.',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/outlets/${outlet.id}`);
      if (editingId === outlet.id) resetForm();
      toast('Outlet deleted');
      loadOutlets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete outlet');
    }
  }

  return (
    <>
      <PageHeader title="Outlets" subtitle="Each outlet has its own menu, orders and platform fees." />

      <EditingBanner show={!!editingId} />
      <Card as="form" onSubmit={handleSubmit}
        className={`mb-8 flex flex-col gap-3 p-4 sm:flex-row ${editingId ? 'ring-2 ring-warn' : ''}`}>
        <Input type="text" placeholder="Outlet name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <div className="flex gap-2">
          <Button type="submit" loading={saving} icon={editingId ? 'check' : 'plus'} className="flex-1 sm:flex-none">
            {editingId ? 'Save' : 'Add'}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </Card>

      <ErrorText>{error || loadError}</ErrorText>

      {!outlets ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : outlets.length === 0 ? (
        <EmptyState icon="store" title="No outlets yet">Add your first outlet above.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outlets.map((outlet, i) => (
            <Card key={outlet.id} hover delay={i * 70} className="group flex flex-col p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-subtle text-ink-2">
                    <Icon name="store" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{outlet.name}</p>
                    {outlet.city && (
                      <p className="flex items-center gap-1 text-xs text-muted"><Icon name="pin" className="w-3 h-3" />{outlet.city}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-70 transition group-hover:opacity-100">
                  <button onClick={() => startEdit(outlet)} className="rounded-lg p-1.5 text-muted transition hover:bg-subtle hover:text-ink" aria-label="Edit outlet">
                    <Icon name="edit" className="w-4 h-4" />
                  </button>
                  {isOwner() && (
                    <button onClick={() => handleDelete(outlet)} className="rounded-lg p-1.5 text-muted transition hover:bg-bad-bg hover:text-bad" aria-label="Delete outlet">
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-2">
                {links.map((l) => (
                  <Link key={l.to} to={`/outlets/${outlet.id}/${l.to}`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface py-2.5 text-xs font-semibold text-ink-2 transition hover:border-ink/30 hover:bg-subtle hover:text-ink">
                    <Icon name={l.icon} className="w-4 h-4" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
