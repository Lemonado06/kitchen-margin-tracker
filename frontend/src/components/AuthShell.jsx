import { Link } from 'react-router-dom';
import { Backdrop } from './Layout';
import Icon from './Icon';

const features = [
  { icon: 'trend', text: 'True profit per order after commission, GST, discounts and food cost' },
  { icon: 'store', text: 'Every outlet, dish and platform in one place' },
  { icon: 'sparkles', text: 'Ask the AI assistant which dishes lose money' },
];

// Split-screen glass card shared by the login and register pages
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Backdrop />
      <div className="glass grid w-full max-w-4xl overflow-hidden rounded-3xl md:grid-cols-2 animate-scale-in">
        <div className="relative hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-emerald-500/15 via-transparent to-indigo-500/15 p-10 md:flex">
          <Link to="/" className="flex items-center gap-3 transition hover:opacity-90">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/30">
              <Icon name="chef" className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-bold text-white">Kitchen Margin Tracker</span>
          </Link>
          <div>
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              Know which dishes <span className="text-gradient">actually make money.</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {features.map((f, i) => (
                <li key={f.icon} style={{ animationDelay: `${150 + i * 120}ms` }} className="flex items-start gap-3 text-sm text-slate-300 animate-fade-up">
                  <span className="mt-0.5 rounded-lg bg-white/10 p-1.5 text-emerald-300"><Icon name={f.icon} className="w-4 h-4" /></span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">Built for cloud kitchens on Zomato, Swiggy and direct orders.</p>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-slate-400">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
