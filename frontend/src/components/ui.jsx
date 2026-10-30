// Shared UI pieces used by every page; colours come from the theme tokens in index.css
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useTheme } from '../hooks';

export function Card({ className = '', hover = false, delay = 0, children, as: Tag = 'div', ...props }) {
  return (
    <Tag
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`rounded-xl border border-line bg-surface shadow-sm animate-fade-up ${hover ? 'transition duration-200 hover:border-ink/20 hover:shadow-md' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

const buttonStyles = {
  primary: 'bg-primary text-on-primary shadow-sm hover:opacity-90',
  ghost: 'border border-line bg-surface text-ink shadow-sm hover:bg-subtle',
  danger: 'border border-bad-line bg-bad-bg text-bad hover:brightness-95',
  subtle: 'text-ink-2 hover:bg-subtle hover:text-ink',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, ...props }) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs gap-1.5', md: 'px-3.5 py-2 text-sm gap-2', lg: 'px-5 py-2.5 text-sm gap-2' };
  return (
    <button
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center rounded-lg font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${sizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner className="w-4 h-4" /> : icon && <Icon name={icon} className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}

const fieldClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:opacity-60';

export function Input({ className = '', ...props }) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return <select className={`${fieldClass} cursor-pointer ${className}`} {...props}>{children}</select>;
}

export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <Icon name={show ? 'eyeOff' : 'eye'} className="w-4 h-4" />
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        {back && (
          <Link to={back.to} className="group mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
            <Icon name="arrowLeft" className="w-4 h-4 transition group-hover:-translate-x-0.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-subtle text-ink-2 border-line',
    green: 'bg-good-bg text-good border-good-line',
    amber: 'bg-warn-bg text-warn border-warn-line',
    red: 'bg-bad-bg text-bad border-bad-line',
    violet: 'bg-info-bg text-info border-info-line',
    cyan: 'bg-info-bg text-info border-info-line',
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function RoleBadge({ role }) {
  return <Badge tone={role === 'owner' ? 'green' : 'violet'}>{role === 'owner' ? 'Owner' : 'Manager'}</Badge>;
}

export function Spinner({ className = 'w-5 h-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = 'h-16' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function EmptyState({ icon = 'info', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center animate-fade-in">
      <div className="mb-3 rounded-lg bg-subtle p-3 text-muted"><Icon name={icon} className="w-6 h-6" /></div>
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-line bg-bad-bg px-4 py-3 text-sm text-bad animate-scale-in">
      <Icon name="alert" className="w-4 h-4 shrink-0" />
      {children}
    </div>
  );
}

// Highlight shown above a form while an existing record is being edited
export function EditingBanner({ show }) {
  if (!show) return null;
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-warn animate-fade-in">
      <Icon name="edit" className="w-4 h-4" /> Editing: change the fields below, then click Save.
    </p>
  );
}

// Counts up from the previous value to the new one
export function AnimatedNumber({ value, format = (v) => v, duration = 700 }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(initial + (value - initial) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{format(display)}</>;
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="glass relative w-full max-w-md rounded-xl p-6 animate-scale-in">
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Soft colour shapes behind glass panels (landing and auth pages), so the frosted glass has something to blur
export function Aurora({ className = 'fixed' }) {
  return (
    <div className={`pointer-events-none inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/20" />
      <div className="absolute -right-20 top-1/4 h-[24rem] w-[24rem] rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/20" />
      <div className="absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10" />
    </div>
  );
}

// Brand mark: dark tile with the chef icon, as in the sidebar and auth pages
export function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary`}>
      <Icon name="chef" className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2.2} />
    </div>
  );
}

// Sun/moon button that switches between the light and dark theme
export function ThemeToggle({ className = '' }) {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition hover:bg-subtle hover:text-ink ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="w-4 h-4" />
    </button>
  );
}
