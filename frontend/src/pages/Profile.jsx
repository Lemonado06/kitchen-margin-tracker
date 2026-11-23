
import { useState, useEffect } from 'react';
import api, { saveSession } from '../api/client';
import Icon from '../components/Icon';
import { useToast } from '../hooks';
import {
  Button,
  ErrorText,
  Field,
  Input,
  PageHeader,
  PasswordInput,
  Skeleton,
} from '../components/ui';

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

function roleName(role) {
  if (role === 'owner') return 'Owner';
  if (role === 'staff') return 'Kitchen Staff';
  return 'Manager';
}

export default function Profile() {
  const [me, setMe] = useState(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();

  useEffect(() => {
    let active = true;

    api
      .get('/users/me')
      .then((res) => {
        if (!active) return;
        setMe(res.data);
        setName(res.data.name);
      })
      .catch(() => {
        if (active) setError('Failed to load your profile');
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword && !currentPassword) {
      setError('Enter your current password to change it');
      return;
    }

    setSaving(true);

    try {
      const body = { name: name.trim() };

      if (newPassword) {
        Object.assign(body, {
          current_password: currentPassword,
          new_password: newPassword,
        });
      }

      const res = await api.put('/users/me', body);

      saveSession(null, {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
      });

      setMe((previous) => ({
        ...previous,
        ...res.data,
      }));

      setName(res.data.name);
      setCurrentPassword('');
      setNewPassword('');

      toast(
        newPassword
          ? 'Profile and password updated'
          : 'Profile updated'
      );
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  }

  const style = roleStyles[me?.role] || roleStyles.manager;
  const initial = me?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="space-y-7">
      <PageHeader
        title="Profile"
        subtitle="Your account details, identity and security settings."
      />

      {!me ? (
        <div className="grid max-w-4xl gap-6 md:grid-cols-5">
          <Skeleton className="h-72 md:col-span-2" />
          <Skeleton className="h-96 md:col-span-3" />
        </div>
      ) : (
        <div className="grid max-w-4xl items-start gap-5 md:grid-cols-5">
          {/* Account identity */}
          <section className="overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816] md:col-span-2">
            <div className="border-b border-[#2A2F2B] px-5 py-4">
              <p className="font-mono text-[9px] tracking-[0.14em] text-[#858D85]">
                ACCOUNT IDENTITY
              </p>
            </div>

            <div className="flex flex-col items-center px-5 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#31513E] bg-[#1C2B21] font-mono text-3xl font-semibold text-[#3DD68C]">
                {initial}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[#F2EDE0]">
                {me.name}
              </h2>

              <p className="mt-1 break-all text-xs text-[#929891]">
                {me.email}
              </p>

              <span
                className="mt-4 inline-flex rounded border px-3 py-1.5 font-mono text-[9px] tracking-wider"
                style={{
                  color: style.color,
                  backgroundColor: style.background,
                  borderColor: style.border,
                }}
              >
                {roleName(me.role).toUpperCase()}
              </span>

              {me.owner_name && (
                <div className="mt-6 w-full border-t border-[#2A2F2B] pt-4">
                  <p className="font-mono text-[9px] tracking-wider text-[#858D85]">
                    ACCOUNT MANAGED BY
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#F2EDE0]">
                    {me.owner_name}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[#2A2F2B] bg-[#111412] px-5 py-4">
              <p className="flex items-center gap-2 text-[10px] text-[#929891]">
                <Icon
                  name="shield"
                  className="h-3.5 w-3.5 text-[#3DD68C]"
                />
                Account access is controlled by your assigned role.
              </p>
            </div>
          </section>

          {/* Profile settings */}
          <section className="overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816] md:col-span-3">
            <div className="border-b border-[#2A2F2B] px-5 py-4">
              <p className="font-mono text-[9px] tracking-[0.14em] text-[#858D85]">
                ACCOUNT SETTINGS
              </p>

              <h2 className="mt-1 text-base font-semibold text-[#F2EDE0]">
                Personal information
              </h2>

              <p className="mt-1 text-xs text-[#929891]">
                Update the name associated with your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <ErrorText>{error}</ErrorText>

              <Field label="Full name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </Field>

              <Field label="Email address">
                <Input
                  type="email"
                  value={me.email}
                  disabled
                />
              </Field>

              <div className="border-t border-[#2A2F2B] pt-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#31513E] bg-[#1C2B21] text-[#3DD68C]">
                    <Icon name="key" className="h-4 w-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#F2EDE0]">
                      Change password
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[#858D85]">
                      Update your account credentials.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="Current password">
                    <PasswordInput
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </Field>

                  <Field
                    label="New password"
                    hint="Minimum 6 characters. Leave both password fields blank to keep your current password."
                  >
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#2A2F2B] pt-5">
                <Button
                  type="submit"
                  loading={saving}
                  icon="check"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
