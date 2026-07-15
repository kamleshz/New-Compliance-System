const FORMULA_VERSION = 'epr-target-v1';

export const PLASTIC_CATEGORIES = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV', 'Cat-V'];

export const DEFAULT_OPTIONS = Object.freeze({
  recycledPercentageMethod: 'SUM',
  negativeTargetHandling: 'PRESERVE',
});

export const UREP_MANDATE_MATRIX = Object.freeze({
  '2025-26': { 'Cat-I': 30, 'Cat-II': 10, 'Cat-III': 5, 'Cat-IV': 0, 'Cat-V': 0 },
  '2026-27': { 'Cat-I': 40, 'Cat-II': 10, 'Cat-III': 5, 'Cat-IV': 0, 'Cat-V': 0 },
  '2027-28': { 'Cat-I': 50, 'Cat-II': 20, 'Cat-III': 10, 'Cat-IV': 0, 'Cat-V': 0 },
  '2028-29': { 'Cat-I': 60, 'Cat-II': 20, 'Cat-III': 10, 'Cat-IV': 0, 'Cat-V': 0 },
});

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toTrimmedString(value) {
  return String(value ?? '').trim();
}

function parseDecimal(value, { fieldLabel, warnings, rowRef } = {}) {
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, '');
  const numeric = Number.parseFloat(normalized);
  if (Number.isFinite(numeric)) return numeric;
  if (warnings && fieldLabel) {
    warnings.push({
      type: 'invalid_quantity',
      message: `Invalid numeric value for ${fieldLabel}; treated as 0.`,
      rowRef,
      value: raw,
    });
  }
  return 0;
}

function parsePercent(value, { fieldLabel, warnings, rowRef } = {}) {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const normalized = raw.replace(/%/g, '').replace(/,/g, '');
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) {
    if (warnings && fieldLabel) {
      warnings.push({
        type: 'invalid_percentage',
        message: `Invalid percentage value for ${fieldLabel}; ignored.`,
        rowRef,
        value: raw,
      });
    }
    return null;
  }
  if (numeric < 0 || numeric > 100) {
    warnings?.push({
      type: 'percentage_out_of_range',
      message: `Percentage for ${fieldLabel} is outside 0-100 range.`,
      rowRef,
      value: numeric,
    });
  }
  return numeric;
}

function normalizeLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickValue(row, candidates = []) {
  if (!row || typeof row !== 'object') return undefined;
  const lowerMap = new Map();
  Object.entries(row).forEach(([key, val]) => lowerMap.set(normalizeLabel(key), val));
  for (const candidate of candidates) {
    const direct = lowerMap.get(normalizeLabel(candidate));
    if (direct !== undefined) return direct;
  }
  return undefined;
}

export function normalizePlasticCategory(rawValue) {
  const raw = toTrimmedString(rawValue);
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  const hasAny = (patterns) => patterns.some((pattern) => pattern.test(normalized));

  const checks = [
    ['Cat-V', [
      /\bcat\s*[- ]?\s*v\b/,
      /\bcategory\s*v\b/,
      /\bcategory\s*5\b/,
      /\bcat\s*5\b/,
      /\bcatv\b/,
    ]],
    ['Cat-IV', [
      /\bcat\s*[- ]?\s*iv\b/,
      /\bcategory\s*iv\b/,
      /\bcategory\s*4\b/,
      /\bcat\s*4\b/,
      /\bcativ\b/,
      /\bcompostable\b/,
    ]],
    ['Cat-III', [
      /\bcat\s*[- ]?\s*iii\b/,
      /\bcategory\s*iii\b/,
      /\bcategory\s*3\b/,
      /\bcat\s*3\b/,
      /\bcatiii\b/,
      /\bmultilayered\b/,
      /\bmlp\b/,
    ]],
    ['Cat-II', [
      /\bcat\s*[- ]?\s*ii\b/,
      /\bcategory\s*ii\b/,
      /\bcategory\s*2\b/,
      /\bcat\s*2\b/,
      /\bcatii\b/,
      /\bflexible\b/,
    ]],
    ['Cat-I', [
      /\bcat\s*[- ]?\s*i\b/,
      /\bcategory\s*i\b/,
      /\bcategory\s*1\b/,
      /\bcat\s*1\b/,
      /\bcati\b/,
      /\brig(id)?\b/,
    ]],
  ];

  for (const [category, patterns] of checks) {
    if (hasAny(patterns)) return category;
  }
  return null;
}

export function normalizeFinancialYear(rawValue) {
  const raw = toTrimmedString(rawValue);
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  return `${match[1]}-${match[2]}`;
}

export function compareFinancialYears(first, second) {
  const firstYear = Number.parseInt(String(first).slice(0, 4), 10) || 0;
  const secondYear = Number.parseInt(String(second).slice(0, 4), 10) || 0;
  return firstYear - secondYear;
}

export function nextFinancialYear(financialYear) {
  const match = String(financialYear || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  const nextStart = start + 1;
  const nextEnd = (end + 1) % 100;
  return `${nextStart}-${String(nextEnd).padStart(2, '0')}`;
}

function buildTargetPeriods(financialYears = []) {
  const years = [...new Set(financialYears.filter(Boolean))].sort(compareFinancialYears);
  const periods = [];
  for (let index = 0; index < years.length - 1; index += 1) {
    const year1 = years[index];
    const year2 = years[index + 1];
    const targetYear = years[index + 2] || nextFinancialYear(year2);
    periods.push({ year1, year2, targetYear });
  }
  return { years, periods };
}

function ensureCategoryMap() {
  return PLASTIC_CATEGORIES.reduce((acc, category) => {
    acc[category] = {};
    return acc;
  }, {});
}

function ensureYearCategoryBucket(map, category, year, createBucket) {
  if (!map[category]) map[category] = {};
  if (!map[category][year]) map[category][year] = createBucket();
  return map[category][year];
}

function formatDisplay(value, digits) {
  return roundTo(value, digits);
}

function attachRejectedRow(rejectedRows, dataset, rowIndex, reason, row) {
  rejectedRows.push({
    dataset,
    rowIndex,
    reason,
    row,
  });
}

function summarizeCounts(items = []) {
  return {
    sourceRows: items.length,
  };
}

function buildMetadata({ options, counts, acceptedRows, rejectedRows }) {
  return {
    formulaVersion: FORMULA_VERSION,
    recycledPercentageMethod: options.recycledPercentageMethod,
    negativeTargetHandling: options.negativeTargetHandling,
    generatedAt: new Date().toISOString(),
    sourceRowCounts: counts,
    acceptedRowCounts: acceptedRows,
    rejectedRowCounts: rejectedRows,
  };
}

function resolveRowYear(row, fallbackYear, warnings, rejectedRows, dataset, rowIndex) {
  const rawYear = pickValue(row, ['financialYear', 'financial year', 'year', 'fy']) ?? row?.__fallbackFinancialYear;
  const normalized = normalizeFinancialYear(rawYear || fallbackYear);
  if (!normalized) {
    warnings.push({
      type: 'invalid_financial_year',
      message: 'Invalid financial year format; row ignored.',
      rowRef: { dataset, rowIndex },
      value: rawYear,
    });
    attachRejectedRow(rejectedRows, dataset, rowIndex, 'invalid_financial_year', row);
    return '';
  }
  return normalized;
}

function resolveRowCategory(row, warnings, rejectedRows, dataset, rowIndex) {
  const rawCategory = pickValue(row, ['plasticCategory', 'plastic category', 'category of plastic', 'category', 'category of plastic type'])
    ?? row?.plasticCategory
    ?? row?.category;
  const normalized = normalizePlasticCategory(rawCategory);
  if (!normalized) {
    warnings.push({
      type: 'unrecognized_category',
      message: 'Unrecognized plastic category; row ignored.',
      rowRef: { dataset, rowIndex },
      value: rawCategory,
    });
    attachRejectedRow(rejectedRows, dataset, rowIndex, 'unrecognized_category', row);
    return null;
  }
  return normalized;
}

export function calculateBrandOwnerTargets(prePostRows = [], optionsInput = {}) {
  const options = { ...DEFAULT_OPTIONS, ...(optionsInput || {}) };
  const warnings = [];
  const rejectedRows = [];

  const annual = ensureCategoryMap();
  const yearTotals = ensureCategoryMap();
  const recycledSumPercent = ensureCategoryMap();
  const recycledWeighted = ensureCategoryMap();

  const acceptedRowCount = { prePost: 0 };

  prePostRows.forEach((row, rowIndex) => {
    const category = resolveRowCategory(row, warnings, rejectedRows, 'prePost', rowIndex);
    if (!category) return;
    const year = resolveRowYear(row, row?.__fallbackFinancialYear, warnings, rejectedRows, 'prePost', rowIndex);
    if (!year) return;

    const preQty = parseDecimal(pickValue(row, [
      'preConsumerWastePlasticQuantity',
      'pre consumer waste plastic quantity',
      'pre consumer waste plastic quantity (tpa)',
      'pre consumer quantity (tpa)',
      'pre consumer',
      'preConsumerQty',
      'pre consumer qty',
    ]), { fieldLabel: 'pre-consumer quantity', warnings, rowRef: { dataset: 'prePost', rowIndex } });

    const postQty = parseDecimal(pickValue(row, [
      'postConsumerWastePlasticQuantity',
      'post consumer waste plastic quantity',
      'post consumer waste plastic quantity (tpa)',
      'post consumer quantity (tpa)',
      'post consumer',
      'postConsumerQty',
      'post consumer qty',
    ]), { fieldLabel: 'post-consumer quantity', warnings, rowRef: { dataset: 'prePost', rowIndex } });

    parseDecimal(pickValue(row, [
      'exportQuantity',
      'export quantity',
      'export',
      'export quantity plastic quantity (tpa)',
      'export quantity (tpa)',
      'export plastic quantity (tpa)',
    ]), { fieldLabel: 'export quantity', warnings, rowRef: { dataset: 'prePost', rowIndex } });

    const prePct = parsePercent(pickValue(row, [
      'preConsumerWasteRecycledPlasticPercent',
      'pre consumer waste recycled plastic %',
      'pre consumer waste recycled plastic percent',
      'pre consumer recycled plastic %',
      'pre consumer waste recycled %',
    ]), { fieldLabel: 'pre-consumer recycled %', warnings, rowRef: { dataset: 'prePost', rowIndex } });

    const postPct = parsePercent(pickValue(row, [
      'postConsumerWasteRecycledPlasticPercent',
      'post consumer waste recycled plastic %',
      'post consumer waste recycled plastic percent',
      'post consumer recycled plastic %',
      'post consumer waste recycled %',
    ]), { fieldLabel: 'post-consumer recycled %', warnings, rowRef: { dataset: 'prePost', rowIndex } });

    const bucket = ensureYearCategoryBucket(annual, category, year, () => ({ pre: 0, post: 0 }));
    bucket.pre += preQty;
    bucket.post += postQty;

    const totalBucket = ensureYearCategoryBucket(yearTotals, category, year, () => ({ total: 0 }));
    totalBucket.total += (preQty + postQty);

    if (options.recycledPercentageMethod === 'SUM') {
      const pctBucket = ensureYearCategoryBucket(recycledSumPercent, category, year, () => ({ prePct: 0, postPct: 0 }));
      pctBucket.prePct += prePct ?? 0;
      pctBucket.postPct += postPct ?? 0;
    } else {
      const weightedBucket = ensureYearCategoryBucket(recycledWeighted, category, year, () => ({ recycledQty: 0, totalQty: 0 }));
      weightedBucket.totalQty += (preQty + postQty);
      if (prePct !== null) weightedBucket.recycledQty += preQty * (prePct / 100);
      if (postPct !== null) weightedBucket.recycledQty += postQty * (postPct / 100);
    }

    acceptedRowCount.prePost += 1;
  });

  const yearsFromRows = [];
  PLASTIC_CATEGORIES.forEach((category) => {
    Object.keys(yearTotals[category] || {}).forEach((year) => yearsFromRows.push(year));
  });

  const { years, periods } = buildTargetPeriods(yearsFromRows);
  if (years.length < 2) {
    warnings.push({
      type: 'insufficient_financial_years',
      message: 'At least two financial years are required for normal EPR target calculation.',
    });
  }

  const targetTables = periods.map(({ year1, year2, targetYear }) => ({
    period: { year1, year2, targetYear },
    rows: PLASTIC_CATEGORIES.map((category) => {
      const year1Total = (yearTotals[category]?.[year1]?.total) || 0;
      const year2Total = (yearTotals[category]?.[year2]?.total) || 0;
      const average = (year1Total + year2Total) / 2;

      let recycledPercent = 0;
      if (options.recycledPercentageMethod === 'SUM') {
        const pctRow = recycledSumPercent[category]?.[year2] || { prePct: 0, postPct: 0 };
        recycledPercent = (pctRow.prePct || 0) + (pctRow.postPct || 0);
        if (recycledPercent > 100) {
          warnings.push({
            type: 'summed_recycled_percentage_above_100',
            message: `Summed recycled percentage exceeds 100% for ${category} (${year2}).`,
          });
        }
      } else {
        const weighted = recycledWeighted[category]?.[year2] || { recycledQty: 0, totalQty: 0 };
        recycledPercent = weighted.totalQty ? (weighted.recycledQty / weighted.totalQty) * 100 : 0;
      }

      const recycledQty = average * (recycledPercent / 100);
      const virginTarget = average - recycledQty;

      if (virginTarget < 0) {
        warnings.push({
          type: 'negative_target',
          message: `Calculated virgin target is negative for ${category} (${targetYear}).`,
        });
      }

      return {
        category,
        year1Total: formatDisplay(year1Total, 4),
        year2Total: formatDisplay(year2Total, 4),
        average: formatDisplay(average, 4),
        recycledPlasticPercent: formatDisplay(recycledPercent, 2),
        recycledQuantity: formatDisplay(recycledQty, 4),
        targetYear,
        target: formatDisplay(average, 4),
        virginTarget: formatDisplay(virginTarget, 4),
        intermediates: {
          year1Total,
          year2Total,
          average,
          recycledPercent,
          recycledQty,
          virginTarget,
        },
      };
    }),
  }));

  const latestYear = years.at(-1) || '';
  if (!latestYear) {
    warnings.push({
      type: 'insufficient_financial_years',
      message: 'UREP calculation requires at least one financial year.',
    });
  }

  const mandateByCategory = UREP_MANDATE_MATRIX[latestYear] || null;
  if (latestYear && !mandateByCategory) {
    warnings.push({
      type: 'urep_mandate_missing',
      message: `No UREP mandate configured for active financial year ${latestYear}.`,
    });
  }

  const urepTable = latestYear ? PLASTIC_CATEGORIES.map((category) => {
    const yearBucket = annual[category]?.[latestYear] || { pre: 0, post: 0 };
    const baseQty = (yearBucket.pre || 0) + (yearBucket.post || 0);
    const mandatePercent = mandateByCategory?.[category] ?? 0;
    const urepTarget = baseQty * (mandatePercent / 100);

    return {
      category,
      activeFinancialYear: latestYear,
      mandatePercent: formatDisplay(mandatePercent, 2),
      baseQuantity: formatDisplay(baseQty, 4),
      targetQuantity: formatDisplay(urepTarget, 4),
      intermediates: {
        baseQty,
        mandatePercent,
        urepTarget,
      },
    };
  }) : [];

  return {
    entityType: 'brandOwner',
    financialYears: years,
    categories: PLASTIC_CATEGORIES,
    targetTables,
    urepTable,
    warnings,
    rejectedRows,
    calculationMetadata: buildMetadata({
      options,
      counts: { ...summarizeCounts(prePostRows) },
      acceptedRows: acceptedRowCount,
      rejectedRows: { total: rejectedRows.length },
    }),
  };
}

function producerRegistrationQualifies(row) {
  const regType = normalizeLabel(pickValue(row, ['registrationType', 'registration type', 'registration']) ?? row?.registrationType);
  if (!regType.includes('registered')) return false;
  if (regType.includes('unregistered')) return false;
  const uploadStatusRaw = pickValue(row, ['uploadStatus', 'upload status', 'status']) ?? row?.uploadStatus;
  const status = normalizeLabel(uploadStatusRaw);
  return status === '' || status === 'completed';
}

export function calculateProducerTargets({ salesRows = [], preConsumerRows = [] } = {}, optionsInput = {}) {
  const options = { ...DEFAULT_OPTIONS, ...(optionsInput || {}) };
  const warnings = [];
  const rejectedRows = [];

  const salesByYear = ensureCategoryMap();
  const preConsumerByYear = ensureCategoryMap();
  const registeredSalesByYear = ensureCategoryMap();
  const recycledPercentSum = ensureCategoryMap();
  const recycledWeighted = ensureCategoryMap();

  const acceptedRowCount = { sales: 0, preConsumer: 0 };

  salesRows.forEach((row, rowIndex) => {
    const category = resolveRowCategory(row, warnings, rejectedRows, 'sales', rowIndex);
    if (!category) return;
    const year = resolveRowYear(row, row?.__fallbackFinancialYear, warnings, rejectedRows, 'sales', rowIndex);
    if (!year) return;

    const qty = parseDecimal(pickValue(row, [
      'totalPlasticQty',
      'total plastic qty',
      'total plastic qty (tons)',
      'total plastic qty (ton)',
      'total plastic qty (tpa)',
      'total plastic qty (tpa) (tons)',
      'total plastic qty (tons)',
      'quantity',
    ]), { fieldLabel: 'sales quantity', warnings, rowRef: { dataset: 'sales', rowIndex } });

    const salesBucket = ensureYearCategoryBucket(salesByYear, category, year, () => ({ total: 0 }));
    salesBucket.total += qty;

    const qualifies = producerRegistrationQualifies(row);
    if (qualifies) {
      const regBucket = ensureYearCategoryBucket(registeredSalesByYear, category, year, () => ({ total: 0 }));
      regBucket.total += qty;
    }

    const pct = parsePercent(pickValue(row, [
      'recycledPlasticPercent',
      'recycled plastic percent',
      'recycled plastic %',
      'recycledPlastic%',
      'recycledPlastic %',
    ]), { fieldLabel: 'recycled plastic %', warnings, rowRef: { dataset: 'sales', rowIndex } });

    if (qualifies) {
      if (options.recycledPercentageMethod === 'SUM') {
        const pctBucket = ensureYearCategoryBucket(recycledPercentSum, category, year, () => ({ sum: 0 }));
        if (pct !== null) pctBucket.sum += pct;
      } else {
        const weightedBucket = ensureYearCategoryBucket(recycledWeighted, category, year, () => ({ recycledQty: 0, totalQty: 0 }));
        weightedBucket.totalQty += qty;
        if (pct !== null) weightedBucket.recycledQty += qty * (pct / 100);
      }
    }

    acceptedRowCount.sales += 1;
  });

  preConsumerRows.forEach((row, rowIndex) => {
    const category = resolveRowCategory(row, warnings, rejectedRows, 'preConsumer', rowIndex);
    if (!category) return;
    const year = resolveRowYear(row, row?.__fallbackFinancialYear, warnings, rejectedRows, 'preConsumer', rowIndex);
    if (!year) return;

    const qty = parseDecimal(pickValue(row, [
      'preConsumerQty',
      'pre consumer qty',
      'preConsumerWastePlasticQuantity',
      'pre consumer waste plastic quantity',
      'pre consumer waste plastic quantity (tpa)',
      'pre consumer quantity (tpa)',
      'pre consumer',
      'quantity',
    ]), { fieldLabel: 'pre-consumer quantity', warnings, rowRef: { dataset: 'preConsumer', rowIndex } });

    const bucket = ensureYearCategoryBucket(preConsumerByYear, category, year, () => ({ total: 0 }));
    bucket.total += qty;
    acceptedRowCount.preConsumer += 1;
  });

  const yearsFromRows = [];
  PLASTIC_CATEGORIES.forEach((category) => {
    Object.keys(salesByYear[category] || {}).forEach((year) => yearsFromRows.push(year));
    Object.keys(preConsumerByYear[category] || {}).forEach((year) => yearsFromRows.push(year));
  });

  const { years, periods } = buildTargetPeriods(yearsFromRows);
  if (years.length < 2) {
    warnings.push({
      type: 'insufficient_financial_years',
      message: 'At least two financial years are required for normal EPR target calculation.',
    });
  }

  const targetTables = periods.map(({ year1, year2, targetYear }) => ({
    period: { year1, year2, targetYear },
    rows: PLASTIC_CATEGORIES.map((category) => {
      const y1Sales = salesByYear[category]?.[year1]?.total || 0;
      const y1Pre = preConsumerByYear[category]?.[year1]?.total || 0;
      const y2Sales = salesByYear[category]?.[year2]?.total || 0;
      const y2Pre = preConsumerByYear[category]?.[year2]?.total || 0;
      const y1Total = y1Sales + y1Pre;
      const y2Total = y2Sales + y2Pre;
      const average = (y1Total + y2Total) / 2;

      const registeredSales = registeredSalesByYear[category]?.[year2]?.total || 0;

      let recycledPercent = 0;
      if (options.recycledPercentageMethod === 'SUM') {
        recycledPercent = recycledPercentSum[category]?.[year2]?.sum || 0;
        if (recycledPercent > 100) {
          warnings.push({
            type: 'summed_recycled_percentage_above_100',
            message: `Summed recycled percentage exceeds 100% for ${category} (${year2}).`,
          });
        }
      } else {
        const weighted = recycledWeighted[category]?.[year2] || { recycledQty: 0, totalQty: 0 };
        recycledPercent = weighted.totalQty ? (weighted.recycledQty / weighted.totalQty) * 100 : 0;
      }

      const recycledQty = average * (recycledPercent / 100);
      let virginTarget = average - registeredSales - recycledQty;
      const negative = virginTarget < 0;
      if (negative) {
        warnings.push({
          type: 'negative_target',
          message: `Registered-sales and recycled-content deductions exceed the calculated average for ${category} (${targetYear}).`,
        });
        if (options.negativeTargetHandling === 'CLAMP_TO_ZERO') virginTarget = 0;
      }

      return {
        category,
        year1: {
          salesQuantity: formatDisplay(y1Sales, 4),
          preConsumerQuantity: formatDisplay(y1Pre, 4),
          total: formatDisplay(y1Total, 4),
          intermediates: { sales: y1Sales, preConsumer: y1Pre, total: y1Total },
        },
        year2: {
          salesQuantity: formatDisplay(y2Sales, 4),
          preConsumerQuantity: formatDisplay(y2Pre, 4),
          total: formatDisplay(y2Total, 4),
          intermediates: { sales: y2Sales, preConsumer: y2Pre, total: y2Total },
        },
        average: formatDisplay(average, 4),
        registeredSalesYear2: formatDisplay(registeredSales, 4),
        recycledPlasticPercentYear2: formatDisplay(recycledPercent, 2),
        recycledQuantity: formatDisplay(recycledQty, 4),
        targetYear,
        virginTarget: formatDisplay(virginTarget, 4),
        intermediates: {
          average,
          registeredSales,
          recycledPercent,
          recycledQty,
          virginTarget,
        },
      };
    }),
  }));

  const latestYear = years.at(-1) || '';
  if (!latestYear) {
    warnings.push({
      type: 'insufficient_financial_years',
      message: 'UREP calculation requires at least one financial year.',
    });
  }

  const mandateByCategory = UREP_MANDATE_MATRIX[latestYear] || null;
  if (latestYear && !mandateByCategory) {
    warnings.push({
      type: 'urep_mandate_missing',
      message: `No UREP mandate configured for active financial year ${latestYear}.`,
    });
  }

  const urepTable = latestYear ? PLASTIC_CATEGORIES.map((category) => {
    const sales = salesByYear[category]?.[latestYear]?.total || 0;
    const pre = preConsumerByYear[category]?.[latestYear]?.total || 0;
    const baseQty = sales + pre;
    const mandatePercent = mandateByCategory?.[category] ?? 0;
    const urepTarget = baseQty * (mandatePercent / 100);

    return {
      category,
      activeFinancialYear: latestYear,
      mandatePercent: formatDisplay(mandatePercent, 2),
      baseQuantity: formatDisplay(baseQty, 4),
      targetQuantity: formatDisplay(urepTarget, 4),
      intermediates: {
        baseQty,
        mandatePercent,
        urepTarget,
      },
    };
  }) : [];

  return {
    entityType: 'producer',
    financialYears: years,
    categories: PLASTIC_CATEGORIES,
    targetTables,
    urepTable,
    warnings,
    rejectedRows,
    calculationMetadata: buildMetadata({
      options,
      counts: { sales: summarizeCounts(salesRows).sourceRows, preConsumer: summarizeCounts(preConsumerRows).sourceRows },
      acceptedRows: acceptedRowCount,
      rejectedRows: { total: rejectedRows.length },
    }),
  };
}

export function calculateEprTargets({
  brandOwnerRows = [],
  producerSalesRows = [],
  producerPreConsumerRows = [],
  options = {},
} = {}) {
  return {
    brandOwner: calculateBrandOwnerTargets(brandOwnerRows, options),
    producer: calculateProducerTargets({ salesRows: producerSalesRows, preConsumerRows: producerPreConsumerRows }, options),
  };
}

