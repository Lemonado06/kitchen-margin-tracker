// Shared glassmorphism UI pieces used by every page
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

export function Card({ className = '', hover = false, delay = 0, children, as: Tag = 'div', ...props }) {
  return (
    <Tag
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`glass rounded-2xl animate-fade-up ${hover ? 'transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-emerald-500/10 hover:shadow-2xl' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

const buttonStyles = {
  primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:brightness-110',
  ghost: 'bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:border-white/20',
  danger: 'bg-rose-500/10 text-rose-300 border border-rose-400/20 hover:bg-rose-500/20 hover:text-rose-200',
  subtle: 'text-slate-300 hover:text-white hover:bg-white/10',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2.5 text-sm gap-2', lg: 'px-5 py-3 text-base gap-2' };
  return (
    <button
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${sizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner className="w-4 h-4" /> : icon && <Icon name={icon} className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}

const fieldClass = 'w-full rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400/60 focus:bg-slate-950/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-60';

export function Input({ className = '', ...props }) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return <select className={`${fieldClass} cursor-pointer ${className}`} {...props}>{children}</select>;
}

export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
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
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-200"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <Icon name={show ? 'eyeOff' : 'eye'} className="w-4 h-4" />
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        {back && (
          <Link to={back.to} className="group mb-2 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-emerald-300">
            <Icon name="arrowLeft" className="w-4 h-4 transition group-hover:-translate-x-1" />
            {back.label}
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-white/5 text-slate-300 ring-white/10',
    green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
    red: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
    violet: 'bg-violet-400/10 text-violet-300 ring-violet-400/20',
    cyan: 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/20',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function RoleBadge({ role }) {
  return <Badge tone={role === 'owner' ? 'violet' : 'cyan'}>{role === 'owner' ? 'Owner' : 'Manager'}</Badge>;
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
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export function EmptyState({ icon = 'info', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center animate-fade-in">
      <div className="mb-3 rounded-2xl bg-white/5 p-3 text-slate-400"><Icon name={icon} className="w-6 h-6" /></div>
      <p className="font-semibold text-slate-200">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-400">{children}</p>}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 animate-scale-in">
      <Icon name="alert" className="w-4 h-4 shrink-0" />
      {children}
    </div>
  );
}

// Highlight shown above a form while an existing record is being edited
export function EditingBanner({ show }) {
  if (!show) return null;
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-300 animate-fade-in">
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
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="glass-strong relative w-full max-w-md rounded-2xl p-6 animate-scale-in">
        <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}
