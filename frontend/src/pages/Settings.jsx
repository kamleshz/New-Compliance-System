import { FiBell as Bell, FiLock as Lock, FiSliders as Sliders } from 'react-icons/fi';

const settingsCards = [
  { id: 'workspace', title: 'Workspace controls', text: 'Manage organization defaults, operational preferences and process rules.' },
  { id: 'security', title: 'Security settings', text: 'Configure access, password standards and permission-related controls.' },
  { id: 'alerts', title: 'Notification preferences', text: 'Tune alerts for review queues, escalations and approval events.' },
];

function Settings() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Preferences</p>
            <h1 className="page-title">Settings</h1>
            <p className="page-description">
              Configure workspace behavior, notifications and security defaults for your compliance environment.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<Sliders className="h-4 w-4" />} label="Workspace" value="Configurable" />
            <StatCard icon={<Lock className="h-4 w-4" />} label="Security" value="Protected" />
            <StatCard icon={<Bell className="h-4 w-4" />} label="Alerts" value="Managed" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {settingsCards.map((card) => (
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

export default Settings;
