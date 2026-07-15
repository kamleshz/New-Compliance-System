import { FiBarChart2 as BarChart3, FiDownload as Download, FiPieChart as PieChart } from 'react-icons/fi';

const reportCards = [
  { id: 'ops', title: 'Operational Reports', text: 'Track review throughput, pending workloads and submission ageing.' },
  { id: 'audit', title: 'Audit Reports', text: 'Download evidence-backed approval trails for review and audits.' },
  { id: 'exports', title: 'Export Packs', text: 'Prepare client, team and compliance summaries for offline analysis.' },
];

function Reports() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Insights</p>
            <h1 className="page-title">Reports</h1>
            <p className="page-description">
              Reporting hub for compliance metrics, approval movement and export-ready operational views.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Dashboards" value="8" />
            <StatCard icon={<PieChart className="h-4 w-4" />} label="Views" value="Live" />
            <StatCard icon={<Download className="h-4 w-4" />} label="Exports" value="Ready" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {reportCards.map((card) => (
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

export default Reports;
