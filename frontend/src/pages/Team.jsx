import { useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import {
  Button, Card, ErrorText, Field, Input, Modal,
  PageHeader, PasswordInput, RoleBadge, Skeleton
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
      role: 'manager'
    });
  }

  function openEdit(member) {
    setFormError('');
    setForm({
      id: member.id,
      name: member.name,
      email: member.email,
      password: '',
      role: member.role
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');

    if (form.password && form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, {
          name: form.name,
          password: form.password || undefined,
          role: form.role
        });

        toast('Team member updated');
      } else {
        await api.post('/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role
        });

        toast(
          `${form.name} added as ${form.role === 'staff' ? 'Kitchen Staff' : 'Manager'
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
    setForm({ ...form, [key]: e.target.value });
  };

  function roleName(role) {
    if (role === 'owner') return 'Owner';
    if (role === 'staff') return 'Kitchen Staff';
    return 'Manager';
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Manage the people who have access to your outlets."
        actions={
          <Button icon="plus" onClick={openAdd}>
            Add Team Member
          </Button>
        }
      />

      <ErrorText>{error || loadError}</ErrorText>

      <div className="grid gap-6 lg:grid-cols-5">

        {/* TEAM MEMBERS */}

        <div className="space-y-3 lg:col-span-3">

          {!team ? (
            [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : (
            team.map((member, i) => {
              const isOwner = member.role === 'owner';

              return (
                <Card
                  key={member.id}
                  delay={i * 70}
                  className="group flex items-center justify-between gap-3 p-4 transition hover:border-white/20"
                >
                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white bg-gradient-to-br ${isOwner
                          ? 'from-violet-400 to-indigo-500'
                          : member.role === 'staff'
                            ? 'from-amber-400 to-orange-500'
                            : 'from-cyan-400 to-emerald-500'
                        }`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                        {member.name}
                        <RoleBadge role={member.role} />
                      </p>

                      <p className="truncate text-sm text-slate-400">
                        {member.email}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {roleName(member.role)}
                      </p>
                    </div>
                  </div>

                  {isOwner ? (
                    <span className="shrink-0 text-xs font-medium text-violet-300">
                      You
                    </span>
                  ) : (
                    <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">

                      <button
                        onClick={() => openEdit(member)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label={`Edit ${member.name}`}
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemove(member)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                        aria-label={`Remove ${member.name}`}
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>

                    </div>
                  )}
                </Card>
              );
            })
          )}

          {team && team.length === 1 && (
            <p className="px-1 pt-2 text-sm text-slate-400">
              No team members yet. Add a manager or kitchen staff member.
            </p>
          )}
        </div>

        {/* ROLE PERMISSIONS */}

        <Card
          delay={150}
          className="h-fit overflow-x-auto lg:col-span-2"
        >
          <div className="flex items-center gap-2 border-b border-white/10 p-5">
            <Icon
              name="shield"
              className="w-5 h-5 text-emerald-300"
            />
            <h2 className="font-semibold text-white">
              Role permissions
            </h2>
          </div>

          <table className="w-full text-xs sm:text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">
                  Action
                </th>
                <th className="px-2 py-3 font-semibold">
                  Owner
                </th>
                <th className="px-2 py-3 font-semibold">
                  Manager
                </th>
                <th className="px-2 py-3 font-semibold">
                  Staff
                </th>
              </tr>
            </thead>

            <tbody>
              {permissions.map(([action, owner, manager, staff]) => (
                <tr
                  key={action}
                  className="border-t border-white/5"
                >
                  <td className="px-3 py-3 text-slate-300">
                    {action}
                  </td>

                  {[owner, manager, staff].map((allowed, i) => (
                    <td key={i} className="px-2 py-3 text-center">
                      <Icon
                        name={allowed ? 'check' : 'x'}
                        className={`mx-auto h-4 w-4 ${allowed
                            ? 'text-emerald-300'
                            : 'text-slate-600'
                          }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="border-t border-white/10 p-4 text-xs text-slate-500">
            Staff can view and add orders but cannot access financial
            information or management features.
          </p>
        </Card>
      </div>

      {/* ADD / EDIT MODAL */}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={
          form?.id
            ? `Edit ${form.name}`
            : 'Add Team Member'
        }
      >
        {form && (
          <form onSubmit={handleSave} className="space-y-4">

            <ErrorText>{formError}</ErrorText>

            <Field label="Name">
              <Input
                value={form.name}
                onChange={set('name')}
                required
                autoFocus
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                disabled={!!form.id}
              />
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
              >
                <option value="manager">
                  Manager
                </option>
                <option value="staff">
                  Kitchen Staff
                </option>
              </select>
            </Field>

            <Field
              label={
                form.id ? 'New password' : 'Temporary password'
              }
              hint={
                form.id
                  ? 'Leave blank to keep their current password'
                  : 'They can change this from their Profile page'
              }
            >
              <PasswordInput
                value={form.password}
                onChange={set('password')}
                minLength={6}
                required={!form.id}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">

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
                {form.id ? 'Save Changes' : 'Add Team Member'}
              </Button>

            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
