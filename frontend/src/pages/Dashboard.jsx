import Card from '../components/ui/Card.jsx';

const metrics = [
  { title: 'Total Users', value: '1,250' },
  { title: 'Active Users', value: '1,090' },
  { title: 'Departments', value: '12' },
  { title: 'Roles', value: '8' },
  { title: 'Pending Tasks', value: '34' },
  { title: 'Recent Activities', value: '18' },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Compliance overview</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} title={metric.title} value={metric.value} />
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-semibold">Recent Activities</h2>
        <ul className="space-y-3 text-slate-700 dark:text-slate-200">
          <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">User onboarding completed for Jane Doe.</li>
          <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">Department policy updated in Legal.</li>
          <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">Role permissions adjusted for Compliance Team.</li>
        </ul>
      </section>
    </div>
  );
}

export default Dashboard;
