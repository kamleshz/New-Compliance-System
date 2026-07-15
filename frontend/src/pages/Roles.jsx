import { FiCheckCircle as CheckCircle, FiKey as Key, FiShield as ShieldCheck } from 'react-icons/fi';
import Table from '../components/ui/Table.jsx';

const columns = [
  { header: 'Role', accessor: 'role' },
  { header: 'Access Scope', accessor: 'permissions' },
  { header: 'Users', accessor: 'users' },
  { header: 'Description', accessor: 'description' },
];

const data = [
  { id: 1, role: 'Admin', permissions: 'All modules', users: '4', description: 'Full access across the platform' },
  { id: 2, role: 'Compliance Officer', permissions: 'Read / Update / Approve', users: '11', description: 'Manages compliance records and approval workflows' },
  { id: 3, role: 'Manager', permissions: 'Read / Review / Assign', users: '7', description: 'Reviews uploads and supervises assigned teams' },
  { id: 4, role: 'Employee', permissions: 'Read / Create', users: '22', description: 'Limited access for operational submissions and tracking' },
];

function Roles() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Access Control</p>
            <h1 className="page-title">Roles</h1>
            <p className="page-description">
              Define responsibility boundaries and approval rights across compliance operations.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Roles" value={String(data.length)} />
            <StatCard icon={<Key className="h-4 w-4" />} label="Access Models" value="Granular" />
            <StatCard icon={<CheckCircle className="h-4 w-4" />} label="Approval Paths" value="3 levels" />
          </div>
        </div>
      </section>

      <section className="app-surface p-5">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Role Catalogue</h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Review role intent, access scope and assigned user count.</p>
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

export default Roles;
