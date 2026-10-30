import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Logo, RoleBadge, ThemeToggle } from './ui';
import { getUser, isOwner, logout } from '../api/client';

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
          isActive ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-subtle hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} className={`w-4 h-4 ${isActive ? '' : 'text-muted'}`} />
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
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <Logo />
        <div>
          <p className="text-sm font-bold leading-tight tracking-tight text-ink">Kitchen Margin</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Tracker</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        <NavItem to="/dashboard" icon="dashboard" label="Dashboard" onClick={close} />
        <NavItem to="/outlets" icon="store" label="Outlets" onClick={close} />
        {isOwner() && <NavItem to="/team" icon="users" label="Team" onClick={close} />}
        <NavItem to="/profile" icon="user" label="Profile" onClick={close} />
      </nav>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
            {(user.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
          <ThemeToggle />
        </div>
        <button onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-muted transition hover:bg-bad-bg hover:text-bad">
          <Icon name="logout" className="w-4 h-4" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">{nav}</aside>

      {/* Mobile top bar + slide-in drawer */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Logo /> Kitchen Margin
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-ink-2 hover:bg-subtle" aria-label="Open menu">
            <Icon name="menu" />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 animate-fade-in" onClick={close} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface animate-slide-in-left">
            <button onClick={close} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label="Close menu">
              <Icon name="x" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* key = path so every page plays its enter transition */}
      <main key={location.pathname} className="px-4 py-6 sm:px-8 lg:ml-64 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
