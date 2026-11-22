import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Multi-select dropdown for choosing which outlets to analyse. At least one outlet always stays selected.
export default function OutletPicker({ outlets, selected, onChange, max = 10 }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const allIds = outlets.slice(0, max).map((o) => o.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
    const only = selected.length === 1 ? outlets.find((o) => o.id === selected[0])?.name : null;
    const label = !outlets.length ? 'No outlets'
        : allSelected && outlets.length > 1 ? `All outlets (${outlets.length})`
            : only || `${selected.length} outlets`;

    // Keep the outlets in their usual order whatever order they were ticked in
    const emit = (ids) => onChange(outlets.filter((o) => ids.includes(o.id)).map((o) => o.id));

    function toggle(id) {
        if (selected.includes(id)) {
            if (selected.length > 1) emit(selected.filter((s) => s !== id));
        } else if (selected.length < max) {
            emit([...selected, id]);
        }
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-left text-sm text-slate-100 transition focus:border-emerald-400/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/10"
            >
                <span className="truncate">{label}</span>
                <span className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
            </button>

            {open && (
                <div role="listbox" aria-multiselectable="true" className="glass-strong absolute left-0 z-30 mt-2 w-72 max-w-[85vw] rounded-xl p-2 shadow-2xl animate-scale-in">
                    {outlets.length > 1 && (
                        <button type="button" onClick={() => emit(allIds)} disabled={allSelected}
                            className="mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-white/5 disabled:cursor-default disabled:text-slate-500 disabled:hover:bg-transparent">
                            Select all
                        </button>
                    )}
                    <div className="max-h-64 overflow-y-auto">
                        {outlets.map((o) => {
                            const checked = selected.includes(o.id);
                            const lastOne = checked && selected.length === 1;
                            const atMax = !checked && selected.length >= max;
                            return (
                                <label key={o.id} title={lastOne ? 'At least one outlet must stay selected' : atMax ? `You can compare up to ${max} outlets` : undefined}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5 ${lastOne || atMax ? 'cursor-not-allowed opacity-60' : ''}`}>
                                    <input type="checkbox" checked={checked} disabled={lastOne || atMax} onChange={() => toggle(o.id)} className="h-4 w-4 accent-emerald-400" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-slate-100">{o.name}</span>
                                        {o.city && <span className="block truncate text-xs text-slate-500">{o.city}</span>}
                                    </span>
                                    {checked && <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-300" />}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}