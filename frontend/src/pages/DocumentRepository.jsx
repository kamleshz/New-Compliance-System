import { FiArchive as Archive, FiFileText as FileText, FiShield as ShieldCheck } from 'react-icons/fi';

const repositoryCards = [
  { id: 'policies', title: 'Policy library', text: 'Store and surface the latest policies, SOPs and process references.' },
  { id: 'evidence', title: 'Evidence vault', text: 'Keep approval evidence and client supporting documents review-ready.' },
  { id: 'retention', title: 'Retention controls', text: 'Plan versioning, archive status and document lifecycle management.' },
];

function DocumentRepository() {
  return (
    <div className="space-y-6">
      <section className="app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Evidence Hub</p>
            <h1 className="page-title">Document Repository</h1>
            <p className="page-description">
              Central repository for policies, evidence files and document governance across compliance workflows.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard icon={<Archive className="h-4 w-4" />} label="Archive" value="Central" />
            <StatCard icon={<FileText className="h-4 w-4" />} label="Evidence" value="Structured" />
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Governance" value="Planned" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {repositoryCards.map((card) => (
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

export default DocumentRepository;
