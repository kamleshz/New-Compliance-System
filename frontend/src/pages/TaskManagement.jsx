import { FiCheckSquare as CheckSquare, FiClock as Clock, FiUsers as Users } from 'react-icons/fi';

const taskCards = [
  { id: 'queue', title: 'Work queue', text: 'Surface pending actions by status, assignee and ageing.' },
  { id: 'ownership', title: 'Ownership routing', text: 'Keep managers and compliance owners aligned on the next action.' },
  { id: 'sla', title: 'SLA visibility', text: 'Highlight tasks that risk breaching internal turnaround commitments.' },
];

function TaskManagement() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Workflow</p>
            <h1 className="page-title">Task Management</h1>
            <p className="page-description">
              Coordinate review tasks, ownership handoffs and operational follow-ups from one workspace.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Assignments" value="Active" />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Turnaround" value="Tracked" />
            <StatCard icon={<Users className="h-4 w-4" />} label="Teams" value="Mapped" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {taskCards.map((card) => (
          <div key={card.id} className="app-surface-interactive p-5">
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">{card.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{card.text}</p>
          </div>
        ))}
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

export default TaskManagement;
