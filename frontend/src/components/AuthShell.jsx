import { Link } from 'react-router-dom';
import Icon from './Icon';
import { Logo, ThemeToggle } from './ui';

const features = [
  { icon: 'trend', text: 'True profit per order after commission, GST, discounts and food cost' },
  { icon: 'store', text: 'Every outlet, dish and platform in one place' },
  { icon: 'sparkles', text: 'Ask the AI assistant which dishes lose money' },
];

// Split-screen card shared by the login and register pages
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <ThemeToggle className="fixed right-4 top-4" />
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:grid-cols-2 animate-scale-in">
        <div className="hidden flex-col justify-between border-r border-line bg-subtle p-10 md:flex">
          <Link to="/" className="flex items-center gap-3 transition hover:opacity-80">
            <Logo size="lg" />
            <span className="text-base font-bold tracking-tight text-ink">Kitchen Margin Tracker</span>
          </Link>
          <div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-ink">
              Know which dishes <span className="text-accent">actually make money.</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {features.map((f, i) => (
                <li key={f.icon} style={{ animationDelay: `${100 + i * 80}ms` }} className="flex items-start gap-3 text-sm text-ink-2 animate-fade-up">
                  <span className="mt-0.5 rounded-md border border-line bg-surface p-1.5 text-accent"><Icon name={f.icon} className="w-4 h-4" /></span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted">Built for cloud kitchens on Zomato, Swiggy and direct orders.</p>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
