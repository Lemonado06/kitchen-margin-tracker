
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { isOwner, isStaff } from '../api/client';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import {
  Button,
  EditingBanner,
  ErrorText,
  Input,
  PageHeader,
  Skeleton,
} from '../components/ui';

const links = [
  { to: 'dishes', label: 'Dishes', icon: 'chef' },
  { to: 'orders', label: 'Orders', icon: 'receipt' },
  { to: 'fee-rules', label: 'Fee rules', icon: 'percent' },
];

export default function Outlets() {
  const [outlets, loadOutlets, loadError] = useLoad(
    () => api.get('/outlets').then((res) => res.data),
    []
  );

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  const staff = isStaff();
  const owner = isOwner();
  const visibleLinks = staff
    ? links.filter((link) => link.to === 'orders')
    : links;

  function resetForm() {
    setName('');
    setCity('');
    setEditingId(null);
    setError('');
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
        await api.put(`/outlets/${editingId}`, {
          name: name.trim(),
          city: city.trim(),
        });
        toast('Outlet updated');
      } else {
        await api.post('/outlets', {
          name: name.trim(),
          city: city.trim(),
        });
        toast('Outlet added');
      }

      resetForm();
      loadOutlets();
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
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(outlet) {
    const ok = await confirm({
      title: `Delete "${outlet.name}"?`,
      message:
        'Its dishes, orders and fee rules will also be deleted. This cannot be undone.',
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
    <div className="space-y-7">
      <PageHeader
        title="Outlets"
        subtitle={
          staff
            ? 'Select an outlet to record and manage its orders.'
            : 'Manage your locations, menus, orders and platform fees.'
        }
      />

      {/* Page overview */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2F2B] pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
            YOUR LOCATIONS
          </p>
          <p className="mt-1 text-sm text-[#B5BBB4]">
            {outlets
              ? `${outlets.length} ${outlets.length === 1 ? 'outlet' : 'outlets'} registered`
              : 'Loading locations...'}
          </p>
        </div>

        {outlets && outlets.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-md border border-[#2A2F2B] bg-[#151816] px-3 py-2 font-mono text-[10px] tracking-wider text-[#A3AAA2]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
            {outlets.length} ACTIVE LOCATIONS
          </span>
        )}
      </div>

      {/* Add / edit outlet */}
      {!staff && (
        <section
          className={[
            'rounded-xl border bg-[#151816] p-5 sm:p-6',
            editingId ? 'border-[#8C6928]' : 'border-[#2A2F2B]',
          ].join(' ')}
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
                {editingId ? 'EDIT LOCATION' : 'LOCATION MANAGEMENT'}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F2EDE0]">
                {editingId ? 'Update outlet details' : 'Add a new outlet'}
              </h2>
              <p className="mt-1 text-xs text-[#929891]">
                {editingId
                  ? 'Update the name or city for this location.'
                  : 'Register another kitchen or restaurant location.'}
              </p>
            </div>

            <span className="rounded border border-[#2A2F2B] bg-[#1A1D1B] px-2.5 py-1 font-mono text-[9px] tracking-wider text-[#929891]">
              {editingId ? 'EDIT MODE' : 'NEW LOCATION'}
            </span>
          </div>

          <EditingBanner show={!!editingId} />

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#C5CAC3]">
                  Outlet name <span className="text-[#E5484D]">*</span>
                </span>
                <Input
                  type="text"
                  placeholder="e.g. Indiranagar Kitchen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#C5CAC3]">
                  City
                </span>
                <Input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
            </div>

            <ErrorText>{error}</ErrorText>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                loading={saving}
                icon={editingId ? 'check' : 'plus'}
              >
                {editingId ? 'Save changes' : 'Add outlet'}
              </Button>

              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>
      )}

      <ErrorText>{loadError}</ErrorText>

      {/* Outlet loading state */}
      {!outlets ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#394039] bg-[#151816] px-5 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A2F2B] bg-[#1A1D1B] text-[#3DD68C]">
            <Icon name="store" className="h-5 w-5" />
          </div>

          <h3 className="text-base font-semibold text-[#F2EDE0]">
            No outlets yet
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#929891]">
            Add your first outlet to start managing dishes, orders and
            operating costs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {outlets.map((outlet, index) => (
            <article
              key={outlet.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816] transition-colors duration-150 hover:border-[#465047]"
            >
              {/* Outlet heading */}
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#31513E] bg-[#1C2B21] text-[#3DD68C]">
                    <Icon name="store" className="h-[19px] w-[19px]" />
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <h3 className="truncate text-[14px] font-semibold text-[#F2EDE0]">
                      {outlet.name}
                    </h3>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#929891]">
                      {outlet.city ? (
                        <>
                          <Icon name="pin" className="h-3 w-3 shrink-0" />
                          <span className="truncate">{outlet.city}</span>
                        </>
                      ) : (
                        <span className="text-[#707970]">
                          Location not specified
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!staff && (
                    <button
                      type="button"
                      onClick={() => startEdit(outlet)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#929891] transition-colors hover:bg-[#252A26] hover:text-[#F2EDE0]"
                      aria-label={`Edit ${outlet.name}`}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                  )}

                  {owner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(outlet)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#929891] transition-colors hover:bg-[#321F20] hover:text-[#E5484D]"
                      aria-label={`Delete ${outlet.name}`}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-5 border-t border-[#2A2F2B]" />

              {/* Outlet modules */}
              <div className="p-5">
                <p className="mb-3 font-mono text-[9px] tracking-[0.15em] text-[#747D75]">
                  MANAGE LOCATION
                </p>

                <div
                  className={`grid gap-2 ${staff ? 'grid-cols-1' : 'grid-cols-3'
                    }`}
                >
                  {visibleLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={`/outlets/${outlet.id}/${link.to}`}
                      className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-lg border border-[#2A2F2B] bg-[#1A1D1B] px-2 py-3 text-center transition-colors hover:border-[#45634D] hover:bg-[#1D2821]"
                    >
                      <Icon
                        name={link.icon}
                        className="h-[17px] w-[17px] text-[#A0A69F] transition-colors group-hover:text-[#3DD68C]"
                      />

                      <span className="text-[10px] font-medium text-[#C1C6BF]">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Card footer */}
              <div className="mt-auto flex items-center justify-between border-t border-[#252A26] bg-[#121513] px-5 py-3">
                <span className="font-mono text-[9px] tracking-wider text-[#687168]">
                  LOCATION {String(index + 1).padStart(2, '0')}
                </span>

                <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-[#3DD68C]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
                  REGISTERED
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
