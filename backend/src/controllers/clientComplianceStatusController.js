import ClientComplianceStatus from '../models/ClientComplianceStatus.js';

export const defaultComplianceStatusRows = [
  'Purchase data upload',
  'Sales data upload With all invoices',
  'Pre Consumer upload',
  'Statewise upload',
  'Annual Consumption upload',
  'Cat I Subcategory qutnity to be checked',
  'Export data received and upload',
  'EPR Credit received in wallet',
  'EPR Credit transfer to Annual filing tab (All remarks to be closed)',
  'GST 1 and GST2A Upload (In case of Importer)',
  'Reuse plan upload (Incase Of BrandOwner',
  'Take All Screenshots (Home page target, Wallet,Credit transfer, State wise for current year, Annual consumption, Annual filing page before submitting and after submitting)',
  'Additional Remarks',
].map((complianceStatus, index) => ({
  sr: index + 1,
  complianceStatus,
  status: index === 0 ? 'Complete' : '',
  startDate: '',
  endDate: '',
  userRemarks: [],
  managerRemarks: [],
  complianceRemarks: [],
}));

const remarkFields = ['userRemarks', 'managerRemarks', 'complianceRemarks'];

const normalizeRemarks = (value) => {
  if (Array.isArray(value)) {
    return value.map((remark) => String(remark || '').trim()).filter(Boolean);
  }

  if (value === null || value === undefined || value === '') return [];
  return [String(value).trim()].filter(Boolean);
};

const normalizeRow = (row) => remarkFields.reduce((normalizedRow, field) => ({
  ...normalizedRow,
  [field]: normalizeRemarks(normalizedRow[field]),
}), { ...row });

const mergeRows = (savedRows = []) => defaultComplianceStatusRows.map((defaultRow) => {
  const savedRow = savedRows.find((row) => row.sr === defaultRow.sr);
  return normalizeRow(savedRow ? { ...defaultRow, ...savedRow } : defaultRow);
});

export const getClientComplianceStatus = async (req, res, next) => {
  try {
    const record = await ClientComplianceStatus.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const financialYear = normalizeFinancialYear(req.query?.financialYear);
    if (financialYear) {
      const yearRecord = getFinancialYearEntry(record, financialYear);
      if (!yearRecord) {
        return res.json({
          ok: true,
          exists: false,
          financialYear,
          rows: mergeRows([]),
          updatedAt: null,
        });
      }
      return res.json({
        ok: true,
        exists: true,
        financialYear,
        rows: mergeRows(yearRecord?.rows),
        updatedAt: yearRecord?.updatedAt || null,
      });
    }

    res.json({
      ok: true,
      rows: mergeRows(record?.rows),
      updatedAt: record?.updatedAt || null,
    });
  } catch (error) {
    next(error);
  }
};

export const saveClientComplianceStatus = async (req, res, next) => {
  try {
    const financialYear = normalizeFinancialYear(req.body?.financialYear);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const normalizedRows = mergeRows(rows);
    const existingRecord = await ClientComplianceStatus.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const nextFinancialYears = {
      ...(existingRecord?.financialYears || {}),
      ...(financialYear ? {
        [financialYear]: {
          rows: normalizedRows,
          updatedAt: new Date(),
          updatedBy: req.user?.id,
        },
      } : {}),
    };

    const record = await ClientComplianceStatus.findOneAndUpdate(
      { ccpClientId: req.params.ccpClientId },
      {
        ccpClientId: req.params.ccpClientId,
        rows: normalizedRows,
        financialYears: nextFinancialYears,
        activeFinancialYear: financialYear || existingRecord?.activeFinancialYear || '',
        updatedBy: req.user?.id,
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    const savedYearRecord = financialYear ? getFinancialYearEntry(record, financialYear) : null;
    res.json({
      ok: true,
      financialYear: financialYear || '',
      rows: financialYear ? mergeRows(savedYearRecord?.rows) : record.rows,
      updatedAt: financialYear ? savedYearRecord?.updatedAt || record.updatedAt : record.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

function normalizeFinancialYear(value) {
  return String(value || '').trim();
}

function getFinancialYearEntry(record, financialYear) {
  if (!record || !financialYear) return null;
  const financialYears = record.financialYears instanceof Map
    ? Object.fromEntries(record.financialYears)
    : (record.financialYears || {});
  return financialYears[financialYear] || null;
}
