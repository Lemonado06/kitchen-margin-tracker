import { useState, useEffect } from 'react';
import api, { saveSession } from '../api/client';
import Icon from '../components/Icon';
import { useToast } from '../hooks';
import { Button, Card, ErrorText, Field, Input, PageHeader, PasswordInput, RoleBadge, Skeleton } from '../components/ui';

export default function Profile() {
  const [me, setMe] = useState(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/users/me')
      .then((res) => { setMe(res.data); setName(res.data.name); })
      .catch(() => setError('Failed to load your profile'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const body = { name };
      if (newPassword) Object.assign(body, { current_password: currentPassword, new_password: newPassword });
      const res = await api.put('/users/me', body);
      saveSession(null, { id: res.data.id, name: res.data.name, email: res.data.email, role: res.data.role });
      setMe({ ...me, ...res.data });
      setCurrentPassword('');
      setNewPassword('');
      toast(newPassword ? 'Profile and password updated' : 'Profile updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details and password." />

      {!me ? (
        <Skeleton className="h-80 max-w-2xl" />
      ) : (
        <div className="grid max-w-4xl gap-6 md:grid-cols-5">
          <Card className="flex flex-col items-center p-6 text-center md:col-span-2">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-on-primary animate-scale-in">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-lg font-semibold text-ink">{me.name}</p>
            <p className="mb-3 text-sm text-muted">{me.email}</p>
            <RoleBadge role={me.role} />
            {me.owner_name && <p className="mt-4 text-xs text-muted">Manager for <span className="font-semibold text-ink">{me.owner_name}</span>'s outlets</p>}
          </Card>

          <Card as="form" onSubmit={handleSubmit} delay={80} className="space-y-4 p-6 md:col-span-3">
            <ErrorText>{error}</ErrorText>
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <div className="flex items-center gap-2 pt-2 text-sm font-semibold text-ink">
              <Icon name="key" className="w-4 h-4 text-good" /> Change password
            </div>
            <Field label="Current password"><PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field>
            <Field label="New password" hint="Leave both blank to keep your current password">
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
            </Field>
            <Button type="submit" loading={saving} icon="check">Save changes</Button>
          </Card>
        </div>
      )}
    </>
  );
}
