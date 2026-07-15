import { FiX as X } from 'react-icons/fi';

const sectionOrder = [
  ['basic', 'Basic Details'],
  ['registeredAddress', 'Registered Address'],
  ['communicationAddress', 'Communication Address'],
  ['compliance', 'Compliance'],
  ['msmeRows', 'MSME Details'],
  ['cte', 'CTE'],
  ['cteProductionRows', 'CTE Production'],
  ['ctoProductRows', 'CTO Products'],
  ['cpcb', 'CPCB'],
  ['validation', 'Validation'],
  ['otp', 'OTP'],
  ['authorised', 'Authorised Person'],
  ['coordinating', 'Coordinating Person'],
];

function ClientDetailsModal({ client, onClose }) {
  if (!client) return null;

  const rawClient = client?.ccpData || client;
  const data = rawClient?.data || client?.data || {};
  const selectedLead = rawClient?.selectedLead || client?.selectedLead || {};
  const adminControls = rawClient?.adminControls || client?.adminControls || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">View Client</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {display(data?.basic?.clientLegalName || data?.basic?.clientName || selectedLead?.company || client?.clientName)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Read-only Client Master details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close client details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoSection title="Selected Lead">
              <Detail label="Company" value={selectedLead?.company} />
              <Detail label="Status" value={selectedLead?.status} />
              <Detail label="Emails" value={selectedLead?.emails?.join(', ') || client?.email} />
              <Detail label="Mobile No. 1" value={selectedLead?.mobileNo1 || client?.phone} />
            </InfoSection>

            <InfoSection title="Admin Controls">
              <Detail label="Approval Status" value={adminControls?.approvalStatus} />
              <Detail label="Visibility Status" value={adminControls?.visibilityStatus || client?.ccpVisibilityStatus} />
              <Detail label="Assigned To" value={adminControls?.assignedTo?.name} />
              <Detail label="Assigned Email" value={adminControls?.assignedTo?.email} />
              <Detail label="Assigned Role" value={adminControls?.assignedTo?.role} />
            </InfoSection>

            <InfoSection title="Workflow">
              <Detail label="Workflow Status" value={client?.workflowStatus} />
              <Detail label="Created At" value={formatDate(client?.createdAt)} />
              <Detail label="Updated At" value={formatDate(client?.updatedAt)} />
            </InfoSection>
          </div>

          <div className="mt-5 space-y-4">
            {sectionOrder.map(([key, title]) => (
              <DataSection key={key} title={title} value={data?.[key]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function DataSection({ title, value }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="p-4">
        {Array.isArray(value) ? (
          <ArrayTable rows={value} />
        ) : value && typeof value === 'object' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(value).map(([key, entry]) => (
              <Detail key={key} label={formatLabel(key)} value={entry} />
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">-</p>
        )}
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 min-w-0 break-words text-sm font-medium text-slate-800">
        <DisplayValue value={value} />
      </div>
    </div>
  );
}

function ArrayTable({ rows }) {
  if (!rows?.length) return <p className="text-sm font-medium text-slate-500">-</p>;

  const headers = Array.from(rows.reduce((keys, row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      Object.keys(row).forEach((key) => keys.add(key));
    }
    return keys;
  }, new Set()));

  if (!headers.length) {
    return (
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <p key={`${row}-${index}`} className="text-sm font-medium text-slate-800">
            <DisplayValue value={row} />
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2">{formatLabel(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row?._id || index}>
              {headers.map((header) => (
                <td key={header} className="px-3 py-3 align-top text-slate-800">
                  <DisplayValue value={row?.[header]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisplayValue({ value }) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && isDateLike(value)) return formatDate(value);
  if (typeof value !== 'object') return String(value);

  if (value?.name || value?.dataUrl) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{display(value?.name)}</span>
        {value?.dataUrl ? (
          <a
            href={value.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            View/Open
          </a>
        ) : null}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((entry) => display(entry)).join(', ') : '-';
  }

  return (
    <div className="grid gap-1">
      {Object.entries(value).map(([key, entry]) => (
        <span key={key}>
          <span className="font-semibold">{formatLabel(key)}:</span> <DisplayValue value={entry} />
        </span>
      ))}
    </div>
  );
}

function display(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isDateLike(value) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default ClientDetailsModal;
