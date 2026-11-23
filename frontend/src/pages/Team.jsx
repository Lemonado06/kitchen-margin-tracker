
import { useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import {
  Button,
  ErrorText,
  Field,
  Input,
  Modal,
  PageHeader,
  PasswordInput,
  Skeleton,
} from '../components/ui';

const permissions = [
  ['View dashboard', true, true, false],
  ['Use AI assistant and insights', true, true, false],
  ['View orders', true, true, true],
  ['Add orders', true, true, true],
  ['Edit or delete orders', true, true, false],
  ['View profit and margins', true, true, false],
  ['View recipe costs', true, true, false],
  ['Manage fee rules', true, true, false],
  ['Manage outlets and dishes', true, true, false],
  ['Manage delivery platforms', true, false, false],
  ['Manage team members', true, false, false],
];

function roleName(role) {
  if (role === 'owner') return 'Owner';
  if (role === 'staff') return 'Kitchen Staff';
  return 'Manager';
}

const roleStyles = {
  owner: {
    color: '#C4A7FF',
    background: '#292238',
    border: '#51416C',
  },
  manager: {
    color: '#75C9D8',
    background: '#1C2B30',
    border: '#31515A',
  },
  staff: {
    color: '#F2B134',
    background: '#302719',
    border: '#65502A',
  },
};

function RoleLabel({ role }) {
  const style = roleStyles[role] || roleStyles.manager;

  return (
    <span
      className="inline-flex items-center rounded border px-2 py-1 font-mono text-[9px] tracking-wider"
      style={{
        color: style.color,
        backgroundColor: style.background,
        borderColor: style.border,
      }}
    >
      {roleName(role).toUpperCase()}
    </span>
  );
}

function PermissionTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[440px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#2A2F2B]">
            <th className="px-4 py-3 text-left font-mono text-[9px] tracking-wider text-[#858D85]">
              PERMISSION
            </th>
            <th className="px-2 py-3 text-center font-mono text-[9px] tracking-wider text-[#C4A7FF]">
              OWNER
            </th>
            <th className="px-2 py-3 text-center font-mono text-[9px] tracking-wider text-[#75C9D8]">
              MANAGER
            </th>
            <th className="px-2 py-3 text-center font-mono text-[9px] tracking-wider text-[#F2B134]">
              STAFF
            </th>
          </tr>
        </thead>

        <tbody>
          {permissions.map(([action, owner, manager, staff]) => (
            <tr
              key={action}
              className="border-b border-[#242A25] last:border-0"
            >
              <td className="px-4 py-3 text-[#C5CBC3]">
                {action}
              </td>

              {[owner, manager, staff].map((allowed, index) => (
                <td key={index} className="px-2 py-3 text-center">
                  {allowed ? (
                    <Icon
                      name="check"
                      className="mx-auto h-4 w-4 text-[#3DD68C]"
                    />
                  ) : (
                    <Icon
                      name="x"
                      className="mx-auto h-4 w-4 text-[#515951]"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Team() {
  const [team, loadTeam, loadError] = useLoad(
    () => api.get('/users').then((res) => res.data),
    []
  );

  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  function openAdd() {
    setFormError('');

    setForm({
      name: '',
      email: '',
      password: '',
      role: 'manager',
    });
  }

  function openEdit(member) {
    setFormError('');

    setForm({
      id: member.id,
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }

    if (!form.id && !form.email.trim()) {
      setFormError('Email is required');
      return;
    }

    if (!form.id && !form.password) {
      setFormError('Password is required');
      return;
    }

    if (form.password && form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, {
          name: form.name.trim(),
          password: form.password || undefined,
          role: form.role,
        });

        toast('Team member updated');
      } else {
        await api.post('/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });

        toast(
          `${form.name.trim()} added as ${form.role === 'staff' ? 'Kitchen Staff' : 'Manager'
          }`
        );
      }

      setForm(null);
      loadTeam();
    } catch (err) {
      setFormError(
        err.response?.data?.error || 'Failed to save team member'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member) {
    const ok = await confirm({
      title: `Remove ${member.name}?`,
      message:
        'They will lose access to your outlets. Existing records they created will remain.',
      confirmLabel: 'Remove',
    });

    if (!ok) return;

    setError('');

    try {
      await api.delete(`/users/${member.id}`);
      toast(`${member.name} removed`);
      loadTeam();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to remove team member'
      );
    }
  }

  const set = (key) => (e) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  const members = team || [];
  const managerCount = members.filter((member) => member.role === 'manager').length;
  const staffCount = members.filter((member) => member.role === 'staff').length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Team management"
        subtitle="Manage the people who have access to your outlets."
        actions={
          <Button icon="plus" onClick={openAdd}>
            Add team member
          </Button>
        }
      />

      <ErrorText>{error || loadError}</ErrorText>

      {/* Team overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            TOTAL MEMBERS
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
            {team ? members.length : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            MANAGERS
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#75C9D8]">
            {team ? managerCount : '—'}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-[#2A2F2B] bg-[#151816] p-4 sm:col-span-1">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            KITCHEN STAFF
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2B134]">
            {team ? staffCount : '—'}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Team members */}
        <section className="space-y-3 lg:col-span-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#F2EDE0]">
                Team members
              </h2>
              <p className="mt-1 text-xs text-[#929891]">
                People with access to your business.
              </p>
            </div>

            {team && (
              <span className="font-mono text-[9px] tracking-wider text-[#858D85]">
                {members.length} ACCOUNTS
              </span>
            )}
          </div>

          {!team ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              {members.map((member) => {
                const isOwner = member.role === 'owner';
                const initial = member.name?.charAt(0)?.toUpperCase() || '?';

                return (
                  <article
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2F2B] bg-[#151816] p-4 transition-colors hover:border-[#465047]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={[
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
                          'font-semibold text-sm',
                          member.role === 'owner'
                            ? 'border-[#51416C] bg-[#292238] text-[#C4A7FF]'
                            : member.role === 'staff'
                              ? 'border-[#65502A] bg-[#302719] text-[#F2B134]'
                              : 'border-[#31515A] bg-[#1C2B30] text-[#75C9D8]',
                        ].join(' ')}
                      >
                        {initial}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-[#F2EDE0]">
                            {member.name}
                          </h3>
                          <RoleLabel role={member.role} />
                        </div>

                        <p className="mt-1 truncate text-xs text-[#929891]">
                          {member.email}
                        </p>

                        <p className="mt-1 text-[10px] text-[#69736B]">
                          {roleName(member.role)}
                        </p>
                      </div>
                    </div>

                    {isOwner ? (
                      <span className="shrink-0 rounded border border-[#51416C] bg-[#292238] px-2.5 py-1 font-mono text-[9px] tracking-wider text-[#C4A7FF]">
                        YOU
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(member)}
                          aria-label={`Edit ${member.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#292E2A] hover:text-[#F2EDE0]"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          aria-label={`Remove ${member.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#321F20] hover:text-[#E5484D]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}

              {members.length === 1 && (
                <div className="rounded-xl border border-dashed border-[#394039] bg-[#151816] px-5 py-8 text-center">
                  <p className="text-sm font-medium text-[#F2EDE0]">
                    No team members yet
                  </p>
                  <p className="mt-1 text-xs text-[#929891]">
                    Add a manager or kitchen staff member to get started.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Role permissions */}
        <section className="overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816] lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-[#2A2F2B] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#31513E] bg-[#1C2B21] text-[#3DD68C]">
              <Icon name="shield" className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#F2EDE0]">
                Role permissions
              </h2>
              <p className="mt-0.5 text-[10px] text-[#858D85]">
                Access by account type
              </p>
            </div>
          </div>

          <PermissionTable />

          <div className="border-t border-[#2A2F2B] bg-[#111412] p-4">
            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-[#929891]">
              <Icon
                name="info"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F2B134]"
              />
              Staff can view and add orders but cannot access financial
              information or management features.
            </p>
          </div>
        </section>
      </div>

      {/* Add / edit member */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${form.name}` : 'Add team member'}
      >
        {form && (
          <form onSubmit={handleSave} className="space-y-4">
            <ErrorText>{formError}</ErrorText>

            <Field label="Full name">
              <Input
                value={form.name}
                onChange={set('name')}
                placeholder="Enter full name"
                required
                autoFocus
              />
            </Field>

            <Field label="Email address">
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="name@example.com"
                required
                disabled={!!form.id}
              />
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full rounded-lg border border-[#394039] bg-[#111412] px-3 py-3 text-sm text-[#F2EDE0] outline-none transition-colors focus:border-[#3DD68C] disabled:opacity-50"
              >
                <option value="manager">Manager</option>
                <option value="staff">Kitchen Staff</option>
              </select>
            </Field>

            <Field
              label={form.id ? 'New password' : 'Temporary password'}
              hint={
                form.id
                  ? 'Leave blank to keep their current password.'
                  : 'They can change this from their Profile page.'
              }
            >
              <PasswordInput
                value={form.password}
                onChange={set('password')}
                minLength={6}
                required={!form.id}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-[#2A2F2B] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                loading={saving}
                icon="check"
              >
                {form.id ? 'Save changes' : 'Create account'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
