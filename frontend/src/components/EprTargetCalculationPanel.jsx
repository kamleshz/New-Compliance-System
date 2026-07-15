import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertOctagon as AlertOctagon,
  FiDownload as Download,
  FiPrinter as Printer,
  FiRefreshCw as RefreshCw,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import api from '../services/api.js';

function formatNumber(value, digits) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return numeric.toFixed(digits);
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildWorkbook(entityType, calculation) {
  const workbook = XLSX.utils.book_new();
  const targets = toSafeArray(calculation?.targetTables);

  targets.forEach((table) => {
    const year1 = table?.period?.year1 || 'Year1';
    const year2 = table?.period?.year2 || 'Year2';
    const targetYear = table?.period?.targetYear || 'TargetYear';
    const rows = toSafeArray(table?.rows).map((row) => {
      if (entityType === 'producer') {
        return {
          Category: row.category,
          [`${year1} Sales`]: row.year1?.salesQuantity,
          [`${year1} Pre-Consumer`]: row.year1?.preConsumerQuantity,
          [`${year1} Total`]: row.year1?.total,
          [`${year2} Sales`]: row.year2?.salesQuantity,
          [`${year2} Pre-Consumer`]: row.year2?.preConsumerQuantity,
          [`${year2} Total`]: row.year2?.total,
          Average: row.average,
          [`Registered Sales (${year2})`]: row.registeredSalesYear2,
          [`Recycled % (${year2})`]: row.recycledPlasticPercentYear2,
          'Recycled Qty': row.recycledQuantity,
          [`Virgin Target (${targetYear})`]: row.virginTarget,
        };
      }

      return {
        Category: row.category,
        [`${year1} Total`]: row.year1Total,
        [`${year2} Total`]: row.year2Total,
        Average: row.average,
        [`Recycled % (${year2})`]: row.recycledPlasticPercent,
        'Recycled Qty': row.recycledQuantity,
        [`Target (${targetYear})`]: row.target,
        [`Virgin Target (${targetYear})`]: row.virginTarget,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, `${year1}-${year2}`);
  });

  const urepRows = toSafeArray(calculation?.urepTable).map((row) => ({
    Category: row.category,
    'Active FY': row.activeFinancialYear,
    'Mandate %': row.mandatePercent,
    'Base Qty': row.baseQuantity,
    'UREP Target Qty': row.targetQuantity,
  }));
  if (urepRows.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(urepRows), 'UREP');
  }

  const warnings = toSafeArray(calculation?.warnings).map((warning) => ({
    Type: warning.type,
    Message: warning.message,
  }));
  if (warnings.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(warnings), 'Warnings');
  }

  return workbook;
}

function openPrintableReport(entityType, calculation) {
  const windowRef = window.open('', '_blank');
  if (!windowRef) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const renderTable = (table) => {
    const period = table?.period || {};
    const rows = toSafeArray(table?.rows);
    if (!rows.length) return '';

    const headers = entityType === 'producer'
      ? [
        'Category',
        `${period.year1} Sales`, `${period.year1} Pre`, `${period.year1} Total`,
        `${period.year2} Sales`, `${period.year2} Pre`, `${period.year2} Total`,
        'Average',
        `Registered Sales (${period.year2})`,
        `Recycled % (${period.year2})`,
        'Recycled Qty',
        `Virgin Target (${period.targetYear})`,
      ]
      : [
        'Category',
        `${period.year1} Total`,
        `${period.year2} Total`,
        'Average',
        `Recycled % (${period.year2})`,
        'Recycled Qty',
        `Target (${period.targetYear})`,
        `Virgin Target (${period.targetYear})`,
      ];

    const body = rows.map((row) => {
      const cells = entityType === 'producer'
        ? [
          row.category,
          row.year1?.salesQuantity, row.year1?.preConsumerQuantity, row.year1?.total,
          row.year2?.salesQuantity, row.year2?.preConsumerQuantity, row.year2?.total,
          row.average,
          row.registeredSalesYear2,
          row.recycledPlasticPercentYear2,
          row.recycledQuantity,
          row.virginTarget,
        ]
        : [
          row.category,
          row.year1Total,
          row.year2Total,
          row.average,
          row.recycledPlasticPercent,
          row.recycledQuantity,
          row.target,
          row.virginTarget,
        ];

      return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    }).join('');

    return `
      <h3>${escapeHtml(period.year1)} + ${escapeHtml(period.year2)} → ${escapeHtml(period.targetYear)}</h3>
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>EPR Target Report</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
          h1 { margin: 0 0 4px; }
          h2 { margin: 0 0 18px; font-size: 14px; font-weight: 700; color: #475569; }
          h3 { margin: 18px 0 8px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f1f5f9; font-weight: 800; }
          .warnings { margin-top: 18px; }
          .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 11px; font-weight: 800; }
        </style>
      </head>
      <body>
        <h1>EPR Target Calculation</h1>
        <h2><span class="pill">${escapeHtml(entityType)}</span></h2>
        ${toSafeArray(calculation?.targetTables).map(renderTable).join('')}
        <h3>UREP</h3>
        <table>
          <thead><tr><th>Category</th><th>Active FY</th><th>Mandate %</th><th>Base Qty</th><th>UREP Target Qty</th></tr></thead>
          <tbody>
            ${toSafeArray(calculation?.urepTable).map((row) => `
              <tr>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.activeFinancialYear)}</td>
                <td>${escapeHtml(row.mandatePercent)}</td>
                <td>${escapeHtml(row.baseQuantity)}</td>
                <td>${escapeHtml(row.targetQuantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${toSafeArray(calculation?.warnings).length ? `
          <div class="warnings">
            <h3>Warnings</h3>
            <ul>
              ${toSafeArray(calculation?.warnings).map((warning) => `<li>${escapeHtml(warning.message || warning.type)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <script>window.focus();</script>
      </body>
    </html>
  `;

  windowRef.document.open();
  windowRef.document.write(html);
  windowRef.document.close();
}

function TargetTable({ entityType, table }) {
  const period = table?.period || {};
  const rows = toSafeArray(table?.rows);
  if (!rows.length) return null;

  const columns = entityType === 'producer'
    ? [
      { key: 'category', label: 'Category' },
      { key: 'y1Sales', label: `${period.year1} Sales` },
      { key: 'y1Pre', label: `${period.year1} Pre` },
      { key: 'y1Total', label: `${period.year1} Total` },
      { key: 'y2Sales', label: `${period.year2} Sales` },
      { key: 'y2Pre', label: `${period.year2} Pre` },
      { key: 'y2Total', label: `${period.year2} Total` },
      { key: 'average', label: 'Average' },
      { key: 'registered', label: `Registered Sales (${period.year2})` },
      { key: 'recycledPercent', label: `Recycled % (${period.year2})` },
      { key: 'recycledQty', label: 'Recycled Qty' },
      { key: 'virgin', label: `Virgin Target (${period.targetYear})` },
    ]
    : [
      { key: 'category', label: 'Category' },
      { key: 'y1Total', label: `${period.year1} Total` },
      { key: 'y2Total', label: `${period.year2} Total` },
      { key: 'average', label: 'Average' },
      { key: 'recycledPercent', label: `Recycled % (${period.year2})` },
      { key: 'recycledQty', label: 'Recycled Qty' },
      { key: 'target', label: `Target (${period.targetYear})` },
      { key: 'virgin', label: `Virgin Target (${period.targetYear})` },
    ];

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Target Period</p>
          <p className="mt-1 text-sm font-extrabold text-slate-950">
            {period.year1} + {period.year2} → {period.targetYear}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left">
          <thead className="border-b border-slate-200 bg-white text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.map((row) => (
              <tr key={row.category} className="bg-white transition hover:bg-slate-50">
                <td className="px-4 py-3 font-extrabold text-slate-950">{row.category}</td>
                {entityType === 'producer' ? (
                  <>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year1?.salesQuantity, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year1?.preConsumerQuantity, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year1?.total, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year2?.salesQuantity, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year2?.preConsumerQuantity, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year2?.total, 4)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-950">{formatNumber(row.average, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.registeredSalesYear2, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.recycledPlasticPercentYear2, 2)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.recycledQuantity, 4)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-950">{formatNumber(row.virginTarget, 4)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year1Total, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.year2Total, 4)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-950">{formatNumber(row.average, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.recycledPlasticPercent, 2)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.recycledQuantity, 4)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.target, 4)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-950">{formatNumber(row.virginTarget, 4)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UrepTable({ rows }) {
  const items = toSafeArray(rows);
  if (!items.length) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">UREP</p>
        <p className="mt-1 text-sm font-extrabold text-slate-950">Mandate based target</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left">
          <thead className="border-b border-slate-200 bg-white text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Active FY</th>
              <th className="px-4 py-3">Mandate %</th>
              <th className="px-4 py-3">Base Qty</th>
              <th className="px-4 py-3">UREP Target Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((row) => (
              <tr key={row.category} className="bg-white transition hover:bg-slate-50">
                <td className="px-4 py-3 font-extrabold text-slate-950">{row.category}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{row.activeFinancialYear || '-'}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.mandatePercent, 2)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.baseQuantity, 4)}</td>
                <td className="px-4 py-3 font-extrabold text-slate-950">{formatNumber(row.targetQuantity, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WarningList({ warnings }) {
  const items = toSafeArray(warnings);
  if (!items.length) return null;
  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertOctagon className="mt-0.5 h-4 w-4" />
        <div className="space-y-1">
          <p className="font-extrabold">Warnings</p>
          <ul className="list-disc space-y-1 pl-5 font-semibold">
            {items.slice(0, 8).map((warning, index) => (
              <li key={`${warning.type}-${index}`}>{warning.message || warning.type}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EprTargetCalculationPanel({ ccpClientId, entityType = 'producer', title }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculation, setCalculation] = useState(null);

  const resolvedTitle = title || (entityType === 'producer' ? 'Producer EPR Target' : 'Brand Owner EPR Target');

  const refresh = async () => {
    if (!ccpClientId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/epr-target/${encodeURIComponent(ccpClientId)}`, {
        params: { entityType },
      });
      const payload = response.data?.calculation || {};
      setCalculation(payload?.[entityType] || null);
    } catch (requestError) {
      setCalculation(null);
      setError(requestError.response?.data?.message || 'Unable to load EPR target calculation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [ccpClientId, entityType]);

  const targets = useMemo(() => toSafeArray(calculation?.targetTables), [calculation]);

  const downloadExcel = () => {
    if (!calculation) return;
    const workbook = buildWorkbook(entityType, calculation);
    XLSX.writeFile(workbook, `EPR_Target_${entityType}_${ccpClientId}.xlsx`);
  };

  const printReport = () => {
    if (!calculation) return;
    openPrintableReport(entityType, calculation);
  };

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">EPR Target Calculation</p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-950">{resolvedTitle}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Values are calculated in the backend and shown here for audit consistency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={downloadExcel}
            disabled={!calculation}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={printReport}
            disabled={!calculation}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#30525C] px-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#274751] disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          Calculating...
        </div>
      ) : null}

      {!loading && !error && calculation && !targets.length ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          Upload at least two financial years of data to see the target tables.
        </div>
      ) : null}

      {targets.map((table) => (
        <TargetTable key={`${table?.period?.year1}-${table?.period?.year2}`} entityType={entityType} table={table} />
      ))}

      <UrepTable rows={calculation?.urepTable} />
      <WarningList warnings={calculation?.warnings} />
    </section>
  );
}

export default EprTargetCalculationPanel;

