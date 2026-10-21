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
      <div className="glass mb-6 inline-flex gap-1 rounded-2xl p-1.5 animate-fade-up">
        {tabs.map((t) => (
          <NavLink key={t.to} to={`/outlets/${outletId}/${t.to}`}
            className={({ isActive }) => `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition duration-200 ${
              isActive ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}>
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
