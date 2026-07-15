import { FiCalendar as Calendar, FiClock as Clock, FiFlag as Flag } from 'react-icons/fi';

const calendarCards = [
  { id: 'monthly', title: 'Monthly deadlines', text: 'Get one place to plan regular submissions, reminders and reviews.' },
  { id: 'escalations', title: 'Escalation windows', text: 'Spot high-priority windows before deadlines slip into overdue status.' },
  { id: 'team-view', title: 'Team scheduling', text: 'Coordinate assignments between operations, managers and compliance reviewers.' },
];

function ComplianceCalendar() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Planning</p>
            <h1 className="page-title">Compliance Calendar</h1>
            <p className="page-description">
              Manage schedules, upcoming reviews and deadline visibility for every active compliance cycle.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<Calendar className="h-4 w-4" />} label="Schedules" value="Monthly" />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Reminders" value="Smart" />
            <StatCard icon={<Flag className="h-4 w-4" />} label="Priority" value="Tracked" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {calendarCards.map((card) => (
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

export default ComplianceCalendar;
