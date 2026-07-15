import { useEffect, useMemo, useState } from 'react';
import {
  FiChevronDown as ChevronDown,
  FiChevronRight as ChevronRight,
  FiDownload as Download,
  FiFileText as FileText,
  FiRefreshCw as RefreshCw,
  FiSearch as Search,
  FiUsers as Users,
} from 'react-icons/fi';
import api from '../services/api.js';

function PoDashboard() {
  const [rows, setRows] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedYears, setExpandedYears] = useState({});

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/client-purchase-orders/dashboard-status');
      setRows(response.data.users || []);
      const nextFinancialYears = response.data.financialYears || [];
      setFinancialYears(nextFinancialYears);
      setSelectedFinancialYear((current) => (
        current && nextFinancialYears.includes(current) ? current : (nextFinancialYears[0] || '')
      ));
      setError('');
    } catch (err) {
      setRows([]);
      setError(err.response?.data?.message || 'Unable to load PO dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => (
      row.name?.toLowerCase().includes(query)
      || row.role?.toLowerCase().includes(query)
      || row.financialYears?.some((year) => (
        year.financialYear?.toLowerCase().includes(query)
        || year.clients?.some((client) => (
          client.clientName?.toLowerCase().includes(query)
          || client.clientCode?.toLowerCase().includes(query)
          || client.poNumber?.toLowerCase().includes(query)
        ))
      ))
    ));
  }, [rows, search]);

  const selectedYearTotals = useMemo(() => rows.reduce((summary, row) => {
    const year = row.financialYears?.find((item) => item.financialYear === selectedFinancialYear);
    summary.totalClients += Number(year?.totalClients || 0);
    summary.poReceived += Number(year?.poReceived || 0);
    summary.poPending += Number(year?.poPending || 0);
    return summary;
  }, { totalClients: 0, poReceived: 0, poPending: 0 }), [rows, selectedFinancialYear]);

  const toggleUser = (userId) => {
    setExpandedUsers((current) => ({ ...current, [userId]: !current[userId] }));
  };

  const toggleYear = (userId, financialYear) => {
    const key = `${userId}-${financialYear}`;
    setExpandedYears((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6d35f5]">PO Dashboard</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">User Wise PO Status</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Expand a user to see financial-year PO counts and client details.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
              Financial Year
              <select
                value={selectedFinancialYear}
                onChange={(event) => setSelectedFinancialYear(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold normal-case tracking-normal text-slate-800 outline-none focus:border-[#6d35f5] focus:ring-4 focus:ring-[#6d35f5]/10"
              >
                {financialYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PoStatCard label={`Total Clients · ${selectedFinancialYear}`} value={selectedYearTotals.totalClients} tone="blue" />
          <PoStatCard label={`PO Received · ${selectedFinancialYear}`} value={selectedYearTotals.poReceived} tone="green" />
          <PoStatCard label={`PO Pending · ${selectedFinancialYear}`} value={selectedYearTotals.poPending} tone="red" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">PO Status By User</h2>
            <p className="text-xs font-semibold text-slate-500">Click a user row, then expand a financial year to see clients.</p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user, FY, client, PO..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#6d35f5] focus:ring-4 focus:ring-[#6d35f5]/10"
            />
          </label>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm font-bold">Loading PO dashboard...</p>
          </div>
        ) : filteredRows.length ? (
          <div className="divide-y divide-slate-100">
            {filteredRows.map((row) => {
              const expanded = Boolean(expandedUsers[row.userId]);
              const selectedYear = row.financialYears?.find((year) => year.financialYear === selectedFinancialYear);
              return (
                <article key={row.userId} className="bg-white">
                  <button
                    type="button"
                    onClick={() => toggleUser(row.userId)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                        <Users className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">{row.name}</h3>
                        <p className="text-xs font-semibold text-slate-500">{row.role}</p>
                      </div>
                    </div>
                    <PoMetric label={`Total Clients · ${selectedFinancialYear}`} value={selectedYear?.totalClients || 0} />
                    <PoMetric label={`PO Received · ${selectedFinancialYear}`} value={selectedYear?.poReceived || 0} tone="green" />
                    <PoMetric label={`PO Pending · ${selectedFinancialYear}`} value={selectedYear?.poPending || 0} tone="red" />
                    <span className="inline-flex items-center gap-2 justify-self-start rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 lg:justify-self-end">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {expanded ? 'Collapse' : 'Expand'}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                              <th className="border border-slate-200 px-3 py-3 text-left">Financial Year</th>
                              <th className="border border-slate-200 px-3 py-3 text-center">Total Clients</th>
                              <th className="border border-slate-200 px-3 py-3 text-center">PO Received</th>
                              <th className="border border-slate-200 px-3 py-3 text-center">PO Pending</th>
                              <th className="border border-slate-200 px-3 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.financialYears.map((year) => {
                              const yearExpanded = Boolean(expandedYears[`${row.userId}-${year.financialYear}`]);
                              return (
                                <PoFinancialYearRows
                                  key={year.financialYear}
                                  userId={row.userId}
                                  year={year}
                                  expanded={yearExpanded}
                                  onToggle={() => toggleYear(row.userId, year.financialYear)}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <FileText className="h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-950">No PO status found</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Try clearing search or uploading PO records.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PoFinancialYearRows({ year, expanded, onToggle }) {
  return (
    <>
      <tr className="bg-white">
        <td className="border border-slate-200 px-3 py-3 font-black text-slate-950">{year.financialYear}</td>
        <td className="border border-slate-200 px-3 py-3 text-center font-bold text-slate-800">{year.totalClients}</td>
        <td className="border border-slate-200 px-3 py-3 text-center font-bold text-emerald-700">{year.poReceived}</td>
        <td className="border border-slate-200 px-3 py-3 text-center font-bold text-red-700">{year.poPending}</td>
        <td className="border border-slate-200 px-3 py-3 text-center">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            View Clients
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50">
          <td colSpan="5" className="border border-slate-200 p-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                    <th className="border border-slate-200 px-3 py-2 text-left">Client Name</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">Client Code</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">PO Status</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">PO Number</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Uploaded File</th>
                  </tr>
                </thead>
                <tbody>
                  {year.clients.map((client) => (
                    <tr key={`${client.ccpClientId}-${client.financialYear}`} className="bg-white">
                      <td className="border border-slate-200 px-3 py-2 font-bold text-slate-900">{client.clientName}</td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">{client.clientCode || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          client.poStatus === 'Received'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                            : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                        }`}>
                          {client.poStatus}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-700">{client.poNumber || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center">
                        {client.poFileUrl ? (
                          <a
                            href={client.poFileUrl}
                            download={client.poFileName || 'purchase-order'}
                            className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PoStatCard({ label, value, tone }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ${toneClasses[tone] || toneClasses.blue}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value || 0}</p>
    </div>
  );
}

function PoMetric({ label, value, tone = 'slate' }) {
  const toneClass = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-slate-900';
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${toneClass}`}>{value || 0}</p>
    </div>
  );
}

export default PoDashboard;
