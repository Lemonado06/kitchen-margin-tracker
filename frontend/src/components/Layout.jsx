import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { RoleBadge } from './ui';
import { getUser, isOwner, logout } from '../api/client';

// Animated gradient blobs behind the glass panels
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-500/25 blur-3xl animate-blob" />
      <div className="absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/20 blur-3xl animate-blob [animation-delay:-6s]" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-600/25 blur-3xl animate-blob [animation-delay:-12s]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgb(2_6_23/0.6)_70%)]" />
    </div>
  );
}

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
          isActive ? 'bg-white/10 text-white shadow-inner shadow-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`absolute left-0 h-6 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-cyan-400 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 -translate-x-1'}`} />
          <Icon name={icon} className={`w-5 h-5 transition duration-200 group-hover:scale-110 ${isActive ? 'text-emerald-300' : ''}`} />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const close = () => setMenuOpen(false);
  const nav = (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/30">
          <Icon name="chef" className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">Kitchen Margin</p>
          <p className="text-xs text-slate-400">Tracker</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Menu</p>
        <NavItem to="/dashboard" icon="dashboard" label="Dashboard" onClick={close} />
        <NavItem to="/outlets" icon="store" label="Outlets" onClick={close} />
        {isOwner() && <NavItem to="/team" icon="users" label="Team" onClick={close} />}
        <NavItem to="/profile" icon="user" label="Profile" onClick={close} />
      </nav>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-sm font-bold text-white">
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>
        <button onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300">
          <Icon name="logout" className="w-4 h-4" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <Backdrop />

      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-64 flex-col rounded-3xl p-5 lg:flex animate-fade-in">{nav}</aside>

      {/* Mobile top bar + slide-in drawer */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 font-bold text-white">
          <Icon name="chef" className="w-5 h-5 text-emerald-300" /> Kitchen Margin
        </div>
        <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Open menu">
          <Icon name="menu" />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={close} />
          <aside className="glass-strong absolute inset-y-0 left-0 flex w-72 flex-col p-5 animate-slide-in-right">
            <button onClick={close} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10" aria-label="Close menu">
              <Icon name="x" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* key = path so every page plays its enter transition */}
      <main key={location.pathname} className="px-4 py-8 sm:px-8 lg:ml-72 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
