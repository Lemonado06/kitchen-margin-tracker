
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { saveSession } from '../api/client';
import AuthShell from '../components/AuthShell';
import Icon from '../components/Icon';
import {
  Button,
  ErrorText,
  Field,
  Input,
  PasswordInput,
} from '../components/ui';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Automatically log in after successful registration.
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      saveSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Registration failed. Please try again.'
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your kitchen workspace and start tracking real profitability."
    >
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[10px] font-medium tracking-[0.16em] text-[#3DD68C]">
            NEW WORKSPACE
          </span>
          <span className="h-px flex-1 bg-[#2A2F2B]" />
        </div>

        <p className="text-sm leading-relaxed text-[#929B94]">
          Create your owner account to configure outlets, manage your team
          and understand where your money goes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>

        <Field label="Full name">
          <Input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            autoFocus
          />
        </Field>

        <Field label="Email address">
          <Input
            type="email"
            placeholder="you@kitchen.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Field
          label="Password"
          hint="Use at least 6 characters."
        >
          <PasswordInput
            minLength={6}
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <div className="flex items-start gap-3 rounded-lg border border-[#65502A]/70 bg-[#211D16] p-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F2B134]/10 text-[#F2B134]">
            <Icon name="shield" className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F2B134]">
              Owner registration
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#C5B99F]">
              This creates the primary owner account. Managers and kitchen
              staff can be added later through the Team page.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          icon="arrowRight"
          className="mt-2 w-full"
        >
          Create owner account
        </Button>

        <p className="pt-2 text-center text-sm text-[#929B94]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#3DD68C] transition-colors hover:text-[#76E8AD]"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
