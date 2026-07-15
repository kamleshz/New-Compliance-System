import { FiBriefcase as Building2, FiLayers as Layers, FiUsers as Users } from 'react-icons/fi';
import Table from '../components/ui/Table.jsx';

const columns = [
  { header: 'Department', accessor: 'department' },
  { header: 'Team Lead', accessor: 'lead' },
  { header: 'Members', accessor: 'members' },
  { header: 'Description', accessor: 'description' },
];

const data = [
  { id: 1, department: 'Legal', lead: 'Aarav Sharma', members: '12', description: 'Compliance, contracts and regulatory affairs' },
  { id: 2, department: 'Audit', lead: 'Ritika Verma', members: '8', description: 'Internal auditing and control monitoring' },
  { id: 3, department: 'HR', lead: 'Neha Kapoor', members: '6', description: 'People operations and employee lifecycle' },
  { id: 4, department: 'Operations', lead: 'Vikram Nair', members: '14', description: 'Execution, vendor coordination and filing support' },
];

const totalMembers = data.reduce((sum, item) => sum + Number(item.members), 0);

function Departments() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Organization</p>
            <h1 className="page-title">Departments</h1>
            <p className="page-description">
              Track departments, team ownership and operational coverage across the workspace.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<Building2 className="h-4 w-4" />} label="Departments" value={String(data.length)} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Members" value={String(totalMembers)} />
            <StatCard icon={<Layers className="h-4 w-4" />} label="Coverage" value="4 zones" />
          </div>
        </div>
      </section>

      <section className="app-surface p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Department Directory</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Leadership, headcount and purpose for each department.</p>
          </div>
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

export default Departments;
