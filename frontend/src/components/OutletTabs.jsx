
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api, { isStaff } from '../api/client';
import Icon from './Icon';
import { PageHeader } from './ui';

const tabs = [
  { to: 'dishes', label: 'Dishes', icon: 'chef' },
  { to: 'orders', label: 'Orders', icon: 'receipt' },
  { to: 'fee-rules', label: 'Fee rules', icon: 'percent' },
];

// Shared outlet header and navigation for Dishes, Orders and Fee Rules.
export default function OutletTabs({ outletId, title, subtitle }) {
  const [outlet, setOutlet] = useState(null);

  const staff = isStaff();
  const visibleTabs = staff
    ? tabs.filter((tab) => tab.to === 'orders')
    : tabs;

  useEffect(() => {
    let active = true;

    api
      .get('/outlets')
      .then((res) => {
        if (active) {
          setOutlet(
            res.data.find((item) => item.id === outletId) || null
          );
        }
      })
      .catch(() => {
        if (active) setOutlet(null);
      });

    return () => {
      active = false;
    };
  }, [outletId]);

  const backLabel = outlet
    ? `${outlet.name}${outlet.city ? ` · ${outlet.city}` : ''}`
    : 'Outlets';

  return (
    <>
      <PageHeader
        back={{ to: '/outlets', label: backLabel }}
        title={title}
        subtitle={subtitle}
      />

      <div className="mb-6 border-b border-[#2A2F2B]">
        <nav
          aria-label="Outlet sections"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={`/outlets/${outletId}/${tab.to}`}
              className={({ isActive }) =>
                [
                  'relative flex shrink-0 items-center gap-2.5 px-4 py-3',
                  'text-xs font-medium transition-colors duration-150',
                  'border-b-2',
                  isActive
                    ? 'border-[#3DD68C] text-[#3DD68C]'
                    : 'border-transparent text-[#929891] hover:text-[#F2EDE0]',
                ].join(' ')
              }
            >
              <Icon name={tab.icon} className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
