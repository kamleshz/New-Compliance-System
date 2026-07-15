import ClientPortalAsset from '../models/ClientPortalAsset.js';

export const getClientPortalAsset = async (req, res, next) => {
  try {
    const record = await ClientPortalAsset.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const financialYear = normalizeFinancialYear(req.query?.financialYear);
    if (financialYear) {
      const yearRecord = getFinancialYearEntry(record, financialYear);
      if (!yearRecord) {
        return res.json({
          ok: true,
          exists: false,
          financialYear,
          portalAsset: {
            ccpClientId: req.params.ccpClientId,
            financialYear,
            email: '',
            images: [],
          },
        });
      }
      return res.json({
        ok: true,
        exists: true,
        financialYear,
        portalAsset: {
          ccpClientId: req.params.ccpClientId,
          financialYear,
          email: yearRecord?.email || '',
          images: Array.isArray(yearRecord?.images) ? yearRecord.images : [],
        },
      });
    }

    res.json({
      ok: true,
      portalAsset: record || {
        ccpClientId: req.params.ccpClientId,
        email: '',
        images: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveClientPortalAsset = async (req, res, next) => {
  try {
    const financialYear = normalizeFinancialYear(req.body?.financialYear);
    const existingRecord = await ClientPortalAsset.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const nextAsset = {
      email: req.body?.email || '',
      images: Array.isArray(req.body?.images) ? req.body.images : [],
      updatedAt: new Date(),
      updatedBy: req.user?.id,
    };
    const nextFinancialYears = {
      ...(existingRecord?.financialYears || {}),
      ...(financialYear ? { [financialYear]: nextAsset } : {}),
    };
    const record = await ClientPortalAsset.findOneAndUpdate(
      { ccpClientId: req.params.ccpClientId },
      {
        ccpClientId: req.params.ccpClientId,
        email: nextAsset.email,
        images: nextAsset.images,
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
      portalAsset: financialYear ? {
        ccpClientId: req.params.ccpClientId,
        financialYear,
        email: savedYearRecord?.email || '',
        images: Array.isArray(savedYearRecord?.images) ? savedYearRecord.images : [],
      } : record,
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
