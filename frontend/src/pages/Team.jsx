import { useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import { Button, Card, ErrorText, Field, Input, Modal, PageHeader, PasswordInput, RoleBadge, Skeleton } from '../components/ui';

// What each role can do, shown so owners know what a manager can touch
const permissions = [
  ['View dashboard & AI assistant', true, true],
  ['Add & edit outlets, dishes, orders, fee rules', true, true],
  ['Delete outlets, dishes, orders, fee rules', true, false],
  ['Add or remove delivery platforms', true, false],
  ['Manage the team', true, false],
];

export default function Team() {
  const [team, loadTeam, loadError] = useLoad(() => api.get('/users').then((res) => res.data), []);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null = closed, {} = add, {id,...} = edit
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  function openAdd() {
    setFormError('');
    setForm({ name: '', email: '', password: '' });
  }

  function openEdit(member) {
    setFormError('');
    setForm({ id: member.id, name: member.name, email: member.email, password: '' });
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
        await api.put(`/users/${form.id}`, { name: form.name, password: form.password || undefined });
        toast(form.password ? 'Name and password updated' : 'Team member updated');
      } else {
        await api.post('/users', form);
        toast(`${form.name} added as a manager`);
      }
      setForm(null);
      loadTeam();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member) {
    const ok = await confirm({
      title: `Remove ${member.name}?`,
      message: 'They will be logged out and lose access to your outlets straight away. The records they created stay.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await api.delete(`/users/${member.id}`);
      toast(`${member.name} removed`);
      loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove team member');
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Managers log in with their own account and work on your outlets."
        actions={<Button icon="plus" onClick={openAdd}>Add manager</Button>}
      />

      <ErrorText>{error || loadError}</ErrorText>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {!team
            ? [0, 1].map((i) => <Skeleton key={i} className="h-20" />)
            : team.map((member, i) => (
              <Card key={member.id} delay={i * 70} className="group flex items-center justify-between gap-3 p-4 transition hover:border-ink/20">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${member.role === 'owner' ? 'bg-primary text-on-primary' : 'border border-line bg-subtle text-ink'}`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-ink">{member.name} <RoleBadge role={member.role} /></p>
                    <p className="truncate text-sm text-muted">{member.email}</p>
                  </div>
                </div>
                {member.role === 'manager' ? (
                  <div className="flex gap-1 opacity-70 transition group-hover:opacity-100">
                    <button onClick={() => openEdit(member)} className="rounded-lg p-2 text-muted transition hover:bg-subtle hover:text-ink" aria-label={`Edit ${member.name}`}>
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemove(member)} className="rounded-lg p-2 text-muted transition hover:bg-bad-bg hover:text-bad" aria-label={`Remove ${member.name}`}>
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted">You</span>
                )}
              </Card>
            ))}
          {team && team.length === 1 && (
            <p className="px-1 pt-2 text-sm text-muted animate-fade-in">No managers yet. Add one to share your outlets with your staff.</p>
          )}
        </div>

        <Card delay={150} className="h-fit overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-line p-5">
            <Icon name="shield" className="w-5 h-5 text-good" />
            <h2 className="font-semibold text-ink">Role permissions</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-5 py-2.5 text-left font-semibold">Action</th><th className="px-2 py-2.5 font-semibold">Owner</th><th className="px-5 py-2.5 font-semibold">Manager</th></tr>
            </thead>
            <tbody>
              {permissions.map(([action, owner, manager]) => (
                <tr key={action} className="border-t border-line">
                  <td className="px-5 py-2.5 text-ink-2">{action}</td>
                  {[owner, manager].map((allowed, i) => (
                    <td key={i} className="px-2 py-2.5 text-center last:pr-5">
                      <Icon name={allowed ? 'check' : 'x'} className={`mx-auto w-4 h-4 ${allowed ? 'text-good' : 'text-muted/50'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit ${form.name}` : 'Add a manager'}>
        {form && (
          <form onSubmit={handleSave} className="space-y-4">
            <ErrorText>{formError}</ErrorText>
            <Field label="Name"><Input value={form.name} onChange={set('name')} required autoFocus /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} required disabled={!!form.id} /></Field>
            <Field label={form.id ? 'New password' : 'Temporary password'} hint={form.id ? 'Leave blank to keep their current password' : 'Share it with them; they can change it on their Profile page'}>
              <PasswordInput value={form.password} onChange={set('password')} minLength={6} required={!form.id} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={saving} icon="check">{form.id ? 'Save' : 'Add manager'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
