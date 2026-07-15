import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiRefreshCw as RefreshCw, FiSearch as Search } from 'react-icons/fi';
import api from '../services/api.js';

const STATUS_ORDER = ['Amount Pending', 'Payment Pending', 'Partially Received', 'Complete Received', 'Overpaid'];

function AccountDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/client-purchase-orders/accounts', { params: { t: Date.now() } });
      setRows(response.data?.accounts || []);
      setError('');
    } catch (requestError) {
      setRows([]);
      setError(requestError.response?.data?.message || 'Unable to load Account Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const financialYears = useMemo(() => [...new Set(rows.map((row) => row.financialYear).filter(Boolean))].sort().reverse(), [rows]);
  const users = useMemo(() => [...new Set(rows.map((row) => row.assignedUser).filter(Boolean))].sort(), [rows]);

  const baseRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => (
      (!financialYear || row.financialYear === financialYear)
      && (!assignedUser || row.assignedUser === assignedUser)
      && (!term || [row.clientName, row.clientCode, row.poNumber, row.assignedUser]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
    ));
  }, [assignedUser, financialYear, rows, search]);

  const visibleRows = useMemo(() => baseRows.filter((row) => !activeStatus || row.paymentStatus === activeStatus), [activeStatus, baseRows]);

  const totals = useMemo(() => baseRows.reduce((total, row) => ({
    po: total.po + Number(row.poAmount || 0),
    bank: total.bank + Number(row.amountReceived || 0),
    tds: total.tds + Number(row.tdsAmount || 0),
    settled: total.settled + Number(row.settledAmount || 0),
    outstanding: total.outstanding + Number(row.outstandingAmount || 0),
  }), { po: 0, bank: 0, tds: 0, settled: 0, outstanding: 0 }), [baseRows]);

  const statusCounts = useMemo(() => STATUS_ORDER.map((status) => ({
    status,
    count: baseRows.filter((row) => row.paymentStatus === status).length,
    amount: baseRows.filter((row) => row.paymentStatus === status).reduce((sum, row) => sum + Number(row.poAmount || 0), 0),
  })), [baseRows]);

  const monthlyData = useMemo(() => {
    const months = new Map();
    baseRows.forEach((row) => (row.payments || []).forEach((payment) => {
      const date = new Date(payment.paymentDate);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = months.get(key) || { key, month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), bankReceived: 0, tds: 0 };
      current.bankReceived += Number(payment.amount || 0);
      current.tds += Number(payment.tdsAmount || 0);
      months.set(key, current);
    }));
    return [...months.values()].sort((first, second) => first.key.localeCompare(second.key)).slice(-12);
  }, [baseRows]);

  const outstandingRows = useMemo(() => visibleRows
    .filter((row) => Number(row.outstandingAmount || 0) > 0)
    .sort((first, second) => Number(second.outstandingAmount) - Number(first.outstandingAmount))
    .slice(0, 10), [visibleRows]);

  const recentPayments = useMemo(() => visibleRows.flatMap((row) => (row.payments || []).map((payment) => ({
    ...payment,
    clientName: row.clientName,
    poNumber: row.poNumber,
  }))).sort((first, second) => new Date(second.paymentDate) - new Date(first.paymentDate)).slice(0, 8), [visibleRows]);

  const collectionPercentage = totals.po > 0 ? Math.min(100, (totals.settled / totals.po) * 100) : 0;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Account Dashboard</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Collections and Outstanding</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Monitor PO value, receipts, TDS and accounts requiring follow-up.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_200px_240px_auto]">
            <select value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} className="admin-input">
              <option value="">All financial years</option>
              {financialYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={assignedUser} onChange={(event) => setAssignedUser(event.target.value)} className="admin-input">
              <option value="">All assigned users</option>
              {users.map((user) => <option key={user} value={user}>{user}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Client or PO number" className="admin-input pl-9" />
            </div>
            <button type="button" onClick={loadDashboard} className="admin-secondary-button justify-center" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total PO Value" value={currency(totals.po)} />
        <Metric label="Bank Received" value={currency(totals.bank)} tone="green" />
        <Metric label="Total TDS" value={currency(totals.tds)} tone="blue" />
        <Metric label="Total Settled" value={currency(totals.settled)} tone="green" />
        <Metric label="Outstanding" value={currency(totals.outstanding)} tone="orange" />
        <Metric label="Collection" value={`${collectionPercentage.toFixed(1)}%`} tone="purple" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statusCounts.map((item) => (
          <button key={item.status} type="button" onClick={() => setActiveStatus((current) => current === item.status ? '' : item.status)} className={`rounded-2xl border p-4 text-left shadow-sm transition ${activeStatus === item.status ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{item.status}</p>
            <div className="mt-2 flex items-end justify-between gap-2"><span className="text-2xl font-black text-slate-950">{item.count}</span><span className="text-xs font-bold text-slate-500">{currency(item.amount)}</span></div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardPanel title="Monthly Collections" subtitle="Bank receipts and TDS recorded by month">
          <div className="h-72">
            {monthlyData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={compactCurrency} /><Tooltip formatter={(value) => currency(value)} /><Legend /><Bar dataKey="bankReceived" name="Bank Received" fill="#059669" radius={[6, 6, 0, 0]} /><Bar dataKey="tds" name="TDS" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty text="No payment history for the selected filters." />}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Collection Progress" subtitle="Settled value against total PO value">
          <div className="flex h-72 flex-col justify-center">
            <div className="flex items-end justify-between"><span className="text-4xl font-black text-slate-950">{collectionPercentage.toFixed(1)}%</span><span className="text-sm font-bold text-slate-500">{currency(totals.settled)} settled</span></div>
            <div className="mt-5 h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all" style={{ width: `${collectionPercentage}%` }} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Settled" value={currency(totals.settled)} tone="green" compact /><Metric label="Remaining" value={currency(totals.outstanding)} tone="orange" compact /></div>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Highest Outstanding Clients" subtitle={activeStatus ? `Filtered by ${activeStatus}` : 'Clients requiring collection follow-up'}>
        <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500"><tr><th className="p-3">Client</th><th className="p-3">PO Number</th><th className="p-3">Financial Year</th><th className="p-3 text-right">PO Value</th><th className="p-3 text-right">Settled</th><th className="p-3 text-right">Outstanding</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{outstandingRows.map((row) => <tr key={`${row.ccpClientId}-${row.yearRecordId}`}><td className="p-3 font-extrabold text-slate-950">{row.clientName}<p className="mt-1 text-xs font-semibold text-slate-500">{row.assignedUser || row.clientCode}</p></td><td className="p-3 font-bold text-slate-700">{row.poNumber}</td><td className="p-3 font-bold text-slate-700">{row.financialYear}</td><td className="p-3 text-right font-bold">{currency(row.poAmount)}</td><td className="p-3 text-right font-bold text-emerald-700">{currency(row.settledAmount)}</td><td className="p-3 text-right font-black text-amber-700">{currency(row.outstandingAmount)}</td><td className="p-3"><StatusBadge value={row.paymentStatus} /></td></tr>)}{!outstandingRows.length ? <tr><td colSpan="7"><Empty text="No outstanding accounts found." /></td></tr> : null}</tbody></table></div>
      </DashboardPanel>

      <DashboardPanel title="Recent Payments" subtitle="Latest bank receipts and TDS entries">
        <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500"><tr><th className="p-3">Client</th><th className="p-3">PO Number</th><th className="p-3">Payment Date</th><th className="p-3 text-right">Bank Received</th><th className="p-3 text-right">TDS</th><th className="p-3">Reference / UTR</th></tr></thead><tbody className="divide-y divide-slate-100">{recentPayments.map((payment, index) => <tr key={payment._id || index}><td className="p-3 font-extrabold text-slate-950">{payment.clientName}</td><td className="p-3 font-bold text-slate-700">{payment.poNumber}</td><td className="p-3 font-semibold text-slate-600">{formatDate(payment.paymentDate)}</td><td className="p-3 text-right font-black text-emerald-700">{currency(payment.amount)}</td><td className="p-3 text-right font-bold text-sky-700">{currency(payment.tdsAmount)}</td><td className="p-3 font-semibold text-slate-600">{payment.reference || '-'}</td></tr>)}{!recentPayments.length ? <tr><td colSpan="6"><Empty text="No payments have been recorded." /></td></tr> : null}</tbody></table></div>
      </DashboardPanel>
    </section>
  );
}

function Metric({ label, value, tone = 'slate', compact = false }) { const tones = { slate: 'text-slate-950', green: 'text-emerald-700', blue: 'text-sky-700', orange: 'text-amber-700', purple: 'text-violet-700' }; return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}><p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</p><p className={`${compact ? 'mt-1 text-xl' : 'mt-2 text-2xl'} font-black ${tones[tone]}`}>{value}</p></div>; }
function DashboardPanel({ title, subtitle, children }) { return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p></div>{children}</div>; }
function Empty({ text }) { return <div className="flex min-h-32 items-center justify-center p-6 text-center text-sm font-bold text-slate-500">{text}</div>; }
function StatusBadge({ value }) { const green = value === 'Complete Received'; return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${green ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>{value}</span>; }
function currency(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function compactCurrency(value) { const number = Number(value || 0); return number >= 10000000 ? `₹${(number / 10000000).toFixed(1)}Cr` : number >= 100000 ? `₹${(number / 100000).toFixed(1)}L` : `₹${Math.round(number / 1000)}K`; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default AccountDashboard;
