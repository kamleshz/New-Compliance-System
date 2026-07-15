import ClientPortalDataUpload from '../models/ClientPortalDataUpload.js';
import { calculateEprTargets, DEFAULT_OPTIONS } from '../services/eprTargetCalculationService.js';

function normalizeOption(value) {
  return String(value || '').trim();
}

function resolveRecycledPercentageMethod(value) {
  const normalized = normalizeOption(value).toUpperCase();
  if (normalized === 'WEIGHTED_AVERAGE') return 'WEIGHTED_AVERAGE';
  return 'SUM';
}

function resolveNegativeTargetHandling(value) {
  const normalized = normalizeOption(value).toUpperCase();
  if (normalized === 'CLAMP_TO_ZERO') return 'CLAMP_TO_ZERO';
  return 'PRESERVE';
}

function collectRows(record = {}) {
  const brandOwnerRows = [];
  const producerSalesRows = [];
  const producerPreConsumerRows = [];

  const financialYears = record.financialYears instanceof Map
    ? Object.fromEntries(record.financialYears)
    : (record.financialYears || {});

  Object.entries(financialYears).forEach(([financialYear, yearRecord]) => {
    const prePostRows = yearRecord?.prePost?.portalUpload?.rows || [];
    prePostRows.forEach((row) => brandOwnerRows.push({ ...row, __fallbackFinancialYear: financialYear }));

    const producerSales = yearRecord?.eprTarget?.baseData?.rows || [];
    producerSales.forEach((row) => producerSalesRows.push({ ...row, __fallbackFinancialYear: financialYear }));

    const producerPre = yearRecord?.eprTarget?.portalUpload?.rows || [];
    producerPre.forEach((row) => producerPreConsumerRows.push({ ...row, __fallbackFinancialYear: financialYear }));
  });

  const rootPrePost = record?.prePost?.portalUpload?.rows || [];
  rootPrePost.forEach((row) => brandOwnerRows.push({ ...row, __fallbackFinancialYear: record?.activeFinancialYear || '' }));

  const rootSales = record?.eprTarget?.baseData?.rows || [];
  rootSales.forEach((row) => producerSalesRows.push({ ...row, __fallbackFinancialYear: record?.activeFinancialYear || '' }));

  const rootPreConsumer = record?.eprTarget?.portalUpload?.rows || [];
  rootPreConsumer.forEach((row) => producerPreConsumerRows.push({ ...row, __fallbackFinancialYear: record?.activeFinancialYear || '' }));

  return { brandOwnerRows, producerSalesRows, producerPreConsumerRows };
}

export const getEprTargetCalculation = async (req, res, next) => {
  try {
    const record = await ClientPortalDataUpload.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    if (!record) {
      return res.json({
        ok: true,
        exists: false,
        ccpClientId: req.params.ccpClientId,
        calculation: {},
      });
    }

    const options = {
      ...DEFAULT_OPTIONS,
      recycledPercentageMethod: resolveRecycledPercentageMethod(req.query?.recycledPercentageMethod),
      negativeTargetHandling: resolveNegativeTargetHandling(req.query?.negativeTargetHandling),
    };

    const { brandOwnerRows, producerSalesRows, producerPreConsumerRows } = collectRows(record);
    const calculation = calculateEprTargets({
      brandOwnerRows,
      producerSalesRows,
      producerPreConsumerRows,
      options,
    });

    const persist = normalizeOption(req.query?.persist) !== 'false';
    if (persist) {
      await ClientPortalDataUpload.updateOne(
        { ccpClientId: req.params.ccpClientId },
        {
          $set: {
            eprTargetCalculation: calculation,
            eprTargetCalculationOptions: options,
            eprTargetCalculationUpdatedAt: new Date(),
          },
        },
      );
    }

    const entityType = normalizeOption(req.query?.entityType);
    const selection = entityType === 'producer'
      ? { producer: calculation.producer }
      : entityType === 'brandOwner'
        ? { brandOwner: calculation.brandOwner }
        : calculation;

    res.json({
      ok: true,
      exists: true,
      ccpClientId: req.params.ccpClientId,
      calculation: selection,
      calculationOptions: options,
    });
  } catch (error) {
    next(error);
  }
};

