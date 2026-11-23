
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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
      });

      saveSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Login failed'
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your kitchen margins."
    >
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.15em] text-[#858D85]">
            ACCOUNT ACCESS
          </span>

          <span className="h-px flex-1 bg-[#2A2F2B]" />
        </div>

        <p className="text-xs leading-relaxed text-[#929891]">
          Access your outlets, orders, costs and business performance
          from one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorText>{error}</ErrorText>

        <Field label="Email address">
          <Input
            type="email"
            placeholder="you@kitchen.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <div className="pt-1">
          <Button
            type="submit"
            size="lg"
            loading={loading}
            icon="arrowRight"
            className="w-full"
          >
            Log in to your account
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[#2A2F2B]" />
          <span className="font-mono text-[9px] tracking-wider text-[#737B73]">
            NEW TO THE PLATFORM?
          </span>
          <span className="h-px flex-1 bg-[#2A2F2B]" />
        </div>

        <p className="text-center text-xs text-[#929891]">
          Create an owner account.{' '}
          <Link
            to="/register"
            className="font-semibold text-[#3DD68C] transition-colors hover:text-[#76E8AD]"
          >
            Get started
          </Link>
        </p>
      </form>

      <div className="mt-7 flex items-center justify-center gap-2 border-t border-[#2A2F2B] pt-5">
        <Icon
          name="shield"
          className="h-3.5 w-3.5 text-[#3DD68C]"
        />
        <span className="text-[10px] text-[#858D85]">
          Secure account authentication
        </span>
      </div>
    </AuthShell>
  );
}
