import { Fragment, forwardRef, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBell as Bell,
  FiBriefcase as Briefcase,
  FiChevronLeft as ChevronLeft,
  FiChevronRight as ChevronRight,
  FiExternalLink as ExternalLink,
  FiX as X,
} from 'react-icons/fi';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import api from '../services/api.js';
import { AuthContext } from '../context/AuthContext.jsx';

const piboPalette = ['#8b5cf6', '#2563eb', '#22c55e', '#f97316', '#eab308', '#06b6d4', '#ec4899', '#0f172a'];
const userPalette = ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const financialYearOptions = ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'];
const piboCategoryColors = {
  producer: '#8b5cf6',
  importer: '#2563eb',
  'brand owner': '#22c55e',
  'simp producer small micro': '#f97316',
  pwp: '#eab308',
  'simp producer': '#06b6d4',
  'simp importer raw': '#ec4899',
  'simp seller': '#0f172a',
};

function getCurrentFinancialYear() {
  const date = new Date();
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
const userPiboColumns = [
  { key: 'producer', label: 'Producer', color: '#8b5cf6' },
  { key: 'importer', label: 'Importer', color: '#2563eb' },
  { key: 'brandOwner', label: 'Brand Owner', color: '#22c55e' },
  { key: 'simpProducerSmallMicro', label: 'SIMP-Producer-Small-Micro', color: '#f97316' },
  { key: 'pwp', label: 'PWP', color: '#eab308' },
  { key: 'simpProducer', label: 'SIMP_Producer', color: '#06b6d4' },
  { key: 'simpImporterRaw', label: 'SIMP_Importer_Raw', color: '#ec4899' },
  { key: 'simpSeller', label: 'SIMP_Seller', color: '#0f172a' },
];
const checklistStatusColumns = [
  { key: 'receivedFromClient', label: 'Received From Client', tone: 'orange' },
  { key: 'partiallyDataReceived', label: 'Partially Data Received', tone: 'amber' },
  { key: 'completeDataReceived', label: 'Complete Data Received', tone: 'teal' },
  { key: 'workInProcess', label: 'Work in Process', tone: 'violet' },
  { key: 'readyToUpload', label: 'Ready to Upload', tone: 'sky' },
  { key: 'partiallyComplete', label: 'Partially Complete', tone: 'lime' },
  { key: 'nilUpload', label: 'Nil Upload', tone: 'slate' },
  { key: 'clientApprovalOnData', label: 'Client Approval on Data', tone: 'indigo' },
  { key: 'uploadComplete', label: 'Upload Complete', tone: 'emerald' },
];

function DashboardHome() {
  const { user } = useContext(AuthContext);
  const userName = String(user?.name || user?.email || 'User').trim();
  const greeting = getTimeBasedGreeting();
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(getCurrentFinancialYear);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [purchaseReviews, setPurchaseReviews] = useState([]);
  const [workflowNotifications, setWorkflowNotifications] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailClient, setDetailClient] = useState(null);
  const [pageSize, setPageSize] = useState('5');
  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalVisibleClients: 0,
    managerClientCount: 0,
    teamClientCount: 0,
    pendingComplianceCount: 0,
    notificationCount: 0,
    teamBreakdown: [],
    piboCategoryBreakdown: [],
    annualFilingFinancialYear: '',
    annualFilingStatusByClient: [],
    assignedUserBreakdown: [],
    userPiboCategoryBreakdown: [],
    purchaseChecklistBreakdown: [],
    salesChecklistBreakdown: [],
    unassignedClientCount: 0,
    uploadTimings: [],
  });

  useEffect(() => {
    let active = true;
    setDashboardLoading(true);
    Promise.all([
      api.get('/client-portal-data-uploads/manager-purchase-reviews', { params: { financialYear: selectedFinancialYear } }),
      api.get('/notifications'),
      api.get('/ccp-clients/dashboard-stats', { params: { financialYear: selectedFinancialYear } }),
      api.get('/ccp-clients?scope=dashboard'),
    ])
      .then(([reviewsResponse, notificationsResponse, statsResponse, clientsResponse]) => {
        if (!active) return;
        const stats = statsResponse.data.stats || {};
        const spocRows = stats.userPiboCategoryBreakdown || [];

        console.groupCollapsed(`[Dashboard Debug] CCP aggregation for ${selectedFinancialYear}`);
        console.info('Compliance API base URL:', statsResponse.config?.baseURL || '(same origin)');
        console.info('CCP/server diagnostics:', stats.ccpDebug || 'Diagnostics not returned by this backend deployment');
        console.info('Dashboard client-list count:', (clientsResponse.data.clients || []).length);
        console.table(spocRows.map((row) => ({
          spoc: row.name,
          registration: Number(row.clientNotForAnnualFiling || 0),
          annualFiling: Number(row.clientForAnnualFiling || 0),
          total: Number(row.clientNotForAnnualFiling || 0) + Number(row.clientForAnnualFiling || 0),
        })));
        console.groupEnd();

        setPurchaseReviews(reviewsResponse.data.reviews || []);
        setWorkflowNotifications((notificationsResponse.data.notifications || []).filter((item) => (
          item.financialYear === selectedFinancialYear
        )));
        setClients(clientsResponse.data.clients || []);
        setDashboardStats((current) => ({
          ...current,
          ...(statsResponse.data.stats || {}),
        }));
      })
      .catch((error) => {
        if (!active) return;
        console.error('[Dashboard Debug] Unable to load dashboard data', {
          apiBaseUrl: error.config?.baseURL || '(same origin)',
          requestUrl: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
        setPurchaseReviews([]);
        setWorkflowNotifications([]);
        setClients([]);
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedFinancialYear]);

  const assignedClientCount = useMemo(() => (
    (dashboardStats.assignedUserBreakdown || []).reduce((total, item) => total + Number(item.count || 0), 0)
  ), [dashboardStats.assignedUserBreakdown]);

  const uploadTimingMap = useMemo(() => new Map(
    (dashboardStats.uploadTimings || []).map((item) => [String(item.ccpClientId), item]),
  ), [dashboardStats.uploadTimings]);

  const selectedUserClients = useMemo(() => {
    if (!selectedUser) return clients;
    return clients.filter((client) => normalizeName(client?.clientOwnerName || client?.assignedToName) === normalizeName(selectedUser.name));
  }, [clients, selectedUser]);

  const annualFilingStatusMap = useMemo(() => new Map(
    (dashboardStats.annualFilingStatusByClient || []).map((item) => [String(item.ccpClientId), item]),
  ), [dashboardStats.annualFilingStatusByClient]);

  const selectedUserCategoryBreakdown = useMemo(() => {
    if (!selectedUser) return dashboardStats.piboCategoryBreakdown || [];
    const categoryMap = new Map();
    selectedUserClients.forEach((client) => {
      const category = normalizeCategory(client?.piboCategory);
      const current = categoryMap.get(category) || {
        category,
        count: 0,
        applicableCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        notApplicableCount: 0,
      };
      const clientId = String(client?.id || client?.sourceId || client?._id || '');
      const filingStatus = annualFilingStatusMap.get(clientId)?.status || 'notApplicable';
      current.count += 1;
      if (filingStatus === 'completed') {
        current.applicableCount += 1;
        current.completedCount += 1;
      } else if (filingStatus === 'inProgress') {
        current.applicableCount += 1;
        current.inProgressCount += 1;
      } else {
        current.notApplicableCount += 1;
      }
      categoryMap.set(category, current);
    });
    return [...categoryMap.values()]
      .map((item) => ({
        ...item,
        completionPercentage: item.applicableCount ? Math.round((item.completedCount / item.applicableCount) * 100) : 0,
      }))
      .sort((first, second) => second.count - first.count || first.category.localeCompare(second.category));
  }, [annualFilingStatusMap, dashboardStats.piboCategoryBreakdown, selectedUser, selectedUserClients]);

  const visibleCategoryTotal = useMemo(() => (
    selectedUser
      ? selectedUserCategoryBreakdown.reduce((total, item) => total + Number(item.count || 0), 0)
      : dashboardStats.totalVisibleClients
  ), [dashboardStats.totalVisibleClients, selectedUser, selectedUserCategoryBreakdown]);

  const filteredTableClients = useMemo(() => {
    const scopedClients = selectedUser ? selectedUserClients : clients;
    if (selectedCategory) return scopedClients.filter((client) => normalizeCategory(client?.piboCategory) === selectedCategory);
    if (selectedUser) {
      return selectedUserClients;
    }
    return [];
  }, [clients, selectedCategory, selectedUser, selectedUserClients]);

  const totalPages = pageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(filteredTableClients.length / Number(pageSize)));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleClients = pageSize === 'all'
    ? filteredTableClients
    : filteredTableClients.slice((safeCurrentPage - 1) * Number(pageSize), safeCurrentPage * Number(pageSize));

  const selectCategory = (category) => {
    setSelectedCategory((current) => (current === category ? '' : category));
    setCurrentPage(1);
    window.setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const selectUser = (user) => {
    const isSameUser = selectedUser?.userId === user.userId;
    setSelectedUser(isSameUser ? null : user);
    setSelectedCategory('');
    setCurrentPage(1);
    if (!isSameUser) {
      window.setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  };

  const clearUserFilter = () => {
    setSelectedUser(null);
    setSelectedCategory('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Compliance command center</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl dark:text-white">{greeting}, {userName}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Here is what is happening in your compliance workspace.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Financial Year
            <select
              value={selectedFinancialYear}
              onChange={(event) => setSelectedFinancialYear(event.target.value)}
              disabled={dashboardLoading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold normal-case tracking-normal text-slate-800 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
            >
              {financialYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <Link to="/notifications" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Bell className="h-4 w-4" />
            {dashboardStats.notificationCount || 0} alerts
          </Link>
          <Link to="/clients" className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 dark:shadow-none">
            <Briefcase className="h-4 w-4" />
            Client Master
          </Link>
        </div>
      </section>

      <UserPiboCategoryTable data={dashboardStats.userPiboCategoryBreakdown || []} />

      <ChecklistStatusSwitcher
        financialYear={selectedFinancialYear}
        purchaseRows={dashboardStats.purchaseChecklistBreakdown || []}
        salesRows={dashboardStats.salesChecklistBreakdown || []}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ClientsByCategoryCard
          total={visibleCategoryTotal}
          data={selectedUserCategoryBreakdown}
          palette={piboPalette}
          selectedKey={selectedCategory}
          scopedUser={selectedUser}
          financialYear={dashboardStats.annualFilingFinancialYear}
          onClearScope={clearUserFilter}
          onSelect={(item) => selectCategory(item.category)}
        />

        <UsersByAllocationCard
          total={assignedClientCount}
          data={dashboardStats.assignedUserBreakdown || []}
          palette={userPalette}
          selectedKey={selectedUser?.userId || selectedUser?.name}
          onSelect={selectUser}
        />
      </section>

      {selectedCategory || selectedUser ? (
        <ClientTable
          ref={tableRef}
          filterLabel={selectedUser && selectedCategory ? `${selectedUser.name} / ${selectedCategory}` : selectedUser ? selectedUser.name : selectedCategory}
          filterType={selectedUser && selectedCategory ? 'User + PIBO Category' : selectedUser ? 'User Allocation' : 'PIBO Category'}
          clients={visibleClients}
          totalClients={filteredTableClients.length}
          uploadTimingMap={uploadTimingMap}
          onViewDetails={setDetailClient}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setCurrentPage(1);
          }}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <PendingApprovals reviews={purchaseReviews} />
        <WorkflowAlerts notifications={workflowNotifications} />
      </section>

      {detailClient ? (
        <UploadTimeModal
          client={detailClient}
          timing={uploadTimingMap.get(String(detailClient?.id || detailClient?.sourceId || ''))}
          onClose={() => setDetailClient(null)}
        />
      ) : null}
    </div>
  );
}

function UserPiboCategoryTable({ data }) {
  const rows = useMemo(() => (
    (data || [])
      .map((item) => ({
        userId: item.userId || item.name,
        name: item.name || 'User',
        ...userPiboColumns.reduce((values, column) => ({
          ...values,
          [column.key]: Number(item[column.key] || 0),
        }), {}),
        clientForAnnualFiling: Number(item.clientForAnnualFiling || 0),
        clientNotForAnnualFiling: Number(item.clientNotForAnnualFiling || 0),
        totalAnnualFiling: Number(item.clientForAnnualFiling || 0) + Number(item.clientNotForAnnualFiling || 0),
      }))
      .filter((item) => item.name)
  ), [data]);

  const totals = useMemo(() => rows.reduce((summary, row) => {
    userPiboColumns.forEach((column) => {
      summary[column.key] += row[column.key];
    });
    summary.clientForAnnualFiling += row.clientForAnnualFiling;
    summary.clientNotForAnnualFiling += row.clientNotForAnnualFiling;
    summary.totalAnnualFiling = summary.clientForAnnualFiling + summary.clientNotForAnnualFiling;
    return summary;
  }, {
    ...userPiboColumns.reduce((values, column) => ({ ...values, [column.key]: 0 }), {}),
    clientForAnnualFiling: 0,
    clientNotForAnnualFiling: 0,
    totalAnnualFiling: 0,
  }), [rows]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">User wise PIBO Category</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">AnantTattva SPOC Allocation</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {rows.length} SPOC
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
            {totals.clientForAnnualFiling.toLocaleString('en-IN')} annual filing clients
          </span>
        </div>
      </div>
      <div className="overflow-x-auto bg-slate-50/60 p-3">
        <table className="w-full min-w-[1480px] border-separate border-spacing-0 overflow-hidden rounded-xl bg-white text-left text-sm shadow-sm ring-1 ring-slate-200">
          <thead className="text-xs uppercase tracking-[0.08em] text-slate-700">
            <tr>
              <th className="sticky left-0 z-20 w-56 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 font-black">AnantTattva SPOC</th>
              {userPiboColumns.map((column) => (
                <th key={column.key} className="border-b border-r border-slate-200 bg-white px-3 py-3 text-center font-black">
                  <span className="mx-auto flex max-w-32 items-center justify-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                    <span className="leading-4">{column.label}</span>
                  </span>
                </th>
              ))}
              <th className="border-b border-r border-slate-200 bg-amber-100 px-4 py-3 text-center font-black text-amber-950">Registration</th>
              <th className="border-b border-r border-slate-200 bg-emerald-100 px-4 py-3 text-center font-black text-emerald-950">Client For Annual Filing</th>
              <th className="border-b border-slate-200 bg-sky-100 px-4 py-3 text-center font-black text-sky-950">Total</th>
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {rows.length ? rows.map((row) => (
              <tr key={row.userId} className="group bg-white transition hover:bg-slate-50">
                <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 font-black text-slate-950 group-hover:bg-slate-50">{row.name}</td>
                {userPiboColumns.map((column) => (
                  <NumberCell key={column.key} value={row[column.key]} />
                ))}
                <NumberCell value={row.clientNotForAnnualFiling} className="bg-amber-100 font-black text-amber-950" />
                <NumberCell value={row.clientForAnnualFiling} className="bg-emerald-100 font-black text-emerald-950" />
                <NumberCell value={row.totalAnnualFiling} className="bg-sky-100 font-black text-sky-950" />
              </tr>
            )) : (
              <tr>
                <td colSpan={userPiboColumns.length + 4} className="px-3 py-8 text-center font-bold text-slate-500">
                  No eligible SPOC users found.
                </td>
              </tr>
            )}
            <tr className="bg-slate-100 font-black text-slate-950">
              <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-4 py-3">CLIENT FOR ANNUAL FILING</td>
              {userPiboColumns.map((column) => (
                <NumberCell key={column.key} value={totals[column.key]} bold className="bg-slate-100" />
              ))}
              <NumberCell value={totals.clientNotForAnnualFiling} className="bg-amber-200 font-black text-amber-950" />
              <NumberCell value={totals.clientForAnnualFiling} className="bg-[#fff1a8] font-black text-slate-950" />
              <NumberCell value={totals.totalAnnualFiling} className="bg-sky-200 font-black text-sky-950" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChecklistStatusSwitcher({ financialYear, purchaseRows = [], salesRows = [] }) {
  const [activeMode, setActiveMode] = useState('purchase');
  const [expandedByMode, setExpandedByMode] = useState(() => ({
    purchase: new Set(),
    sales: new Set(),
  }));
  const modes = [
    { key: 'purchase', label: 'Purchase Data', rows: purchaseRows, accent: 'emerald' },
    { key: 'sales', label: 'Sales Data', rows: salesRows, accent: 'blue' },
  ];
  const active = modes.find((mode) => mode.key === activeMode) || modes[0];
  const getClientTotal = (rows) => rows.reduce((total, row) => total + Number(row.totalClients || 0), 0);
  const toggleCategory = (categoryKey) => {
    setExpandedByMode((current) => {
      const nextSet = new Set(current[activeMode]);
      if (nextSet.has(categoryKey)) nextSet.delete(categoryKey);
      else nextSet.add(categoryKey);
      return { ...current, [activeMode]: nextSet };
    });
  };

  return (
    <ChecklistStatusTable
      title={active.label}
      eyebrow="Data Upload Checklist"
      financialYear={financialYear}
      rows={active.rows}
      accent={active.accent}
      applicabilityNote={activeMode === 'sales' ? 'Sales applies only to Producer and Importer PIBO categories.' : ''}
      expandedCategories={expandedByMode[activeMode]}
      onToggleCategory={toggleCategory}
      modeSelector={(
        <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
          {modes.map((mode) => {
            const selected = mode.key === activeMode;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setActiveMode(mode.key)}
                aria-pressed={selected}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition sm:px-4 ${
                  selected
                    ? mode.key === 'purchase'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`}
              >
                <span>{mode.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${selected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                  {getClientTotal(mode.rows).toLocaleString('en-IN')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

function ChecklistStatusTable({
  title,
  eyebrow,
  financialYear,
  rows = [],
  accent = 'emerald',
  applicabilityNote = '',
  expandedCategories = new Set(),
  onToggleCategory,
  modeSelector = null,
}) {
  const normalizedRows = useMemo(() => rows.map((row) => ({
    categoryKey: row.categoryKey || row.category,
    category: row.category || 'OTHER',
    totalClients: Number(row.totalClients || 0),
    ...checklistStatusColumns.reduce((values, column) => ({
      ...values,
      [column.key]: Number(row[column.key] || 0),
    }), {}),
    users: (row.users || []).map((userRow) => ({
      userId: userRow.userId || userRow.name,
      name: userRow.name || 'Unassigned',
      totalClients: Number(userRow.totalClients || 0),
      ...checklistStatusColumns.reduce((values, column) => ({
        ...values,
        [column.key]: Number(userRow[column.key] || 0),
      }), {}),
    })),
  })), [rows]);

  const totals = useMemo(() => normalizedRows.reduce((summary, row) => {
    summary.totalClients += row.totalClients;
    checklistStatusColumns.forEach((column) => {
      summary[column.key] += row[column.key];
    });
    return summary;
  }, {
    totalClients: 0,
    ...checklistStatusColumns.reduce((values, column) => ({ ...values, [column.key]: 0 }), {}),
  }), [normalizedRows]);

  const accentClasses = accent === 'blue'
    ? {
      badge: 'bg-blue-50 text-blue-700 ring-blue-200',
      group: 'bg-blue-600 text-white',
      total: 'bg-blue-50 text-blue-950',
    }
    : {
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      group: 'bg-emerald-600 text-white',
      total: 'bg-emerald-50 text-emerald-950',
    };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Data Upload Checklist Status by PIBO Category</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            A checklist Particular marked Yes is counted as 1; No or blank is counted as 0.
            {applicabilityNote ? ` ${applicabilityNote}` : ''}
          </p>
          {modeSelector ? <div className="mt-3">{modeSelector}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${accentClasses.badge}`}>
            FY {financialYear}
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {totals.totalClients.toLocaleString('en-IN')} clients
          </span>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-50/60 p-3">
        <table className="w-full min-w-[1760px] border-separate border-spacing-0 overflow-hidden rounded-xl bg-white text-left text-sm shadow-sm ring-1 ring-slate-200">
          <thead className="text-xs uppercase tracking-[0.07em] text-slate-700">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 w-56 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 font-black">PIBO Category</th>
              <th rowSpan={2} className="w-32 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-center font-black">Total Clients</th>
              <th colSpan={checklistStatusColumns.length} className={`border-b border-slate-200 px-4 py-3 text-center font-black ${accentClasses.group}`}>
                {title}
              </th>
            </tr>
            <tr>
              {checklistStatusColumns.map((column) => (
                <th key={column.key} className="min-w-36 border-b border-r border-slate-200 bg-white px-3 py-3 text-center font-black leading-4 last:border-r-0">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {normalizedRows.length ? normalizedRows.map((row) => {
              const expanded = expandedCategories.has(row.categoryKey);
              return (
                <Fragment key={row.categoryKey}>
                  <tr className="group bg-white transition hover:bg-slate-50">
                    <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2.5 font-black text-slate-950 group-hover:bg-slate-50">
                      <button
                        type="button"
                        onClick={() => onToggleCategory?.(row.categoryKey)}
                        aria-expanded={expanded}
                        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        <span>{row.category}</span>
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{row.users.length}</span>
                      </button>
                    </td>
                    <ChecklistNumberCell value={row.totalClients} className="bg-slate-50 font-black" />
                    {checklistStatusColumns.map((column) => (
                      <ChecklistNumberCell key={column.key} value={row[column.key]} highlight={column.key === 'uploadComplete'} />
                    ))}
                  </tr>
                  {expanded ? row.users.map((userRow) => (
                    <tr key={`${row.categoryKey}-${userRow.userId}`} className="bg-slate-50/70 text-slate-700">
                      <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-slate-50 px-4 py-2.5">
                        <div className="flex items-center gap-2 pl-6 font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{userRow.name}</span>
                        </div>
                      </td>
                      <ChecklistNumberCell value={userRow.totalClients} className="bg-slate-50/70" />
                      {checklistStatusColumns.map((column) => (
                        <ChecklistNumberCell key={column.key} value={userRow[column.key]} className="bg-slate-50/70" />
                      ))}
                    </tr>
                  )) : null}
                </Fragment>
              );
            }) : (
              <tr>
                <td colSpan={checklistStatusColumns.length + 2} className="px-4 py-8 text-center font-bold text-slate-500">
                  No checklist data is available for this financial year.
                </td>
              </tr>
            )}
            <tr className={`font-black ${accentClasses.total}`}>
              <td className={`sticky left-0 z-10 border-r border-slate-200 px-4 py-3 ${accentClasses.total}`}>TOTAL</td>
              <ChecklistNumberCell value={totals.totalClients} className={`font-black ${accentClasses.total}`} />
              {checklistStatusColumns.map((column) => (
                <ChecklistNumberCell key={column.key} value={totals[column.key]} className={`font-black ${accentClasses.total}`} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChecklistNumberCell({ value, highlight = false, className = '' }) {
  return (
    <td className={`border-b border-r border-slate-100 px-3 py-3 text-center font-semibold tabular-nums text-slate-800 last:border-r-0 ${highlight ? 'bg-emerald-50 font-black text-emerald-800' : ''} ${className}`}>
      {Number(value || 0).toLocaleString('en-IN')}
    </td>
  );
}

function NumberCell({ value, bold = false, className = '' }) {
  return (
    <td className={`border-b border-r border-slate-100 px-3 py-3 text-center tabular-nums ${bold ? 'font-black text-slate-950' : 'font-semibold text-slate-800'} ${className}`}>
      {Number(value || 0).toLocaleString('en-IN')}
    </td>
  );
}

function ClientsByCategoryCard({ total, data, palette, selectedKey, scopedUser, financialYear, onClearScope, onSelect }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [chartMode, setChartMode] = useState('annualReturn');

  const normalizedData = useMemo(() => data.map((item, index) => ({
    ...item,
    category: normalizeCategory(item?.category),
    key: normalizeCategory(item?.category),
    count: Number(item?.count || 0),
    applicableCount: Number(item?.applicableCount || 0),
    completedCount: Number(item?.completedCount || 0),
    inProgressCount: Number(item?.inProgressCount || 0),
    notApplicableCount: Number(item?.notApplicableCount || 0),
    completionPercentage: Number(item?.completionPercentage || 0),
    color: getPiboCategoryColor(item?.category, palette[index % palette.length]),
  })).filter((item) => item.count > 0), [data, palette]);

  const totalClients = total || normalizedData.reduce((sum, item) => sum + item.count, 0);
  const displayData = normalizedData
    .map((item) => ({
      ...item,
      chartCount: chartMode === 'registration' ? item.notApplicableCount : item.applicableCount,
    }))
    .filter((item) => item.chartCount > 0);
  const chartTotal = displayData.reduce((sum, item) => sum + item.chartCount, 0);
  const chartData = displayData.length
    ? displayData.map((item) => ({
      ...item,
      percentage: chartTotal ? Math.round((item.chartCount / chartTotal) * 100) : 0,
    }))
    : [{ key: 'empty', category: 'No data', chartCount: 1, color: '#e2e8f0', percentage: 0 }];

  const activeKey = hoveredKey || selectedKey;
  const activeItem = activeKey
    ? displayData.find((item) => String(item.key) === String(activeKey))
    : displayData[0] || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">PIBO Category</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            {scopedUser ? `${scopedUser.name}'s PIBO Categories` : 'Clients by Category'}
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {scopedUser ? (
            <button
              type="button"
              onClick={onClearScope}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
            >
              Clear user
            </button>
          ) : null}
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {Number(chartTotal || 0).toLocaleString('en-IN')} total
          </span>
          {financialYear ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
              {chartMode === 'registration' ? 'Registration' : 'Annual return'} {financialYear}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
        {[
          ['annualReturn', 'Annual Return'],
          ['registration', 'Registration'],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setChartMode(mode);
              setHoveredKey(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-extrabold transition ${
              chartMode === mode ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {scopedUser ? (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          Showing PIBO category split only for {scopedUser.name}. Select a category to view that user's clients in it.
        </div>
      ) : null}

      <ChartHoverSummary
        item={activeItem}
        value={activeItem ? (
          chartMode === 'registration'
            ? `${activeItem.notApplicableCount.toLocaleString('en-IN')} registration clients`
            : `${activeItem.completedCount.toLocaleString('en-IN')} of ${activeItem.applicableCount.toLocaleString('en-IN')} annual returns complete`
        ) : 'No category data'}
        percentage={activeItem ? (chartMode === 'registration' ? Math.round((activeItem.chartCount / chartTotal) * 100) : activeItem.completionPercentage) : null}
        emptyLabel="Hover a slice or legend item"
      />

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(220px,40%)_minmax(0,60%)] md:items-center">
        <div className="flex justify-center">
          <div className="flex h-[252px] w-[252px] items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-violet-50/40 ring-1 ring-slate-100 sm:h-[264px] sm:w-[264px]">
            <div className="relative h-[228px] w-[228px] sm:h-[240px] sm:w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={`${chartMode}-${chartTotal}`}
                  data={chartData}
                  dataKey="chartCount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={74}
                  outerRadius={102}
                  cornerRadius={7}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={900}
                  onMouseEnter={(_, index) => {
                    const item = displayData[index];
                    setHoveredKey(item?.key || null);
                  }}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={(_, index) => {
                    if (!displayData.length) return;
                    onSelect?.(displayData[index]);
                  }}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.key}
                      fill={item.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ cursor: displayData.length ? 'pointer' : 'default' }}
                      opacity={!displayData.length || !activeKey || String(activeKey) === String(item.key) ? 1 : 0.38}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full border border-slate-100 bg-white text-center shadow-sm">
                <div className="text-3xl font-black tabular-nums text-slate-950">
                  {Number(chartTotal || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-1 max-w-[108px] text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {chartMode === 'registration' ? 'REGISTRATION' : 'CLIENTS'}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="space-y-3">
          {displayData.length ? (
            displayData.map((item) => {
              const isSelected = activeKey && String(activeKey) === String(item.key);
              const percentage = chartTotal ? Math.round((item.chartCount / chartTotal) * 100) : 0;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => onSelect?.(item)}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_56px_44px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-violet-200 bg-violet-50'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-slate-700">{item.category}</span>
                      <span className="mt-1 block text-xs font-bold text-emerald-700">
                        {chartMode === 'registration'
                          ? `${item.notApplicableCount.toLocaleString('en-IN')} registration clients`
                          : `${item.completedCount.toLocaleString('en-IN')} / ${item.applicableCount.toLocaleString('en-IN')} complete · ${item.completionPercentage}%`}
                      </span>
                    </span>
                  </span>
                  <span className="text-right text-sm font-black tabular-nums text-slate-950">
                    {item.chartCount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-slate-500">
                    {percentage}%
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
              No category data found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersByAllocationCard({ total, data, palette, selectedKey, onSelect }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  const normalizedData = useMemo(() => data.map((item, index) => ({
    ...item,
    label: item?.name || 'Unassigned',
    key: item?.userId || item?.name || `user-${index}`,
    count: Number(item?.count || 0),
    color: palette[index % palette.length],
  })).filter((item) => item.count > 0), [data, palette]);

  const totalAssigned = total || normalizedData.reduce((sum, item) => sum + item.count, 0);
  const chartData = normalizedData.length
    ? normalizedData.map((item) => ({
      ...item,
      percentage: totalAssigned ? Math.round((item.count / totalAssigned) * 100) : 0,
    }))
    : [{ key: 'empty', label: 'No data', count: 1, color: '#e2e8f0', percentage: 0 }];

  const activeKey = hoveredKey || selectedKey;
  const activeItem = activeKey
    ? normalizedData.find((item) => String(item.key) === String(activeKey))
    : normalizedData[0] || null;
  const activeIndex = activeItem
    ? normalizedData.findIndex((item) => String(item.key) === String(activeItem.key))
    : -1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Users</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Assigned Clients by User</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Click a user to filter PIBO Category.</p>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {Number(totalAssigned || 0).toLocaleString('en-IN')} assigned
        </span>
      </div>

      <ChartHoverSummary
        item={activeItem ? { ...activeItem, category: activeItem.label } : null}
        value={activeItem ? `${activeItem.count.toLocaleString('en-IN')} assigned` : 'No user allocation data'}
        percentage={activeItem && totalAssigned ? Math.round((activeItem.count / totalAssigned) * 100) : null}
        emptyLabel="Hover a slice or legend item"
      />

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(220px,40%)_minmax(0,60%)] md:items-center">
        <div className="flex justify-center">
          <div className="flex h-[252px] w-[252px] items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-blue-50/40 ring-1 ring-slate-100 sm:h-[264px] sm:w-[264px]">
            <div className="relative h-[228px] w-[228px] sm:h-[240px] sm:w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={74}
                  outerRadius={102}
                  cornerRadius={10}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                  activeShape={renderActiveDonutShape}
                  isAnimationActive
                  animationDuration={900}
                  onMouseEnter={(_, index) => {
                    const item = normalizedData[index];
                    setHoveredKey(item?.key || null);
                  }}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={(_, index) => {
                    if (!normalizedData.length) return;
                    onSelect?.(normalizedData[index]);
                  }}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.key}
                      fill={item.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ cursor: normalizedData.length ? 'pointer' : 'default' }}
                      opacity={!normalizedData.length || !activeKey || String(activeKey) === String(item.key) ? 1 : 0.38}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-slate-100 bg-white px-6 py-5 text-center shadow-sm">
                <div className="text-3xl font-black tabular-nums text-slate-950">
                  {Number(totalAssigned || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">
                  ASSIGNED
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="space-y-3">
          {normalizedData.length ? (
            normalizedData.map((item) => {
              const isSelected = activeKey && String(activeKey) === String(item.key);
              const percentage = totalAssigned ? Math.round((item.count / totalAssigned) * 100) : 0;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => onSelect?.(item)}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_56px_44px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-sm font-extrabold text-slate-700">{item.label}</span>
                  </span>
                  <span className="text-right text-sm font-black tabular-nums text-slate-950">
                    {item.count.toLocaleString('en-IN')}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-slate-500">
                    {percentage}%
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
              No user allocation data found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartHoverSummary({ item, value, percentage, emptyLabel }) {
  if (!item) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{item.category}</p>
          <p className="text-xs font-semibold text-slate-500">{value}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
        {percentage ?? 0}%
      </span>
    </div>
  );
}

function renderActiveDonutShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    cornerRadius,
  } = props;

  return (
    <>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={cornerRadius}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.18}
        cornerRadius={cornerRadius}
      />
    </>
  );
}

function PendingApprovals({ reviews }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Pending Approvals</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Manager review queue</h2>
        </div>
        <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-100">
          {reviews.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {reviews.slice(0, 4).map((item) => (
          <Link
            key={`${item.ccpClientId}-${item.section || 'purchase'}-${item.uploadedAt}`}
            to={`/clients/${encodeURIComponent(item.ccpClientId)}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-orange-200 hover:bg-orange-50/50 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{item.clientName}</span>
              <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                {item.sectionLabel || 'Purchase Data'} by {item.uploadedBy || 'Team'}
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-100">
              Review
            </span>
          </Link>
        ))}
        {!reviews.length ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            No uploads are waiting for manager review.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WorkflowAlerts({ notifications }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Workflow Alerts</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Latest notifications</h2>
        </div>
        <Link to="/notifications" className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          {notifications.length}
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {notifications.slice(0, 4).map((item) => (
          <Link
            key={item._id}
            to={item.link || `/clients/${encodeURIComponent(item.ccpClientId)}`}
            className={`block rounded-xl border p-3 transition ${item.isRead ? 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900' : 'border-emerald-100 bg-emerald-50/40 hover:border-emerald-200'}`}
          >
            <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{item.title}</span>
            <span className="mt-1 block truncate text-xs font-bold text-slate-500">
              {item.sectionLabel || 'Workflow'} {item.financialYear ? `· ${item.financialYear}` : ''}
            </span>
          </Link>
        ))}
        {!notifications.length ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            No workflow notifications found.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const ClientTable = forwardRef(function ClientTable({
  filterLabel,
  filterType,
  clients,
  totalClients,
  uploadTimingMap,
  onViewDetails,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}, ref) {
  const firstRow = totalClients === 0 || pageSize === 'all' ? (totalClients ? 1 : 0) : ((currentPage - 1) * Number(pageSize)) + 1;
  const lastRow = pageSize === 'all' ? totalClients : Math.min(currentPage * Number(pageSize), totalClients);
  const pageNumbers = getPaginationPages(currentPage, totalPages);

  return (
    <section ref={ref} className="scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">{filterType}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{filterLabel}</h2>
        </div>
        <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">{totalClients} clients</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-5 py-4">ATPL Code</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Total Days</th>
              <th className="px-5 py-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {clients.length ? clients.map((client) => {
              const timing = uploadTimingMap.get(String(client?.id || client?.sourceId || ''));
              const timingSummary = getUploadTimingSummary(timing?.sections);
              const companyName = client?.clientName || client?.clientLegalName || client?.tradeName || '-';
              return (
                <tr key={client?.id || client?.sourceId} className="hover:bg-violet-50/40 dark:hover:bg-slate-900">
                  <td className="px-5 py-4 font-black text-slate-700 dark:text-slate-200">{client?.clientCode || client?.atplCode || '-'}</td>
                  <td className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">{client?.clientOwnerName || client?.assignedToName || 'Unassigned'}</td>
                  <td className="px-5 py-4 font-black text-slate-950 dark:text-white">{companyName}</td>
                  <td className="px-5 py-4"><StatusBadge status={timingSummary.complianceStatus || client?.status} /></td>
                  <td className="px-5 py-4"><DaysBadge value={timingSummary.daysSpent} /></td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" onClick={() => onViewDetails(client)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900">
                      View
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-center text-sm font-bold text-slate-500">No clients found for this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          <span>Showing <strong>{firstRow}-{lastRow}</strong> of <strong>{totalClients}</strong></span>
          <label className="flex items-center gap-2">
            Rows
            <select value={pageSize} onChange={(event) => onPageSizeChange(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-950">
              {['5', '10', '20', '50'].map((size) => <option key={size} value={size}>{size}</option>)}
              <option value="all">All</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((page) => (
            <button key={page} type="button" onClick={() => onPageChange(page)} className={`h-9 min-w-9 rounded-lg px-2 text-sm font-black ${page === currentPage ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'}`}>
              {page}
            </button>
          ))}
          <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
});

function StatusBadge({ status }) {
  const value = String(status || 'Pending');
  const normalized = value.toLowerCase();
  const style = normalized === 'active' || normalized === 'complete' || normalized === 'approved'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : normalized === 'inactive' || normalized === 'rejected'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black capitalize ring-1 ${style}`}>{value}</span>;
}

function DaysBadge({ value }) {
  const completed = typeof value === 'number';
  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
      {completed ? `${value} day${value === 1 ? '' : 's'}` : value}
    </span>
  );
}

function UploadTimeModal({ client, timing, onClose }) {
  const sections = timing?.sections || [];
  const [activeSectionKey, setActiveSectionKey] = useState(sections[0]?.key || 'purchase');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const companyName = client?.clientName || client?.clientLegalName || client?.tradeName || '-';
  const userName = timing?.userName || client?.clientOwnerName || client?.assignedToName || 'Unassigned';
  const activeSection = sections.find((section) => section.key === activeSectionKey) || sections[0] || {};
  const sectionDaysSpent = calculateDaysSpent(activeSection?.receivedDate, activeSection?.portalUploadDate);
  const clientId = encodeURIComponent(client?.id || client?.sourceId || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-slate-950 p-6 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Data Upload Timeline</p>
            <h2 className="mt-2 text-2xl font-black">{companyName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-300">{client?.clientCode || '-'} | {userName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20" aria-label="Close details">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
            {sections.length ? sections.map((section) => {
              const active = section.key === activeSectionKey;
              return (
                <button key={section.key} type="button" onClick={() => setActiveSectionKey(section.key)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                  {section.label}
                </button>
              );
            }) : <p className="text-sm font-bold text-slate-500">No upload sections found.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TimelineDateCard label="Received Data from Client" value={activeSection?.receivedDate} />
            <TimelineDateCard label="Data Upload on Portal" value={activeSection?.portalUploadDate} />
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Total Days Spent</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{typeof sectionDaysSpent === 'number' ? `${sectionDaysSpent} days` : sectionDaysSpent}</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="admin-secondary-button justify-center">Close</button>
            <Link to={`/clients/${clientId}`} className="admin-primary-button justify-center" onClick={onClose}>
              Open Client Details
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineDateCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{formatDashboardDate(value)}</p>
    </div>
  );
}

function getUploadTimingSummary(sections = []) {
  const sectionResults = sections.map((section) => ({
    ...section,
    daysSpent: calculateDaysSpent(section?.receivedDate, section?.portalUploadDate),
  }));
  const completedDays = sectionResults.filter((section) => typeof section.daysSpent === 'number').map((section) => section.daysSpent);
  const startedSections = sectionResults.filter((section) => section.receivedDate || section.portalUploadDate);
  const statuses = startedSections.map((section) => String(section.complianceStatus || section.managerStatus || '').toLowerCase());

  let complianceStatus = '';
  if (statuses.some((status) => status === 'rejected')) complianceStatus = 'Rejected';
  else if (statuses.length && statuses.every((status) => status === 'approved')) complianceStatus = 'Approved';
  else if (startedSections.length) complianceStatus = 'Pending';

  let daysSpent = 'Not Started';
  if (completedDays.length) daysSpent = completedDays.reduce((total, days) => total + days, 0);
  else if (sectionResults.some((section) => section.daysSpent === 'Invalid dates')) daysSpent = 'Invalid dates';
  else if (startedSections.length) daysSpent = 'Pending';

  return { daysSpent, complianceStatus };
}

function calculateDaysSpent(receivedDate, portalUploadDate) {
  if (!receivedDate) return 'Not Started';
  if (!portalUploadDate) return 'Pending';
  const received = parseDashboardDate(receivedDate);
  const uploaded = parseDashboardDate(portalUploadDate);
  if (!received || !uploaded || uploaded < received) return 'Invalid dates';
  return Math.round((uploaded - received) / 86400000);
}

function parseDashboardDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDashboardDate(value) {
  const date = parseDashboardDate(value);
  if (!date) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.min(Math.max(1, currentPage - 2), totalPages - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function normalizeCategory(value) {
  if (Array.isArray(value)) {
    const categories = value.map((item) => String(item || '').trim()).filter(Boolean);
    return categories.join(', ') || 'Not specified';
  }
  return String(value || '').trim() || 'Not specified';
}

function getPiboCategoryColor(category, fallback) {
  const normalized = String(category || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return piboCategoryColors[normalized] || fallback;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export default DashboardHome;
