import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle as AlertCircle,
  FiBell as Bell,
  FiCheckCircle as CheckCircle,
  FiClock as Clock,
} from 'react-icons/fi';
import api from '../services/api.js';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(Number(response.data.unreadCount || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await api.put('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const markOneRead = async (id) => {
    if (!id) return;
    const target = notifications.find((item) => item._id === id);
    setNotifications((current) => current.map((item) => (item._id === id ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() } : item)));
    if (!target?.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    try {
      await api.put(`/notifications/${encodeURIComponent(id)}/read`);
    } catch {
      loadNotifications();
    }
  };

  return (
    <div className="space-y-5">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Inbox</p>
            <h1 className="page-title">Notifications</h1>
            <p className="page-description">Workflow alerts for user, manager, and compliance handoffs.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-4 lg:max-w-3xl">
            <StatCard icon={<Bell className="h-4 w-4" />} label="Total" value={String(notifications.length)} />
            <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Unread" value={String(unreadCount)} />
            <StatCard icon={<CheckCircle className="h-4 w-4" />} label="Read" value={String(Math.max(0, notifications.length - unreadCount))} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Queue" value={loading ? 'Loading' : 'Live'} />
          </div>
        </div>
      </section>

      <section className="app-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Workflow Inbox</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Every handoff and return action lands here.</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAllRead || !unreadCount}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {markingAllRead ? 'Marking...' : 'Mark All Read'}
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">Loading notifications...</div>
        ) : notifications.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((item) => (
              <Link
                key={item._id}
                to={item.link || `/clients/${encodeURIComponent(item.ccpClientId)}`}
                onClick={() => markOneRead(item._id)}
                className={`block p-5 transition hover:bg-brand-50/60 dark:hover:bg-brand-950/20 ${item.isRead ? 'bg-white dark:bg-transparent' : 'bg-emerald-50/40 dark:bg-emerald-950/10'}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-extrabold text-slate-950 dark:text-white">{item.title}</h2>
                      <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${item.isRead ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'}`}>
                        {item.isRead ? 'Read' : 'Unread'}
                      </span>
                      {item.workflowStage ? (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                          {item.workflowStage}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{item.message}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.sectionLabel ? <MetaPill label={item.sectionLabel} /> : null}
                      {item.financialYear ? <MetaPill label={item.financialYear} /> : null}
                      {item.metadata?.clientName ? <MetaPill label={item.metadata.clientName} /> : null}
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400 lg:text-right">
                    <span>{formatDateTime(item.createdAt)}</span>
                    {item.metadata?.reviewMessage ? (
                      <span className="max-w-xs truncate text-red-600 dark:text-red-300">Remarks: {item.metadata.reviewMessage}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">No workflow notifications found.</div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MetaPill({ label }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
      {label}
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default Notifications;
