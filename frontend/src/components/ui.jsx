
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// Shared design tokens are defined in index.css.
// Components here intentionally use solid surfaces, subtle borders and restrained green accents.

export function Card({
  className = '',
  hover = false,
  delay = 0,
  children,
  as: Tag = 'div',
  ...props
}) {
  return (
    <Tag
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={[
        'rounded-xl border border-[#2A2F2B] bg-[#151816] animate-fade-up',
        hover
          ? 'transition-colors duration-150 hover:border-[#3DD68C]/40 hover:bg-[#1A1C1B]'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}

const buttonStyles = {
  primary:
    'border border-[#3DD68C] bg-[#3DD68C] text-[#07130D] hover:bg-[#55E3A0] hover:border-[#55E3A0]',
  ghost:
    'border border-[#2A2F2B] bg-[#1A1C1B] text-[#E5E9E6] hover:bg-[#222623] hover:border-[#414943]',
  danger:
    'border border-[#E5484D]/30 bg-[#E5484D]/10 text-[#FF777B] hover:bg-[#E5484D]/20 hover:border-[#E5484D]/50',
  subtle:
    'border border-transparent bg-transparent text-[#A3AAA5] hover:bg-[#1A1C1B] hover:text-[#F2F5F2]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...props
}) {
  const sizes = {
    sm: 'min-h-8 px-3 py-1.5 text-xs gap-1.5 rounded-md',
    md: 'min-h-10 px-4 py-2 text-sm gap-2 rounded-lg',
    lg: 'min-h-12 px-5 py-3 text-base gap-2 rounded-lg',
  };

  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-semibold',
        'transition-colors duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3DD68C]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0E0D]',
        sizes[size] || sizes.md,
        buttonStyles[variant] || buttonStyles.primary,
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        icon && (
          <Icon
            name={icon}
            className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
          />
        )
      )}
      {children}
    </button>
  );
}

const fieldClass = [
  'w-full min-w-0 rounded-lg border border-[#343A35]',
  'bg-[#0C0E0D] px-3.5 py-2.5 text-sm text-[#F2F5F2]',
  'placeholder:text-[#69716B]',
  'transition-colors duration-150',
  'hover:border-[#465049]',
  'focus:border-[#3DD68C] focus:outline-none focus:ring-2 focus:ring-[#3DD68C]/10',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export function Input({ className = '', ...props }) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`${fieldClass} cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-xs font-semibold tracking-wide text-[#A3AAA5]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs leading-relaxed text-[#747D76]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className="pr-11"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#747D76] transition-colors hover:text-[#E5E9E6] focus-visible:outline-none focus-visible:text-[#3DD68C]"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <Icon
          name={show ? 'eyeOff' : 'eye'}
          className="h-4 w-4"
        />
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="group mb-3 inline-flex items-center gap-2 text-sm text-[#8D968F] transition-colors hover:text-[#3DD68C]"
          >
            <Icon
              name="arrowLeft"
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            />
            {back.label}
          </Link>
        )}

        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F2F5F2] sm:text-3xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#8D968F]">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-[#242925] text-[#B5BDB7] border-[#343B35]',
    green: 'bg-[#3DD68C]/10 text-[#3DD68C] border-[#3DD68C]/25',
    amber: 'bg-[#F2B134]/10 text-[#F2B134] border-[#F2B134]/25',
    red: 'bg-[#E5484D]/10 text-[#FF777B] border-[#E5484D]/25',
    violet: 'bg-[#A78BFA]/10 text-[#C4B5FD] border-[#A78BFA]/25',
    cyan: 'bg-[#67C9D0]/10 text-[#83D9DF] border-[#67C9D0]/25',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-1',
        'text-[11px] font-semibold leading-none',
        tones[tone] || tones.slate,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }) {
  const roles = {
    owner: ['green', 'Owner'],
    manager: ['cyan', 'Manager'],
    staff: ['amber', 'Staff'],
  };

  const [tone, label] = roles[role] || ['slate', role || 'Unknown'];

  return <Badge tone={tone}>{label}</Badge>;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Skeleton({ className = 'h-16' }) {
  return (
    <div
      className={`skeleton rounded-lg border border-[#2A2F2B] bg-[#151816] ${className}`}
    />
  );
}

export function EmptyState({ icon = 'info', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#343B35] bg-[#151816]/50 px-6 py-12 text-center animate-fade-in">
      <div className="mb-3 rounded-xl border border-[#2A2F2B] bg-[#1A1C1B] p-3 text-[#8D968F]">
        <Icon name={icon} className="h-6 w-6" />
      </div>

      <p className="font-semibold text-[#E5E9E6]">{title}</p>

      {children && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#8D968F]">
          {children}
        </p>
      )}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#E5484D]/25 bg-[#E5484D]/10 px-4 py-3 text-sm leading-relaxed text-[#FF999C] animate-scale-in">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Highlight shown above a form while an existing record is being edited.
export function EditingBanner({ show }) {
  if (!show) return null;

  return (
    <p className="mb-3 flex items-center gap-2 rounded-lg border border-[#F2B134]/20 bg-[#F2B134]/[0.07] px-3 py-2.5 text-sm font-medium text-[#F2B134] animate-fade-in">
      <Icon name="edit" className="h-4 w-4 shrink-0" />
      Editing: change the fields below, then click Save.
    </p>
  );
}

// Counts up from the previous value to the new one.
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

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{format(display)}</>;
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-black/75 animate-fade-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#343A35] bg-[#151816] p-5 shadow-2xl shadow-black/40 animate-scale-in sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-[#F2F5F2]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-[#8D968F] transition-colors hover:bg-[#242925] hover:text-white"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
