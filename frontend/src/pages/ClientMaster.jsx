import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertOctagon as ServerCrash,
  FiBriefcase as Building2,
  FiMoreHorizontal as MoreHorizontal,
  FiRefreshCw as RefreshCw,
  FiSearch as Search,
  FiX as X,
} from 'react-icons/fi';
import api from '../services/api.js';
import { AuthContext } from '../context/AuthContext.jsx';

const FINANCIAL_YEAR_OPTIONS = [
  '2022-23',
  '2023-24',
  '2024-25',
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30',
];

const PO_SERVICE_OPTIONS = [
  'CASE REPRESENTATION',
  'CAT-1-EOL CREDIT',
  'CAT-1-RECYCLING CREDIT',
  'CAT-2-EOL CREDIT',
  'CAT-2-RECYCLING CREDIT',
  'CAT-3-EOL CREDIT',
  'CAT-3-RECYCLING CREDIT',
  'CATEGORY 1',
  'CATEGORY 2',
  'CATEGORY 3',
  'CGWA NOC FRESH APPLICATION',
  'CONSULTANCY FEE',
  'CPCB NOTICE REPLY FEES',
  'CTE & CTO NEW REGISTRATION',
  'CTE – CONSENT TO ESTABLISH',
  'CTO – CONSENT TO OPERATE',
  'CTO – RENEWAL',
  'E-WASTE CREDIT',
  'ENVIRONMENT STATEMENT FORM V SUBMISSION',
  'EPR CREDIT RE',
  'EPR CREDIT REVENUE SHARING',
  'EPR ETP PORTAL HANDLING CHARGES',
  'EPR LOGIN SURRENDER',
  'GOVT. REPRESENTATION CHARGES',
  'KAVACH AUDIT',
  'MATERIAL WASTE DISPOSAL CONSULTANCY',
  'PLANT AUDIT',
  'PORTAL HEALTH REPORT CONSULTANCY',
  'SAP INTEGRATION SUPPORT',
  'UREP ASSESSMENT AND CONSULTING',
];

function ClientMaster() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userRole = String(user?.roleId?.roleName || user?.roleName || user?.designation || user?.role || '')
    .trim()
    .toLowerCase();
  const isManager = userRole === 'manager';
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientError, setClientError] = useState('');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPiboCategory, setSelectedPiboCategory] = useState('');
  const [appliedUser, setAppliedUser] = useState('');
  const [appliedPiboCategory, setAppliedPiboCategory] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [activeClientScope, setActiveClientScope] = useState('manager');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPage, setGoToPage] = useState('');
  const [poModalClient, setPoModalClient] = useState(null);

  useEffect(() => {
    loadClients();
  }, [activeOnly]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await api.get('/ccp-clients', { params: { activeOnly, t: Date.now() } });
      setClients(response.data.clients || []);
      setClientError('');
    } catch (err) {
      setClientError(err.response?.data?.message || 'Unable to fetch clients from CCP.');
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const scopeCounts = useMemo(() => ({
    manager: clients.filter((client) => client.clientScope === 'manager').length,
    team: clients.filter((client) => client.clientScope !== 'manager').length,
  }), [clients]);

  const scopedClients = useMemo(() => (
    isManager
      ? clients.filter((client) => (
          activeClientScope === 'manager'
            ? client.clientScope === 'manager'
            : client.clientScope !== 'manager'
        ))
      : clients
  ), [activeClientScope, clients, isManager]);

  const userOptions = useMemo(() => (
    [...new Set(scopedClients.map((client) => getClientUserName(client)).filter((value) => value !== '-'))]
      .sort((a, b) => String(a).localeCompare(String(b)))
  ), [scopedClients]);

  const piboCategoryOptions = useMemo(() => (
    [...new Set(scopedClients.map((client) => getPiboCategory(client)).filter((value) => value !== '-'))]
      .sort((a, b) => String(a).localeCompare(String(b)))
  ), [scopedClients]);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    return scopedClients.filter((client) => (
      (!appliedUser || getClientUserName(client) === appliedUser)
      && (!appliedPiboCategory || getPiboCategory(client) === appliedPiboCategory)
      && (!term || [
        getClientName(client),
        getClientUserName(client),
        client?.selectedLead?.company,
        client?.selectedLead?.emails?.join(' '),
        client?.selectedLead?.mobileNo1,
        client?.adminControls?.assignedTo?.name,
        client?.piboCategory,
        client?.data?.basic?.clientCode,
        client?.data?.basic?.clientEmail,
        client?.data?.basic?.piboCategory,
        client?.data?.basic?.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)))
    ));
  }, [appliedPiboCategory, appliedUser, query, scopedClients]);

  const applyFilters = (event) => {
    event.preventDefault();
    setQuery(searchInput);
    setAppliedUser(selectedUser);
    setAppliedPiboCategory(selectedPiboCategory);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setQuery('');
    setSelectedUser('');
    setSelectedPiboCategory('');
    setAppliedUser('');
    setAppliedPiboCategory('');
    setCurrentPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [currentPage, filteredClients, pageSize]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const submitGoToPage = (event) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(goToPage, 10);
    if (!Number.isFinite(requestedPage)) return;
    setCurrentPage(Math.min(pageCount, Math.max(1, requestedPage)));
    setGoToPage('');
  };

  const totals = useMemo(() => ({
    total: scopedClients.length,
    showing: filteredClients.length,
  }), [filteredClients.length, scopedClients.length]);
  const hasActiveFilters = Boolean(query || appliedUser || appliedPiboCategory);

  return (
    <div className="min-h-full bg-[#f6f9f8] px-3 pb-7 pt-4 sm:px-5">
      <div className="w-full space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Client Master</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Manage and monitor your client portfolio</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm">
                <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Active only
              </label>
              <button type="button" onClick={loadClients} disabled={loadingClients} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loadingClients ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {isManager ? (
            <div className="mt-4 inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
              {[
                ['manager', 'Manager Clients', scopeCounts.manager],
                ['team', 'Team Member Clients', scopeCounts.team],
              ].map(([scope, label, count]) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setActiveClientScope(scope);
                    clearFilters();
                  }}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-black transition ${activeClientScope === scope ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {label}<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-200 p-3 sm:p-4">
            <form onSubmit={applyFilters} className="grid gap-2 lg:grid-cols-[minmax(240px,1.4fr)_220px_220px_auto_auto]">
                    <div className="relative lg:order-first">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search clients..."
                        className="admin-input bg-white pl-9 pr-10"
                      />
                      {searchInput ? (
                        <button type="button" onClick={() => { setSearchInput(''); setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear search">
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <select
                      value={selectedUser}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedUser(value);
                        setAppliedUser(value);
                        setCurrentPage(1);
                      }}
                      className="admin-input bg-white"
                      aria-label="Filter by user"
                    >
                      <option value="">All Owners</option>
                      {userOptions.map((user) => <option key={user} value={user}>{user}</option>)}
                    </select>
                    <select
                      value={selectedPiboCategory}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedPiboCategory(value);
                        setAppliedPiboCategory(value);
                        setCurrentPage(1);
                      }}
                      className="admin-input bg-white"
                      aria-label="Filter by PIBO category"
                    >
                      <option value="">All PIBO categories</option>
                      {piboCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <button type="submit" className="admin-primary-button min-h-11 justify-center rounded-xl px-5">
                      <Search className="h-4 w-4" />
                      Filters
                    </button>
                    <button type="button" onClick={clearFilters} disabled={!hasActiveFilters && !searchInput && !selectedUser && !selectedPiboCategory} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                      <RefreshCw className="h-4 w-4" /> Reset
                    </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <div className="flex flex-wrap gap-2">
                {appliedUser ? <FilterChip label={`Owner: ${appliedUser}`} /> : null}
                {appliedPiboCategory ? <FilterChip label={`Category: ${appliedPiboCategory}`} /> : null}
                {query ? <FilterChip label={`Search: ${query}`} /> : null}
              </div>
              <span><strong className="text-slate-950">{totals.showing}</strong> results</span>
            </div>
          </div>

          {clientError && <ErrorState message={clientError} onRetry={loadClients} />}

          {loadingClients ? (
            <div className="p-3 sm:p-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-black uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-4 py-3.5">Code</th>
                    <th className="px-4 py-3.5">MSME Status</th>
                    <th className="px-4 py-3.5">PIBO Category</th>
                    <th className="px-4 py-3.5">Updated</th>
                    <th className="pl-3 pr-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                          <div className="min-w-0 flex-1">
                            <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
                            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-2">
                          <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-40 animate-pulse rounded-full bg-slate-100" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                      </td>
                      <td className="pl-3 pr-4 py-4 text-right">
                        <div className="ml-auto h-9 w-24 animate-pulse rounded-xl bg-slate-100" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-3 sm:p-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/40">
              <table className="min-w-[980px] w-full text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-black uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-4 py-3.5">Code</th>
                    <th className="px-4 py-3.5">MSME Status</th>
                    <th className="px-4 py-3.5">PIBO Category</th>
                    <th className="px-4 py-3.5">Updated</th>
                    <th className="pl-3 pr-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedClients.map((client, index) => {
                    const clientId = encodeURIComponent(client?.id);
                    return (
                      <tr
                        key={client?.id}
                        className={`group transition hover:bg-[#f8fbfa] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/35'}`}
                        onClick={() => navigate(`/clients/${clientId}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') navigate(`/clients/${clientId}`);
                        }}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 text-emerald-800 ring-1 ring-emerald-100 shadow-sm shadow-emerald-100/60">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-extrabold text-slate-950">{getClientName(client)}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                                  {client?.clientCode || 'No code'}
                                </span>
                                <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                                  {getClientUserName(client) !== '-' ? getClientUserName(client) : `CCP ID: ${client?.sourceId || '-'}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle font-bold text-slate-700">{client?.clientCode || '-'}</td>
                        <td className="px-4 py-4">
                          <MsmeStatusBadge value={getMsmeStatus(client?.data || client)} />
                        </td>
                        <td className="max-w-xs px-4 py-4">
                          <CategoryBadge value={getPiboCategory(client)} />
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-600">{formatDateTime(client?.updatedAt || client?.createdAt)}</td>
                        <td className="pl-3 pr-4 py-4 text-right">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                            aria-label="Open client actions"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPoModalClient(client);
                            }}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
          {!loadingClients && filteredClients.length > 0 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              totalItems={filteredClients.length}
              goToPage={goToPage}
              onGoToPageChange={setGoToPage}
              onGoToPage={submitGoToPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
            />
          )}
        </section>
      </div>

      <POReceivedModal
        client={poModalClient}
        onClose={() => setPoModalClient(null)}
        onContinue={(client, poFinancialYears = []) => {
          if (!client?.id) return;
          navigate(`/clients/${encodeURIComponent(client.id)}`, {
            state: {
              openFinancialYearSelector: true,
              source: 'po-workflow',
              poFinancialYears,
            },
          });
        }}
      />
    </div>
  );
}

function Pagination({
  currentPage,
  pageCount,
  pageSize,
  totalItems,
  goToPage,
  onGoToPageChange,
  onGoToPage,
  onPageChange,
  onPageSizeChange,
}) {
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pageNumbers = getVisiblePageNumbers(currentPage, pageCount);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
        <span className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          Showing <strong className="text-slate-950">{firstItem}-{lastItem}</strong> of <strong className="text-slate-950">{totalItems}</strong>
        </span>
        <label className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-800 outline-none focus:border-sky-500"
          >
            {[5, 10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="admin-secondary-button min-h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {pageNumbers.map((page, index) => page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-extrabold transition ${
              currentPage === page
                ? 'bg-[#30525C] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          className="admin-secondary-button min-h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
        <form onSubmit={onGoToPage} className="ml-0 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 sm:ml-2">
          <label htmlFor="go-to-client-page" className="text-sm font-bold text-slate-600">Go to page</label>
          <input
            id="go-to-client-page"
            type="number"
            min="1"
            max={pageCount}
            value={goToPage}
            onChange={(event) => onGoToPageChange(event.target.value)}
            placeholder={String(currentPage)}
            className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-bold outline-none focus:border-sky-500"
          />
          <button type="submit" className="admin-primary-button min-h-9 px-3">Go</button>
        </form>
      </div>
    </div>
  );
}

function FilterChip({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
      {label}
    </span>
  );
}

function getVisiblePageNumbers(currentPage, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pageCount - 1, currentPage + 1);
  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < pageCount - 1) pages.push('ellipsis');
  pages.push(pageCount);
  return pages;
}

function POReceivedModal({ client, onClose, onContinue }) {
  const [poReceived, setPoReceived] = useState('yes');
  const [poYearCount, setPoYearCount] = useState('0');
  const [poRows, setPoRows] = useState(() => createPoRows(0));
  const [specialApprovalFiles, setSpecialApprovalFiles] = useState([]);
  const [specialApprovalEmail, setSpecialApprovalEmail] = useState('');
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    const loadRecord = async () => {
      setLoadingRecord(true);
      setFormError('');
      try {
        const response = await api.get(`/client-purchase-orders/${encodeURIComponent(client.id)}`);
        const record = response.data?.purchaseOrder;
        if (cancelled) return;

        if (record?.poReceived === false) {
          setPoReceived('no');
          setPoYearCount('0');
          setPoRows(createPoRows(0));
          setSpecialApprovalEmail(record?.specialApprovalEmail || '');
          setSpecialApprovalFiles(Array.isArray(record?.specialApprovalFiles) ? record.specialApprovalFiles : []);
          return;
        }

        const existingRows = Array.isArray(record?.poYearRecords) ? record.poYearRecords : [];
        setPoReceived('yes');
        setPoYearCount(String(existingRows.length || 0));
        setPoRows(existingRows.map((row) => ({
          fyYear: row?.fyYear || '',
          poNumber: row?.poNumber || '',
          poUpload: row?.poUpload || null,
          services: Array.isArray(row?.services) && row.services.length
            ? row.services
            : (row?.service ? [row.service] : []),
        })));
        setSpecialApprovalEmail('');
        setSpecialApprovalFiles([]);
      } catch (err) {
        if (cancelled) return;
        setPoReceived('yes');
        setPoYearCount('0');
        setPoRows(createPoRows(0));
        setSpecialApprovalFiles([]);
        setSpecialApprovalEmail('');
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!client) return null;

  const handleYearCountChange = (value) => {
    const numericValue = Math.max(0, Math.min(8, Number(value) || 0));
    setPoYearCount(String(numericValue));
    setPoRows((currentRows) => {
      const nextRows = Array.from({ length: numericValue }, (_, index) => currentRows[index] || createPoRow());
      return nextRows;
    });
  };

  const updatePoRow = (index, field, value) => {
    setPoRows((currentRows) => currentRows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const addNextYearRow = () => {
    setPoRows((currentRows) => {
      if (currentRows.length >= 8) return currentRows;
      const nextRows = [...currentRows, createPoRow()];
      setPoYearCount(String(nextRows.length));
      return nextRows;
    });
  };

  const removeLastYearRow = () => {
    setPoRows((currentRows) => {
      if (!currentRows.length) return currentRows;
      const nextRows = currentRows.slice(0, -1);
      setPoYearCount(String(nextRows.length));
      return nextRows;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (savingRecord) return;

    const poReceivedValue = poReceived === 'yes';
    if (poReceivedValue) {
      const count = Number(poYearCount) || 0;
      if (count <= 0) {
        setFormError('Please enter PO Received For No Of Year (minimum 1).');
        return;
      }

      for (let index = 0; index < poRows.length; index += 1) {
        const row = poRows[index];
        if (!row?.fyYear) {
          setFormError(`FY Year is required in row ${index + 1}.`);
          return;
        }
        if (!row?.poNumber) {
          setFormError(`PO Number is required in row ${index + 1}.`);
          return;
        }
        if (!row?.poUpload) {
          setFormError(`PO Upload is required in row ${index + 1}.`);
          return;
        }
        if (!Array.isArray(row?.services) || row.services.length === 0) {
          setFormError(`Please select at least one Service in row ${index + 1}.`);
          return;
        }
      }
    } else {
      if (!specialApprovalFiles.length) {
        setFormError('Please upload special approval proof files.');
        return;
      }
      if (!specialApprovalEmail.trim()) {
        setFormError('Please enter approval email / note.');
        return;
      }
    }

    setSavingRecord(true);
    try {
      const payload = await buildPurchaseOrderPayload({
        poReceived: poReceivedValue,
        poRows,
        specialApprovalFiles,
        specialApprovalEmail,
      });

      await api.put(`/client-purchase-orders/${encodeURIComponent(client.id)}`, payload);
      onContinue(client, poReceivedValue ? poRows.map((row) => row?.fyYear).filter(Boolean) : []);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save purchase order details.');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[1400px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#fcfbf8_0%,#f4eee6_58%,#ebe3d7_100%)] px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5d7a69]">PO Workflow</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Purchase Order Confirmation</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {getClientName(client)}{client?.clientCode ? ` · ${client.clientCode}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {formError}
              </div>
            ) : null}

            {loadingRecord ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm font-semibold text-slate-500">
                Loading PO details...
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">PO Received</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  ['yes', 'Yes'],
                  ['no', 'No'],
                ].map(([value, label]) => {
                  const active = poReceived === value;
                  return (
                    <label
                      key={value}
                      className={`inline-flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                        active
                          ? 'border-[#d7e7dd] bg-[#eef6f0] text-[#456856] ring-1 ring-[#dceadf]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="poReceived"
                        value={value}
                        checked={active}
                        onChange={(event) => setPoReceived(event.target.value)}
                        className="h-4 w-4 accent-[#456856]"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </section>

            {poReceived === 'yes' ? (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      PO Received For No Of Year
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={poYearCount}
                      onChange={(event) => handleYearCountChange(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#77a68b] focus:ring-4 focus:ring-[#eef6f0]"
                    />
                  </label>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-500">
                    Enter how many financial years have purchase orders. Matching rows will appear below automatically.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addNextYearRow}
                    disabled={poRows.length >= 8}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#456a57] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3d5d4d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    + Add Next Year
                  </button>
                  <button
                    type="button"
                    onClick={removeLastYearRow}
                    disabled={poRows.length === 0}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove Last Year
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[1280px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Sr. No</th>
                        <th className="px-4 py-3">FY Year</th>
                        <th className="px-4 py-3">PO Number</th>
                        <th className="px-4 py-3">PO Upload</th>
                        <th className="px-4 py-3">Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {poRows.map((row, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 font-extrabold text-slate-700">{index + 1}</td>
                          <td className="px-4 py-4">
                            <select
                              value={row.fyYear}
                              onChange={(event) => updatePoRow(index, 'fyYear', event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-900 outline-none transition focus:border-[#77a68b] focus:ring-4 focus:ring-[#eef6f0]"
                            >
                              <option value="">Select FY Year</option>
                              {FINANCIAL_YEAR_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={row.poNumber}
                              onChange={(event) => updatePoRow(index, 'poNumber', event.target.value)}
                              placeholder="Enter PO Number"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#77a68b] focus:ring-4 focus:ring-[#eef6f0]"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(event) => updatePoRow(index, 'poUpload', event.target.files?.[0] || null)}
                              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef6f0] file:px-3 file:py-2 file:font-bold file:text-[#456856] hover:file:bg-[#e4efe7]"
                            />
                            {row?.poUpload?.name ? (
                              <p className="mt-2 text-xs font-bold text-slate-500">
                                Saved: {row.poUpload.name}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <MultiServiceSelect
                              value={row.services || []}
                              onChange={(services) => updatePoRow(index, 'services', services)}
                            />
                          </td>
                        </tr>
                      ))}
                      {poRows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
                            Enter number of years to add PO details.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Please Provide Special Approved</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Upload supporting images or email approval proof.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Upload Images / Email</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.eml,.msg"
                      onChange={(event) => setSpecialApprovalFiles(Array.from(event.target.files || []))}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef6f0] file:px-3 file:py-2 file:font-bold file:text-[#456856] hover:file:bg-[#e4efe7]"
                    />
                    {specialApprovalFiles.length ? (
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {specialApprovalFiles.length} file(s) selected
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Email / Approval Note</span>
                    <textarea
                      value={specialApprovalEmail}
                      onChange={(event) => setSpecialApprovalEmail(event.target.value)}
                      rows={5}
                      placeholder="Enter approval email details or notes here"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#77a68b] focus:ring-4 focus:ring-[#eef6f0]"
                    />
                  </label>
                </div>
              </section>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRecord}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#456a57] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3d5d4d]"
            >
              {savingRecord ? 'Saving…' : 'Save And Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryBadge({ value }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-700 ring-1 ring-slate-200">
      {value || '-'}
    </span>
  );
}

function MsmeStatusBadge({ value }) {
  const normalized = String(value || '').trim();
  const toneClass = normalized && normalized !== '-'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : 'bg-slate-100 text-slate-500 ring-slate-200';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] ring-1 ${toneClass}`}>
      {normalized || '-'}
    </span>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="m-4 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <ServerCrash className="h-4 w-4" />
        {message}
      </div>
      <button type="button" onClick={onRetry} className="admin-secondary-button justify-center rounded-xl">Retry</button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
        <Building2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-slate-950">No clients found</h2>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
        No clients were returned from CCP for the selected filter.
      </p>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getClientName(client) {
  return client?.clientName
    || client?.data?.basic?.clientLegalName
    || client?.data?.basic?.clientName
    || client?.selectedLead?.company
    || '-';
}

function getClientUserName(client) {
  const importedAssignment = client?.data?.importMeta?.assignedTo;
  return client?.clientOwnerName
    || client?.assignedToName
    || importedAssignment?.name
    || (typeof importedAssignment === 'string' ? importedAssignment : '')
    || client?.adminControls?.assignedTo?.name
    || client?.adminControls?.assignedToName
    || client?.adminControls?.assignedToText
    || '-';
}

function getPiboCategory(client) {
  return client?.piboCategory
    || client?.data?.basic?.piboCategory
    || client?.data?.basic?.PIBOCategory
    || '-';
}

function getMsmeStatus(data = {}) {
  const directStatus = data?.basic?.msmeStatus
    || data?.compliance?.msmeStatus
    || data?.msme?.status
    || data?.msmeStatus;
  if (directStatus) return directStatus;

  const rows = normalizeMsmeRows(data?.msmeRows || data?.msme || []);
  for (const row of rows) {
    const entry = Array.isArray(row) ? row[1] : row;
    const status = readMsmeField(entry, ['MSME Status', 'Status', 'Udyam Status', 'Registration Status']);
    if (status) return status;

    const parsedStatus = parseMsmeStatusValue(entry?.value || entry?.Value || '');
    if (parsedStatus) return parsedStatus;
  }

  return rows.length ? 'Available' : '-';
}

function normalizeMsmeRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function readMsmeField(entry = {}, labels = []) {
  const list = Array.isArray(entry) ? entry : [entry];
  for (const item of list) {
    const label = String(item?.label || item?.Label || item?.name || item?.Name || '').trim().toLowerCase();
    const value = String(item?.value || item?.Value || '').trim();
    if (!value) continue;
    if (labels.some((candidate) => label === String(candidate).trim().toLowerCase())) return value;
  }
  return '';
}

function parseMsmeStatusValue(input) {
  const parts = String(input || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const match = parts.find((part) => {
    const normalized = part.toLowerCase();
    return normalized === 'micro'
      || normalized === 'small'
      || normalized === 'medium'
      || normalized === 'large';
  });

  return match || '';
}

function MultiServiceSelect({ value = [], onChange }) {
  const selectedServices = Array.isArray(value) ? value : [];

  const toggleService = (service) => {
    onChange(
      selectedServices.includes(service)
        ? selectedServices.filter((item) => item !== service)
        : [...selectedServices, service],
    );
  };

  return (
    <details className="min-w-[320px] rounded-xl border border-slate-200 bg-white open:ring-4 open:ring-[#eef6f0]">
      <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 font-semibold text-slate-900 marker:hidden">
        <span className={selectedServices.length ? '' : 'text-slate-400'}>
          {selectedServices.length ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected` : 'Select Services'}
        </span>
        <span className="text-xs text-slate-500">▼</span>
      </summary>
      <div className="max-h-60 space-y-1 overflow-y-auto border-t border-slate-100 p-2">
        {PO_SERVICE_OPTIONS.map((service) => (
          <label key={service} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 hover:bg-[#eef6f0]">
            <input
              type="checkbox"
              checked={selectedServices.includes(service)}
              onChange={() => toggleService(service)}
              className="mt-0.5 h-4 w-4 accent-[#456a57]"
            />
            <span>{service}</span>
          </label>
        ))}
      </div>
      {selectedServices.length ? (
        <div className="flex flex-wrap gap-1 border-t border-slate-100 p-2">
          {selectedServices.map((service) => (
            <span key={service} className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700">
              {service}
            </span>
          ))}
        </div>
      ) : null}
    </details>
  );
}

function createPoRow() {
  return {
    fyYear: '',
    poNumber: '',
    poUpload: null,
    services: [],
  };
}

function createPoRows(count) {
  return Array.from({ length: count }, () => createPoRow());
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function normalizeUploadValue(value) {
  if (!value) return null;
  if (value instanceof File) {
    const dataUrl = await readFileAsDataUrl(value);
    return { name: value.name, dataUrl, uploadedAt: new Date().toISOString() };
  }
  if (typeof value === 'object' && value.dataUrl && value.name) {
    return {
      name: value.name,
      dataUrl: value.dataUrl,
      uploadedAt: value.uploadedAt || new Date().toISOString(),
    };
  }
  return null;
}

async function buildPurchaseOrderPayload({ poReceived, poRows, specialApprovalFiles, specialApprovalEmail }) {
  if (poReceived) {
    const poYearRecords = await Promise.all((poRows || []).map(async (row) => {
      const poUpload = await normalizeUploadValue(row?.poUpload);
      return {
        fyYear: row?.fyYear || '',
        poNumber: row?.poNumber || '',
        poUpload,
        services: Array.isArray(row?.services) ? row.services : [],
        service: Array.isArray(row?.services) ? (row.services[0] || '') : '',
      };
    }));

    return {
      poReceived: true,
      poYearRecords: poYearRecords.filter((row) => row.poUpload),
      specialApprovalEmail: '',
      specialApprovalFiles: [],
    };
  }

  const files = await Promise.all((specialApprovalFiles || []).map((file) => normalizeUploadValue(file)));
  return {
    poReceived: false,
    poYearRecords: [],
    specialApprovalEmail: String(specialApprovalEmail || ''),
    specialApprovalFiles: files.filter(Boolean),
  };
}

export default ClientMaster;
