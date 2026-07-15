import { useEffect, useMemo, useState } from 'react';
import {
  FiDownload as Download,
  FiEdit3 as Edit3,
  FiEye as Eye,
  FiPlus as Plus,
  FiRefreshCw as RefreshCw,
  FiSearch as Search,
  FiTrash2 as Trash2,
  FiUploadCloud as UploadCloud,
  FiX as X,
} from 'react-icons/fi';
import api from '../services/api.js';

const EMPTY_PAYMENT = {
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMode: 'Bank Transfer',
  amount: '',
  tdsAmount: '',
  reference: '',
  proofFiles: [],
  remarks: '',
};

const PAYMENT_MODE_OPTIONS = ['Bank Transfer', 'NEFT', 'UTR'];

function Accounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [status, setStatus] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [viewingPo, setViewingPo] = useState(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/client-purchase-orders/accounts', { params: { t: Date.now() } });
      setRows(response.data?.accounts || []);
      setError('');
    } catch (requestError) {
      setRows([]);
      setError(requestError.response?.data?.message || 'Unable to load Accounts records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const financialYears = useMemo(() => (
    [...new Set(rows.map((row) => row.financialYear).filter(Boolean))].sort().reverse()
  ), [rows]);

  const statuses = useMemo(() => (
    [...new Set(rows.map((row) => row.paymentStatus).filter(Boolean))]
  ), [rows]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => (
      (!financialYear || row.financialYear === financialYear)
      && (!status || row.paymentStatus === status)
      && (!term || [row.clientName, row.clientCode, row.poNumber, row.assignedUser, ...(row.services || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)))
    ));
  }, [financialYear, query, rows, status]);

  const totals = useMemo(() => filteredRows.reduce((result, row) => ({
    poAmount: result.poAmount + Number(row.poAmount || 0),
    received: result.received + Number(row.amountReceived || 0),
    outstanding: result.outstanding + Number(row.outstandingAmount || 0),
  }), { poAmount: 0, received: 0, outstanding: 0 }), [filteredRows]);

  return (
    <div className="min-h-full px-3 pb-7 pt-4 sm:px-4">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Accounts</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Purchase orders, receipts and outstanding balances.</p>
            </div>
            <button type="button" onClick={loadAccounts} disabled={loading} className="admin-secondary-button justify-center">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Summary label="Total PO Amount" value={formatCurrency(totals.poAmount)} />
            <Summary label="Amount Received" value={formatCurrency(totals.received)} tone="emerald" />
            <Summary label="Outstanding" value={formatCurrency(totals.outstanding)} tone="amber" />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(260px,1fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client or PO number..." className="admin-input pl-9" />
            </div>
            <select value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} className="admin-input">
              <option value="">All financial years</option>
              {financialYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input">
              <option value="">All payment statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {error ? <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">Loading accounts...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">No purchase orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1580px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-4 py-3.5">Financial Year</th>
                    <th className="px-4 py-3.5">PO Number</th>
                    <th className="px-4 py-3.5">Services</th>
                    <th className="px-4 py-3.5">PO Upload</th>
                    <th className="px-4 py-3.5 text-right">PO Amount</th>
                    <th className="px-4 py-3.5 text-right">Received</th>
                    <th className="px-4 py-3.5 text-right">TDS</th>
                    <th className="px-4 py-3.5 text-right">Outstanding</th>
                    <th className="px-4 py-3.5">Payment Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={`${row.ccpClientId}-${row.yearRecordId}`} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-slate-950">{row.clientName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{row.clientCode || row.assignedUser || '-'}</p>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-700">{row.financialYear}</td>
                      <td className="px-4 py-4 font-bold text-slate-700">{row.poNumber}</td>
                      <td className="max-w-xs px-4 py-4"><ServiceTags services={row.services} /></td>
                      <td className="px-4 py-4">
                        {row.poFileUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingPo(row)}
                              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 font-bold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100"
                            >
                              <Eye className="h-4 w-4" /> View
                            </button>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4 text-right font-extrabold text-slate-900">{formatCurrency(row.poAmount)}</td>
                      <td className="px-4 py-4 text-right font-extrabold text-emerald-700">{formatCurrency(row.amountReceived)}</td>
                      <td className="px-4 py-4 text-right font-extrabold text-sky-700">{formatCurrency(row.tdsAmount)}</td>
                      <td className="px-4 py-4 text-right font-extrabold text-amber-700">{formatCurrency(row.outstandingAmount)}</td>
                      <td className="px-4 py-4"><PaymentStatus value={row.paymentStatus} /></td>
                      <td className="px-4 py-4 text-right">
                        <button type="button" onClick={() => setEditingRow(row)} className="admin-primary-button min-h-9 px-3">
                          <Edit3 className="h-4 w-4" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editingRow ? (
        <AccountEditor
          key={editingRow.yearRecordId}
          row={editingRow}
          availableRows={rows.filter((item) => item.ccpClientId === editingRow.ccpClientId)}
          onSelectRow={(yearRecordId) => {
            const selected = rows.find((item) => item.ccpClientId === editingRow.ccpClientId && item.yearRecordId === yearRecordId);
            if (selected) setEditingRow(selected);
          }}
          onViewPo={() => setViewingPo(editingRow)}
          onClose={() => setEditingRow(null)}
          onSaved={() => { setEditingRow(null); loadAccounts(); }}
        />
      ) : null}
      {viewingPo ? <PoViewer row={viewingPo} onClose={() => setViewingPo(null)} /> : null}
    </div>
  );
}

function PoViewer({ row, onClose }) {
  const isImage = String(row.poFileUrl || '').startsWith('data:image/');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-950">{row.poFileName || 'Purchase Order'}</h2>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{row.clientName} · {row.financialYear} · {row.poNumber}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={row.poFileUrl} download={row.poFileName || 'purchase-order'} className="admin-secondary-button min-h-9 px-3">
              <Download className="h-4 w-4" /> Download
            </a>
            <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100" aria-label="Close PO viewer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 p-3">
          {isImage ? (
            <div className="flex h-full items-center justify-center overflow-auto rounded-2xl bg-white">
              <img src={row.poFileUrl} alt={row.poFileName || 'Purchase order'} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <iframe src={row.poFileUrl} title={row.poFileName || 'Purchase order'} className="h-full w-full rounded-2xl border-0 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
}

function AccountEditor({ row, availableRows = [], onSelectRow, onViewPo, onClose, onSaved }) {
  const [poAmount, setPoAmount] = useState(String(row.poAmount || ''));
  const [payments, setPayments] = useState(() => (row.payments || []).map((payment) => ({
    ...payment,
    paymentDate: payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : '',
  })));
  const [accountsRemarks, setAccountsRemarks] = useState(row.accountsRemarks || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const liveSummary = useMemo(() => {
    const targetAmount = toAmount(poAmount);
    const bankReceived = payments.reduce((sum, payment) => sum + toAmount(payment.amount), 0);
    const tdsReceived = payments.reduce((sum, payment) => sum + toAmount(payment.tdsAmount), 0);
    const settledAmount = bankReceived + tdsReceived;
    return {
      bankReceived,
      tdsReceived,
      outstanding: Math.max(0, targetAmount - settledAmount),
      status: calculatePaymentStatus(targetAmount, settledAmount),
    };
  }, [payments, poAmount]);

  const updatePayment = (index, field, value) => setPayments((current) => current.map((payment, paymentIndex) => (
    paymentIndex === index ? { ...payment, [field]: value } : payment
  )));

  const addPaymentProofFiles = async (index, files) => {
    try {
      const proofFiles = await readPaymentProofFiles(files);
      setPayments((current) => current.map((payment, paymentIndex) => (
        paymentIndex === index
          ? { ...payment, proofFiles: [...(payment.proofFiles || []), ...proofFiles] }
          : payment
      )));
    } catch {
      setError('Unable to read the selected payment proof file.');
    }
  };

  const removePaymentProofFile = (paymentIndex, fileIndex) => {
    setPayments((current) => current.map((payment, index) => (
      index === paymentIndex
        ? { ...payment, proofFiles: (payment.proofFiles || []).filter((_, proofIndex) => proofIndex !== fileIndex) }
        : payment
    )));
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      await api.put(`/client-purchase-orders/${encodeURIComponent(row.ccpClientId)}/years/${encodeURIComponent(row.yearRecordId)}/accounts`, {
        poAmount: Number(poAmount || 0),
        payments,
        accountsRemarks,
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save account details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Manage Account</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{row.clientName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{row.financialYear} · {row.poNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="max-h-[80vh] overflow-y-auto p-6">
          {error ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <label className="block w-full max-w-sm">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Financial Year / PO</span>
                <select value={row.yearRecordId} onChange={(event) => onSelectRow?.(event.target.value)} className="admin-input mt-2 bg-white">
                  {[...availableRows]
                    .sort((first, second) => String(second.financialYear).localeCompare(String(first.financialYear)))
                    .map((item) => (
                      <option key={item.yearRecordId} value={item.yearRecordId}>{item.financialYear} · {item.poNumber}</option>
                    ))}
                </select>
              </label>
              {row.poFileUrl ? (
                <button type="button" onClick={onViewPo} className="admin-secondary-button min-h-11 justify-center px-4">
                  <Eye className="h-4 w-4" /> View PO
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_220px_minmax(280px,1fr)]">
              <PoDetail label="Financial Year" value={row.financialYear} />
              <PoDetail label="PO Number" value={row.poNumber} />
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Services</p>
                <div className="mt-2"><ServiceTags services={row.services} /></div>
              </div>
            </div>
          </section>

          <label className="mt-5 block max-w-sm">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">PO Amount for {row.financialYear}</span>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">₹</span>
              <input type="number" min="0" step="0.01" required value={poAmount} onChange={(event) => setPoAmount(event.target.value)} className="admin-input pl-9" />
            </div>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Bank Received" value={formatCurrency(liveSummary.bankReceived)} tone="emerald" />
            <Summary label="TDS" value={formatCurrency(liveSummary.tdsReceived)} />
            <Summary label="Outstanding" value={formatCurrency(liveSummary.outstanding)} tone="amber" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Payment Status</p>
              <div className="mt-3"><PaymentStatus value={liveSummary.status} /></div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">Payments</h3>
            <button type="button" onClick={() => setPayments((current) => [...current, { ...EMPTY_PAYMENT }])} className="admin-secondary-button min-h-9 px-3">
              <Plus className="h-4 w-4" /> Add Payment
            </button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1280px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                <tr><th className="p-3">Date</th><th className="p-3">Payment Mode</th><th className="p-3">Bank Received</th><th className="p-3">TDS</th><th className="p-3">Reference / UTR</th><th className="p-3">Payment Proof</th><th className="p-3">Remarks</th><th className="p-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment, index) => (
                  <tr key={payment._id || index}>
                    <td className="p-2"><input type="date" required value={payment.paymentDate || ''} onChange={(event) => updatePayment(index, 'paymentDate', event.target.value)} className="admin-input" /></td>
                    <td className="p-2"><select required value={payment.paymentMode || ''} onChange={(event) => updatePayment(index, 'paymentMode', event.target.value)} className="admin-input"><option value="">Select mode</option>{PAYMENT_MODE_OPTIONS.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></td>
                    <td className="p-2"><input type="number" min="0" step="0.01" value={payment.amount || ''} onChange={(event) => updatePayment(index, 'amount', event.target.value)} className="admin-input" /></td>
                    <td className="p-2"><input type="number" min="0" step="0.01" value={payment.tdsAmount || ''} onChange={(event) => updatePayment(index, 'tdsAmount', event.target.value)} className="admin-input" /></td>
                    <td className="p-2"><input value={payment.reference || ''} onChange={(event) => updatePayment(index, 'reference', event.target.value)} className="admin-input" /></td>
                    <td className="min-w-64 p-2">
                      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100">
                        <UploadCloud className="h-4 w-4" /> Upload proof
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,application/pdf"
                          className="hidden"
                          onChange={(event) => {
                            addPaymentProofFiles(index, event.target.files);
                            event.target.value = '';
                          }}
                        />
                      </label>
                      {(payment.proofFiles || []).length ? (
                        <div className="mt-2 space-y-1">
                          {(payment.proofFiles || []).map((file, fileIndex) => (
                            <div key={file._id || `${file.name}-${fileIndex}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                              <button type="button" onClick={() => removePaymentProofFile(index, fileIndex)} className="shrink-0 text-red-500 hover:text-red-700" aria-label={`Remove ${file.name}`}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-2"><input value={payment.remarks || ''} onChange={(event) => updatePayment(index, 'remarks', event.target.value)} className="admin-input" /></td>
                    <td className="p-2"><button type="button" onClick={() => setPayments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {payments.length === 0 ? <tr><td colSpan="8" className="p-6 text-center font-semibold text-slate-500">No payments recorded.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <label className="mt-5 block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Accounts Remarks</span>
            <textarea rows="3" value={accountsRemarks} onChange={(event) => setAccountsRemarks(event.target.value)} className="admin-input mt-2" />
          </label>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={onClose} className="admin-secondary-button">Cancel</button>
            <button type="submit" disabled={saving} className="admin-primary-button">{saving ? 'Saving...' : 'Save Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PoDetail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-extrabold text-slate-950">{value || '-'}</p>
    </div>
  );
}

function ServiceTags({ services }) {
  const values = Array.isArray(services) ? services.filter(Boolean) : [];
  if (!values.length) return <span className="text-sm font-semibold text-slate-400">No services selected</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((service) => (
        <span key={service} className="inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
          {service}
        </span>
      ))}
    </div>
  );
}

function Summary({ label, value, tone = 'slate' }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-950';
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value}</p></div>;
}

function PaymentStatus({ value }) {
  const tone = value === 'Received' || value === 'Complete Received' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : value === 'Partially Received' ? 'bg-sky-50 text-sky-700 ring-sky-200'
      : value === 'Overpaid' ? 'bg-violet-50 text-violet-700 ring-violet-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${tone}`}>{value}</span>;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function calculatePaymentStatus(poAmount, settledAmount) {
  if (poAmount <= 0) return 'Amount Pending';
  if (settledAmount <= 0) return 'Payment Pending';
  if (settledAmount < poAmount) return 'Partially Received';
  if (settledAmount > poAmount) return 'Overpaid';
  return 'Complete Received';
}

async function readPaymentProofFiles(files) {
  return Promise.all(Array.from(files || []).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      dataUrl: String(reader.result || ''),
      uploadedAt: new Date().toISOString(),
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

export default Accounts;
