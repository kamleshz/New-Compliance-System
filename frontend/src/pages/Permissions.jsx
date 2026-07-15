import { FiGrid as Grid, FiLock as Lock, FiSliders as Sliders } from 'react-icons/fi';
import Table from '../components/ui/Table.jsx';

const columns = [
  { header: 'Module', accessor: 'module' },
  { header: 'Actions', accessor: 'actions' },
  { header: 'Assigned Roles', accessor: 'roles' },
];

const data = [
  { id: 1, module: 'User Management', actions: 'create, read, update, delete', roles: 'Admin, Super Admin' },
  { id: 2, module: 'Departments', actions: 'create, read, update, delete', roles: 'Admin, Manager' },
  { id: 3, module: 'Compliance Register', actions: 'create, read, update, approve', roles: 'Compliance, Manager' },
  { id: 4, module: 'Reports', actions: 'read, export', roles: 'Admin, Compliance' },
];

function Permissions() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Security Matrix</p>
            <h1 className="page-title">Permissions</h1>
            <p className="page-description">
              Manage granular privileges by module, action and ownership responsibility.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<Lock className="h-4 w-4" />} label="Protected Modules" value={String(data.length)} />
            <StatCard icon={<Grid className="h-4 w-4" />} label="Action Types" value="CRUD +" />
            <StatCard icon={<Sliders className="h-4 w-4" />} label="Policy Mode" value="Granular" />
          </div>
        </div>
      </section>

      <section className="app-surface p-5">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Permission Matrix</h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Module-level actions mapped to the roles that can operate them.</p>
        </div>
        <Table columns={columns} data={data} />
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

export default Permissions;
