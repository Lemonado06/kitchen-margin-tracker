import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { saveSession } from '../api/client';
import AuthShell from '../components/AuthShell';
import { Button, ErrorText, Field, Input, PasswordInput } from '../components/ui';

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
      const res = await api.post('/auth/login', { email, password });
      saveSession(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see today's margins.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <Field label="Email">
          <Input type="email" placeholder="you@kitchen.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <PasswordInput placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" loading={loading} icon="arrowRight" className="w-full">
          Log in
        </Button>
        <p className="pt-2 text-center text-sm text-slate-400">
          New here? <Link to="/register" className="font-semibold text-emerald-300 hover:text-emerald-200">Create an owner account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
