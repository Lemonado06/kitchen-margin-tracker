
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { canViewProfit, getUser, logout } from '../api/client';
import Icon from './Icon';

const GREEN = '#34D399';

const navigation = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    visible: (user) => canViewProfit(user),
  },
  {
    label: 'Outlets',
    path: '/outlets',
    icon: 'store',
    visible: () => true,
  },
  {
    label: 'Team',
    path: '/team',
    icon: 'users',
    visible: (user) => user?.role === 'owner',
  },
  {
    label: 'Activity',
    path: '/activity',
    icon: 'activity',
    visible: (user) => user?.role === 'owner',
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: 'user',
    visible: () => true,
  },
];

const roleLabels = {
  owner: 'OWNER',
  manager: 'MANAGER',
  staff: 'KITCHEN STAFF',
};

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group relative flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5',
          'text-[13px] font-medium transition-all duration-150',
          isActive
            ? 'bg-[#1D2923] text-[#F1F1EE]'
            : 'text-[#929891] hover:bg-[#1A201C] hover:text-[#F1F1EE]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
              style={{ backgroundColor: GREEN }}
            />
          )}

          <Icon
            name={item.icon}
            className={[
              'h-[17px] w-[17px] shrink-0 transition-colors',
              isActive
                ? 'text-[#34D399]'
                : 'text-[#777F78] group-hover:text-[#D6D9D4]',
            ].join(' ')}
          />

          <span>{item.label}</span>

          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#34D399]" />
          )}
        </>
      )}
    </NavLink>
  );
}

function Brand({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-3 text-left"
      aria-label="Go to outlets"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#34D399] text-[#07140D]">
        <Icon name="chef" className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold tracking-tight text-[#F1F1EE]">
          Kitchen Margin
        </span>
        <span className="mt-0.5 block font-mono text-[9px] tracking-[0.16em] text-[#7F877F]">
          OPERATIONS SYSTEM
        </span>
      </span>
    </button>
  );
}

export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[#0C0E0D]"
    />
  );
}

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavigation = navigation.filter((item) => item.visible(user));
  const roleLabel = roleLabels[user?.role] || 'ACCOUNT';

  const initials = (user?.name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function goToOutlets() {
    closeMobileMenu();
    navigate('/outlets');
  }

  return (
    <div className="relative min-h-screen bg-[#0C0E0D] text-[#F1F1EE]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between border-b border-[#2A2F2B] bg-[#121513] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A0A69F] transition-colors hover:bg-[#242925] hover:text-[#F1F1EE]"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <Brand onClick={goToOutlets} />

        <span className="w-9" />
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col',
            'border-r border-[#2A2F2B] bg-[#121513]',
            'transition-transform duration-200 ease-out',
            'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          {/* Brand header */}
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#2A2F2B] px-5">
            <Brand onClick={goToOutlets} />

            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Close navigation"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#242925] hover:text-[#F1F1EE] lg:hidden"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          {/* Account */}
          <div className="border-b border-[#2A2F2B] px-5 py-5">
            <p className="mb-2 font-mono text-[9px] font-medium tracking-[0.16em] text-[#747D75]">
              SIGNED IN AS
            </p>

            <p className="truncate text-[13px] font-semibold text-[#F1F1EE]">
              {user?.name || 'Account'}
            </p>

            <div className="mt-2 flex min-w-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#34D399]" />
              <span className="truncate text-[11px] text-[#929891]">
                {user?.email || 'Signed in'}
              </span>
            </div>

            <span className="mt-3 inline-flex rounded border border-[#285B46] bg-[#14251D] px-2 py-1 font-mono text-[9px] font-medium tracking-[0.12em] text-[#34D399]">
              {roleLabel}
            </span>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Main navigation"
            className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
          >
            <p className="mb-3 px-3 font-mono text-[9px] font-medium tracking-[0.18em] text-[#747D75]">
              WORKSPACE
            </p>

            {visibleNavigation.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                onNavigate={closeMobileMenu}
              />
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-[#2A2F2B] p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-[#2A2F2B] bg-[#171B18] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#285B46] bg-[#14251D] font-mono text-xs font-semibold text-[#34D399]">
                {initials || 'U'}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#F1F1EE]">
                  {user?.name || 'User'}
                </p>
                <p className="mt-0.5 truncate font-mono text-[9px] tracking-wider text-[#858D85]">
                  {roleLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-medium text-[#929891] transition-colors hover:bg-[#2B1D1D] hover:text-[#B5242F]"
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main
            key={location.pathname}
            className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </main>

          <footer className="border-t border-[#252A26] px-5 py-4">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[9px] tracking-[0.13em] text-[#737B74]">
                KITCHEN MARGIN TRACKER
              </span>

              <span className="font-mono text-[9px] tracking-[0.1em] text-[#555D56]">
                OPERATIONS &amp; FINANCIAL CONTROL
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
