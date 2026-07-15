import { FiAlertCircle as AlertCircle, FiClock as Clock, FiShield as ShieldCheck } from 'react-icons/fi';

const trackerCards = [
  { id: 'upcoming', title: 'Upcoming filings', text: 'Track deadlines that are approaching across all clients and categories.' },
  { id: 'delayed', title: 'Delayed items', text: 'Surface blocked or overdue obligations before they become compliance risks.' },
  { id: 'owners', title: 'Ownership view', text: 'Map each obligation to the responsible manager or compliance owner.' },
];

function RegulatoryTracker() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Compliance Watch</p>
            <h1 className="page-title">Regulatory Tracker</h1>
            <p className="page-description">
              Centralize obligation tracking, risk visibility and follow-up actions in one review-friendly workspace.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Coverage" value="National" />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Deadlines" value="Live" />
            <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Risk Alerts" value="Enabled" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {trackerCards.map((card) => (
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

export default RegulatoryTracker;
