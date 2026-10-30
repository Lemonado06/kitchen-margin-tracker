import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import Icon from './Icon';
import { PageHeader } from './ui';

const tabs = [
  { to: 'dishes', label: 'Dishes', icon: 'chef' },
  { to: 'orders', label: 'Orders', icon: 'receipt' },
  { to: 'fee-rules', label: 'Fee rules', icon: 'percent' },
];

// Page header + tab bar shared by an outlet's Dishes, Orders and Fee rules pages
export default function OutletTabs({ outletId, title, subtitle }) {
  const [outlet, setOutlet] = useState(null);

  useEffect(() => {
    api.get('/outlets').then((res) => setOutlet(res.data.find((o) => o.id === outletId) || null)).catch(() => {});
  }, [outletId]);

  return (
    <>
      <PageHeader
        back={{ to: '/outlets', label: outlet ? `${outlet.name}${outlet.city ? ` · ${outlet.city}` : ''}` : 'Outlets' }}
        title={title}
        subtitle={subtitle}
      />
      <div className="mb-6 inline-flex gap-1 rounded-lg border border-line bg-surface p-1 shadow-sm animate-fade-up">
        {tabs.map((t) => (
          <NavLink key={t.to} to={`/outlets/${outletId}/${t.to}`}
            className={({ isActive }) => `flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition duration-150 ${
              isActive ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-subtle hover:text-ink'
            }`}>
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
