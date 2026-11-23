
import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';
import { ErrorText, PageHeader, Skeleton } from '../components/ui';

const MODULES = [
    'AUTH',
    'ORDERS',
    'OUTLETS',
    'MENU',
    'RECIPE_COSTING',
    'FEE_RULES',
    'TEAM',
    'PROFILE',
];

const ACTIONS = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGIN_FAILED',
    'LOGOUT',
];

const moduleNames = {
    AUTH: 'Authentication',
    ORDERS: 'Orders',
    OUTLETS: 'Outlets',
    MENU: 'Menu',
    RECIPE_COSTING: 'Recipe costing',
    FEE_RULES: 'Fee rules',
    TEAM: 'Team',
    PROFILE: 'Profile',
};

const actionStyles = {
    CREATE: 'border-[#285B46] bg-[#14251D] text-[#34D399]',
    UPDATE: 'border-[#31515A] bg-[#1C2B30] text-[#75C9D8]',
    DELETE: 'border-[#633238] bg-[#2B1D1D] text-[#E98286]',
    LOGIN: 'border-[#285B46] bg-[#14251D] text-[#34D399]',
    LOGIN_FAILED: 'border-[#633238] bg-[#2B1D1D] text-[#E98286]',
    LOGOUT: 'border-[#394039] bg-[#242925] text-[#A0A69F]',
};

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ActionBadge({ action }) {
    return (
        <span
            className={[
                'inline-flex whitespace-nowrap rounded border px-2 py-1',
                'font-mono text-[9px] tracking-wider',
                actionStyles[action] || 'border-[#394039] bg-[#242925] text-[#A0A69F]',
            ].join(' ')}
        >
            {(action || 'UNKNOWN').replace('_', ' ')}
        </span>
    );
}

function StatCard({ label, value, icon, color = '#F1F1EE', note }) {
    return (
        <div className="rounded-xl border border-[#2A2F2B] bg-[#121513] p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
                    {label}
                </p>

                <Icon
                    name={icon}
                    className="h-4 w-4"
                    style={{ color }}
                />
            </div>

            <p
                className="mt-3 font-mono text-2xl font-semibold tabular-nums"
                style={{ color }}
            >
                {value ?? '—'}
            </p>

            {note && (
                <p className="mt-1 text-[10px] text-[#737B74]">
                    {note}
                </p>
            )}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#394039] bg-[#171B18]">
                <Icon name="activity" className="h-5 w-5 text-[#858D85]" />
            </div>

            <p className="mt-3 text-sm font-medium text-[#F1F1EE]">
                Nothing to show yet
            </p>

            <p className="mt-1 text-xs text-[#858D85]">
                {message}
            </p>
        </div>
    );
}

function ActivityTable({ logs, onSelectUser }) {
    if (!logs?.length) {
        return (
            <EmptyState message="Activity records will appear here as your team uses the application." />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
                <thead>
                    <tr className="border-b border-[#2A2F2B]">
                        {['USER', 'ACTION', 'MODULE', 'DESCRIPTION', 'TIMESTAMP'].map((heading) => (
                            <th
                                key={heading}
                                className="px-4 py-3 text-left font-mono text-[9px] tracking-wider text-[#858D85]"
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {logs.map((log) => (
                        <tr
                            key={log.id || log._id}
                            className="border-b border-[#242A25] last:border-0 hover:bg-[#191E1A]"
                        >
                            <td className="px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => log.user_id && onSelectUser(log.user_id)}
                                    disabled={!log.user_id}
                                    className="text-left text-xs font-medium text-[#F1F1EE] transition-colors hover:text-[#34D399] disabled:cursor-default"
                                >
                                    {log.user_name || 'Unknown user'}
                                </button>

                                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#737B74]">
                                    {log.user_role || 'Unknown role'}
                                </p>
                            </td>

                            <td className="px-4 py-3">
                                <ActionBadge action={log.action} />
                            </td>

                            <td className="px-4 py-3 text-[#C5CBC3]">
                                {moduleNames[log.module] || log.module}
                            </td>

                            <td className="max-w-[280px] px-4 py-3 text-[#929891]">
                                <p className="line-clamp-2">
                                    {log.description}
                                </p>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-[#858D85]">
                                {formatDate(log.created_at)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Activity() {
    const [summary, setSummary] = useState(null);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0,
    });

    const [users, setUsers] = useState([]);
    const [userFilter, setUserFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [view, setView] = useState('activity');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [userLogs, setUserLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSummary = useCallback(async () => {
        const response = await api.get('/activity/summary');
        return response.data;
    }, []);

    const loadSummary = useCallback(async () => {
        try {
            const data = await fetchSummary();
            setSummary(data);
            setUsers(data.users || []);
        } catch (err) {
            setError(
                err.response?.data?.error || 'Failed to load activity overview'
            );
        }
    }, [fetchSummary]);

    const fetchActivity = useCallback(async (page = 1) => {
        const params = {
            page,
            limit: 25,
        };

        if (userFilter) params.user_id = userFilter;

        if (view === 'logins') {
            const response = await api.get('/activity/logins', { params });

            return {
                logs: response.data.logs || [],
                pagination: response.data.pagination,
            };
        }

        if (moduleFilter) params.module = moduleFilter;
        if (actionFilter) params.action = actionFilter;
        if (from) params.from = from;
        if (to) params.to = to;

        const response = await api.get('/activity', { params });

        return {
            logs: response.data.logs || [],
            pagination: response.data.pagination,
        };
    }, [view, userFilter, moduleFilter, actionFilter, from, to]);

    const loadActivity = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            const data = await fetchActivity(page);
            setLogs(data.logs);
            setPagination(data.pagination);
        } catch (err) {
            setError(
                err.response?.data?.error || 'Failed to load activity records'
            );
        } finally {
            setLoading(false);
        }
    }, [fetchActivity]);

    useEffect(() => {
        let active = true;

        async function fetchInitialSummary() {
            try {
                const data = await fetchSummary();

                if (!active) return;

                setSummary(data);
                setUsers(data.users || []);
            } catch (err) {
                if (!active) return;

                setError(
                    err.response?.data?.error || 'Failed to load activity overview'
                );
            }
        }

        fetchInitialSummary();

        return () => {
            active = false;
        };
    }, [fetchSummary]);

    useEffect(() => {
        let active = true;

        async function fetchInitialActivity() {
            try {
                const data = await fetchActivity(1);

                if (!active) return;

                setLogs(data.logs);
                setPagination(data.pagination);
            } catch (err) {
                if (!active) return;

                setError(
                    err.response?.data?.error || 'Failed to load activity records'
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchInitialActivity();

        return () => {
            active = false;
        };
    }, [fetchActivity]);

    async function openUserDetail(userId) {
        setSelectedUser(userId);
        setDetailLoading(true);
        setUserDetail(null);
        setUserLogs([]);

        try {
            const response = await api.get(`/activity/user/${userId}`);

            setUserDetail(response.data);
            setUserLogs(response.data.logs || []);
        } catch (err) {
            setError(
                err.response?.data?.error || 'Failed to load user activity'
            );
        } finally {
            setDetailLoading(false);
        }
    }

    function resetFilters() {
        setUserFilter('');
        setModuleFilter('');
        setActionFilter('');
        setFrom('');
        setTo('');
    }

    function changeView(nextView) {
        setSelectedUser(null);
        setUserDetail(null);
        setView(nextView);
    }

    const activeTabClass = (tab) =>
        view === tab
            ? 'border-[#34D399] bg-[#14251D] text-[#34D399]'
            : 'border-[#2A2F2B] bg-[#121513] text-[#929891] hover:text-[#F1F1EE]';

    return (
        <div className="space-y-7">
            <PageHeader
                title="Admin activity"
                subtitle="Monitor account access and actions performed across your team."
                actions={
                    <button
                        type="button"
                        onClick={() => {
                            loadSummary();
                            loadActivity(pagination.page);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#394039] bg-[#121513] px-3.5 text-xs font-medium text-[#C5CBC3] transition-colors hover:border-[#34D399] hover:text-[#34D399]"
                    >
                        <Icon name="refresh-cw" className="h-3.5 w-3.5" />
                        Refresh
                    </button>
                }
            />

            <ErrorText>{error}</ErrorText>

            {/* Overview statistics */}
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="TOTAL USERS"
                    value={summary?.stats?.total_users}
                    icon="users"
                    color="#C4A7FF"
                    note="Owner and team accounts"
                />

                <StatCard
                    label="ACTIVE USERS"
                    value={summary?.stats?.active_users}
                    icon="user-check"
                    color="#34D399"
                    note={`Successful activity in the last ${summary?.active_period_days || 30} days`}
                />

                <StatCard
                    label="RECORDED ACTIONS"
                    value={summary?.stats?.total_actions}
                    icon="activity"
                    color="#75C9D8"
                    note="Excludes login and logout events"
                />

                <StatCard
                    label="FAILED LOGINS"
                    value={summary?.stats?.failed_logins}
                    icon="shield-alert"
                    color="#E98286"
                    note="Recorded failed attempts"
                />
            </section>

            {/* Login summary */}
            <section className="rounded-xl border border-[#2A2F2B] bg-[#121513]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2F2B] p-4 sm:px-5">
                    <div>
                        <h2 className="text-sm font-semibold text-[#F1F1EE]">
                            Recent login activity
                        </h2>
                        <p className="mt-1 text-[11px] text-[#858D85]">
                            Successful and failed authentication attempts.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => changeView('logins')}
                        className="text-xs font-medium text-[#34D399] hover:text-[#6EE7B7]"
                    >
                        View login history →
                    </button>
                </div>

                {summary?.recent_logins?.length ? (
                    <div className="divide-y divide-[#242A25]">
                        {summary.recent_logins.slice(0, 5).map((log) => (
                            <div
                                key={log.id || log._id}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        className={[
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                                            log.action === 'LOGIN_FAILED'
                                                ? 'border-[#633238] bg-[#2B1D1D] text-[#E98286]'
                                                : 'border-[#285B46] bg-[#14251D] text-[#34D399]',
                                        ].join(' ')}
                                    >
                                        <Icon
                                            name={log.action === 'LOGIN_FAILED' ? 'shield-alert' : 'log-in'}
                                            className="h-4 w-4"
                                        />
                                    </span>

                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-[#F1F1EE]">
                                            {log.user_name || 'Unknown user'}
                                        </p>
                                        <p className="mt-1 text-[10px] text-[#858D85]">
                                            {log.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-3">
                                    <ActionBadge action={log.action} />
                                    <span className="font-mono text-[9px] text-[#737B74]">
                                        {formatDate(log.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No login records have been recorded yet." />
                )}
            </section>

            {/* Activity tabs */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-[#F1F1EE]">
                            Activity records
                        </h2>
                        <p className="mt-1 text-xs text-[#929891]">
                            Review actions performed by the owner and team members.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => changeView('activity')}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${activeTabClass('activity')}`}
                        >
                            All activity
                        </button>

                        <button
                            type="button"
                            onClick={() => changeView('logins')}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${activeTabClass('logins')}`}
                        >
                            Login history
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid gap-3 rounded-xl border border-[#2A2F2B] bg-[#121513] p-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                        <label className="mb-2 block font-mono text-[9px] tracking-wider text-[#858D85]">
                            TEAM MEMBER
                        </label>

                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="w-full rounded-lg border border-[#394039] bg-[#0C0E0D] px-3 py-2.5 text-xs text-[#F1F1EE] outline-none focus:border-[#34D399]"
                        >
                            <option value="">Everyone</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {view === 'activity' && (
                        <>
                            <div>
                                <label className="mb-2 block font-mono text-[9px] tracking-wider text-[#858D85]">
                                    MODULE
                                </label>

                                <select
                                    value={moduleFilter}
                                    onChange={(e) => setModuleFilter(e.target.value)}
                                    className="w-full rounded-lg border border-[#394039] bg-[#0C0E0D] px-3 py-2.5 text-xs text-[#F1F1EE] outline-none focus:border-[#34D399]"
                                >
                                    <option value="">All modules</option>
                                    {MODULES.filter((item) => item !== 'AUTH').map((item) => (
                                        <option key={item} value={item}>
                                            {moduleNames[item]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block font-mono text-[9px] tracking-wider text-[#858D85]">
                                    ACTION
                                </label>

                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="w-full rounded-lg border border-[#394039] bg-[#0C0E0D] px-3 py-2.5 text-xs text-[#F1F1EE] outline-none focus:border-[#34D399]"
                                >
                                    <option value="">All actions</option>
                                    {ACTIONS.filter((item) => !['LOGIN', 'LOGIN_FAILED', 'LOGOUT'].includes(item)).map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block font-mono text-[9px] tracking-wider text-[#858D85]">
                                    FROM DATE
                                </label>

                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="w-full rounded-lg border border-[#394039] bg-[#0C0E0D] px-3 py-2.5 text-xs text-[#F1F1EE] outline-none focus:border-[#34D399]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-mono text-[9px] tracking-wider text-[#858D85]">
                                    TO DATE
                                </label>

                                <input
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="w-full rounded-lg border border-[#394039] bg-[#0C0E0D] px-3 py-2.5 text-xs text-[#F1F1EE] outline-none focus:border-[#34D399]"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-end sm:col-span-2 xl:col-span-5">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs text-[#929891] transition-colors hover:text-[#34D399]"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>

                {/* Individual user detail */}
                {selectedUser && (
                    <section className="rounded-xl border border-[#285B46] bg-[#121513]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2F2B] p-4 sm:px-5">
                            <div>
                                <p className="font-mono text-[9px] tracking-wider text-[#34D399]">
                                    USER ACTIVITY DETAIL
                                </p>

                                <h3 className="mt-1 text-sm font-semibold text-[#F1F1EE]">
                                    {userDetail?.user?.name || 'Loading user...'}
                                </h3>

                                {userDetail?.user?.email && (
                                    <p className="mt-1 text-xs text-[#858D85]">
                                        {userDetail.user.email}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setUserDetail(null);
                                    setUserLogs([]);
                                }}
                                className="rounded-lg border border-[#394039] px-3 py-2 text-xs text-[#A0A69F] hover:text-[#F1F1EE]"
                            >
                                Close detail
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="space-y-3 p-4">
                                <Skeleton className="h-16" />
                                <Skeleton className="h-16" />
                            </div>
                        ) : userDetail ? (
                            <>
                                <div className="grid grid-cols-3 gap-3 p-4">
                                    <div>
                                        <p className="font-mono text-[9px] text-[#858D85]">
                                            TOTAL EVENTS
                                        </p>
                                        <p className="mt-1 font-mono text-lg text-[#F1F1EE]">
                                            {userDetail.stats.total_events}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="font-mono text-[9px] text-[#858D85]">
                                            SUCCESSFUL LOGINS
                                        </p>
                                        <p className="mt-1 font-mono text-lg text-[#34D399]">
                                            {userDetail.stats.successful_logins}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="font-mono text-[9px] text-[#858D85]">
                                            FAILED LOGINS
                                        </p>
                                        <p className="mt-1 font-mono text-lg text-[#E98286]">
                                            {userDetail.stats.failed_logins}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-[#2A2F2B] p-4">
                                    <p className="mb-3 text-xs font-semibold text-[#F1F1EE]">
                                        Recent events
                                    </p>

                                    {userLogs.length ? (
                                        <div className="space-y-3">
                                            {userLogs.slice(0, 10).map((log) => (
                                                <div
                                                    key={log.id || log._id}
                                                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242A25] pb-3 last:border-0"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-[#C5CBC3]">
                                                            {log.description}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-[#737B74]">
                                                            {moduleNames[log.module] || log.module}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <ActionBadge action={log.action} />
                                                        <span className="font-mono text-[9px] text-[#737B74]">
                                                            {formatDate(log.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#858D85]">
                                            No activity recorded for this user.
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </section>
                )}

                {/* Main activity table */}
                <div className="overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#121513]">
                    <div className="flex items-center justify-between gap-3 border-b border-[#2A2F2B] px-4 py-3 sm:px-5">
                        <p className="text-xs font-semibold text-[#F1F1EE]">
                            {view === 'logins' ? 'Login and logout records' : 'All recorded actions'}
                        </p>

                        <span className="font-mono text-[9px] tracking-wider text-[#858D85]">
                            {pagination.total || 0} RECORDS
                        </span>
                    </div>

                    {loading ? (
                        <div className="space-y-3 p-4">
                            {[0, 1, 2, 3].map((item) => (
                                <Skeleton key={item} className="h-14" />
                            ))}
                        </div>
                    ) : (
                        <ActivityTable
                            logs={logs}
                            onSelectUser={openUserDetail}
                        />
                    )}

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2F2B] px-4 py-3 sm:px-5">
                        <p className="font-mono text-[9px] text-[#858D85]">
                            PAGE {pagination.page} OF {Math.max(1, pagination.pages)}
                        </p>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={loading || pagination.page <= 1}
                                onClick={() => loadActivity(pagination.page - 1)}
                                className="rounded-lg border border-[#394039] px-3 py-2 text-xs text-[#C5CBC3] transition-colors hover:border-[#34D399] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            <button
                                type="button"
                                disabled={
                                    loading ||
                                    pagination.page >= pagination.pages ||
                                    pagination.pages === 0
                                }
                                onClick={() => loadActivity(pagination.page + 1)}
                                className="rounded-lg border border-[#394039] px-3 py-2 text-xs text-[#C5CBC3] transition-colors hover:border-[#34D399] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <p className="text-[10px] leading-relaxed text-[#69736B]">
                Activity records are read-only. Active users are users with at least
                one recorded non-failed-login event in the last 30 days. Failed
                attempts using an unknown email address are not currently attributable
                to an account.
            </p>
        </div>
    );
}
