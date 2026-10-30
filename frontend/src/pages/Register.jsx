import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { saveSession } from '../api/client';
import AuthShell from '../components/AuthShell';
import Icon from '../components/Icon';
import { Button, ErrorText, Field, Input, PasswordInput } from '../components/ui';

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      // auto-login after successful register
      const res = await api.post('/auth/login', { email, password });
      saveSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Sign up as the kitchen owner. You can add managers later.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <Field label="Full name">
          <Input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="you@kitchen.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" hint="At least 6 characters">
          <PasswordInput minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex items-start gap-2 rounded-lg border border-info-line bg-info-bg p-3 text-xs text-info">
          <Icon name="info" className="mt-0.5 w-4 h-4 shrink-0 text-info" />
          Managers don't sign up here. Once you're in, add them from the Team page and they'll share your outlets.
        </div>
        <Button type="submit" size="lg" loading={loading} icon="arrowRight" className="w-full">
          Create account
        </Button>
        <p className="pt-2 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-good hover:text-good">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
