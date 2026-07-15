import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBrandOwnerTargets,
  calculateProducerTargets,
  calculateEprTargets,
  normalizePlasticCategory,
} from './eprTargetCalculationService.js';

function findTargetRow(table, category) {
  return table?.rows?.find((row) => row.category === category);
}

describe('EPR Target Calculation', () => {
  it('Brand Owner calculation with two years (acceptance example)', () => {
    const prePostRows = [
      { Year: '2023-24', 'Category of Plastic': 'Cat-I', preConsumerWastePlasticQuantity: 40, postConsumerWastePlasticQuantity: 60 },
      {
        Year: '2024-25',
        'Category of Plastic': 'Cat-I',
        preConsumerWastePlasticQuantity: 50,
        postConsumerWastePlasticQuantity: 90,
        preConsumerWasteRecycledPlasticPercent: 10,
        postConsumerWasteRecycledPlasticPercent: 5,
      },
    ];

    const result = calculateBrandOwnerTargets(prePostRows, { recycledPercentageMethod: 'SUM' });
    assert.equal(result.targetTables.length, 1);
    const row = findTargetRow(result.targetTables[0], 'Cat-I');
    assert.equal(row.average, 120);
    assert.equal(row.recycledPlasticPercent, 15);
    assert.equal(row.recycledQuantity, 18);
    assert.equal(row.target, 120);
    assert.equal(row.virginTarget, 102);
  });

  it('Producer calculation with two years (acceptance example)', () => {
    const salesRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', totalPlasticQty: 100, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 110, registrationType: 'unregistered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 30, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 10 },
    ];
    const preConsumerRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 10 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 20 },
    ];

    const result = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'SUM', negativeTargetHandling: 'PRESERVE' });
    assert.equal(result.targetTables.length, 1);
    const row = findTargetRow(result.targetTables[0], 'Cat-I');
    assert.equal(row.year1.total, 110);
    assert.equal(row.year2.total, 160);
    assert.equal(row.average, 135);
    assert.equal(row.registeredSalesYear2, 30);
    assert.equal(row.recycledPlasticPercentYear2, 10);
    assert.equal(row.recycledQuantity, 13.5);
    assert.equal(row.virginTarget, 91.5);
  });

  it('Three years produce two target periods', () => {
    const prePostRows = [
      { Year: '2023-24', Category: 'Rigid', preConsumerWastePlasticQuantity: 10, postConsumerWastePlasticQuantity: 10 },
      { Year: '2024-25', Category: 'Rigid', preConsumerWastePlasticQuantity: 20, postConsumerWastePlasticQuantity: 20 },
      { Year: '2025-26', Category: 'Rigid', preConsumerWastePlasticQuantity: 30, postConsumerWastePlasticQuantity: 30 },
    ];
    const result = calculateBrandOwnerTargets(prePostRows, { recycledPercentageMethod: 'SUM' });
    assert.equal(result.targetTables.length, 2);
    assert.deepEqual(result.targetTables[0].period, { year1: '2023-24', year2: '2024-25', targetYear: '2025-26' });
    assert.deepEqual(result.targetTables[1].period, { year1: '2024-25', year2: '2025-26', targetYear: '2026-27' });
  });

  it('Missing category/year treated as zero for that category/year', () => {
    const prePostRows = [
      { Year: '2023-24', Category: 'Cat-I', preConsumerWastePlasticQuantity: 100, postConsumerWastePlasticQuantity: 0 },
      { Year: '2024-25', Category: 'Cat-II', preConsumerWastePlasticQuantity: 100, postConsumerWastePlasticQuantity: 0 },
    ];
    const result = calculateBrandOwnerTargets(prePostRows);
    const row = findTargetRow(result.targetTables[0], 'Cat-I');
    assert.equal(row.year1Total, 100);
    assert.equal(row.year2Total, 0);
    assert.equal(row.average, 50);
  });

  it('Producer registered/unregistered detection', () => {
    const salesRows = [
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 10, registrationType: 'unregistered', uploadStatus: 'completed', recycledPlasticPercent: 10 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 20, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 10 },
    ];
    const preConsumerRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 0 },
    ];
    const result = calculateProducerTargets({ salesRows, preConsumerRows });
    const row = findTargetRow(result.targetTables[0], 'Cat-I');
    assert.equal(row.registeredSalesYear2, 20);
  });

  it('Producer upload status filter for deductions', () => {
    const salesRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', totalPlasticQty: 10, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 10, registrationType: 'registered', uploadStatus: '', recycledPlasticPercent: '10%' },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 10, registrationType: 'registered', uploadStatus: 'pending', recycledPlasticPercent: '10%' },
    ];
    const preConsumerRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 0 },
    ];
    const result = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'SUM' });
    const row = findTargetRow(result.targetTables[0], 'Cat-I');
    assert.equal(row.registeredSalesYear2, 10);
    assert.equal(row.recycledPlasticPercentYear2, 10);
  });

  it('Weighted-average mode differs from sum mode', () => {
    const salesRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', totalPlasticQty: 0, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 100, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 10 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 100, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 30 },
    ];
    const preConsumerRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 0 },
    ];
    const sumMode = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'SUM' });
    const weightedMode = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'WEIGHTED_AVERAGE' });
    const sumRow = findTargetRow(sumMode.targetTables[0], 'Cat-I');
    const weightedRow = findTargetRow(weightedMode.targetTables[0], 'Cat-I');
    assert.equal(sumRow.recycledPlasticPercentYear2, 40);
    assert.equal(weightedRow.recycledPlasticPercentYear2, 20);
  });

  it('Negative target preservation and clamp-to-zero', () => {
    const salesRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', totalPlasticQty: 0, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 100, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 100 },
    ];
    const preConsumerRows = [
      { financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 0 },
    ];
    const preserve = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'SUM', negativeTargetHandling: 'PRESERVE' });
    const clamp = calculateProducerTargets({ salesRows, preConsumerRows }, { recycledPercentageMethod: 'SUM', negativeTargetHandling: 'CLAMP_TO_ZERO' });
    const preserveRow = findTargetRow(preserve.targetTables[0], 'Cat-I');
    const clampRow = findTargetRow(clamp.targetTables[0], 'Cat-I');
    assert.ok(preserveRow.virginTarget < 0);
    assert.equal(clampRow.virginTarget, 0);
  });

  it('UREP mandate applied for configured year', () => {
    const salesRows = [
      { financialYear: '2025-26', plasticCategory: 'Cat-I', totalPlasticQty: 160, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', totalPlasticQty: 160, registrationType: 'registered', uploadStatus: 'completed', recycledPlasticPercent: 0 },
    ];
    const preConsumerRows = [
      { financialYear: '2025-26', plasticCategory: 'Cat-I', preConsumerQty: 0 },
      { financialYear: '2024-25', plasticCategory: 'Cat-I', preConsumerQty: 0 },
    ];
    const result = calculateProducerTargets({ salesRows, preConsumerRows });
    const urepRow = result.urepTable.find((row) => row.category === 'Cat-I');
    assert.equal(urepRow.activeFinancialYear, '2025-26');
    assert.equal(urepRow.mandatePercent, 30);
    assert.equal(urepRow.baseQuantity, 160);
    assert.equal(urepRow.targetQuantity, 48);
  });

  it('Unknown UREP year returns warning and 0 mandate', () => {
    const prePostRows = [
      { Year: '2030-31', Category: 'Cat-I', preConsumerWastePlasticQuantity: 100, postConsumerWastePlasticQuantity: 0 },
    ];
    const result = calculateBrandOwnerTargets(prePostRows);
    assert.ok(result.warnings.some((warning) => warning.type === 'urep_mandate_missing'));
    const urepRow = result.urepTable.find((row) => row.category === 'Cat-I');
    assert.equal(urepRow.mandatePercent, 0);
    assert.equal(urepRow.targetQuantity, 0);
  });

  it('Category normalization respects Roman numeral priority', () => {
    assert.equal(normalizePlasticCategory('Cat II'), 'Cat-II');
    assert.equal(normalizePlasticCategory('CAT-III'), 'Cat-III');
    assert.equal(normalizePlasticCategory('Cat I'), 'Cat-I');
  });

  it('Invalid quantities are treated as zero with warnings', () => {
    const prePostRows = [
      { Year: '2023-24', Category: 'Cat-I', preConsumerWastePlasticQuantity: 'abc', postConsumerWastePlasticQuantity: 10 },
      { Year: '2024-25', Category: 'Cat-I', preConsumerWastePlasticQuantity: 0, postConsumerWastePlasticQuantity: 10, preConsumerWasteRecycledPlasticPercent: 'x' },
    ];
    const result = calculateBrandOwnerTargets(prePostRows);
    assert.ok(result.warnings.some((warning) => warning.type === 'invalid_quantity'));
    assert.ok(result.warnings.some((warning) => warning.type === 'invalid_percentage'));
  });

  it('calculateEprTargets returns both entity results', () => {
    const combined = calculateEprTargets({
      brandOwnerRows: [{ Year: '2023-24', Category: 'Cat-I', preConsumerWastePlasticQuantity: 0, postConsumerWastePlasticQuantity: 0 }],
      producerSalesRows: [{ financialYear: '2023-24', plasticCategory: 'Cat-I', totalPlasticQty: 0, registrationType: 'registered', uploadStatus: 'completed' }],
      producerPreConsumerRows: [{ financialYear: '2023-24', plasticCategory: 'Cat-I', preConsumerQty: 0 }],
    });
    assert.equal(combined.brandOwner.entityType, 'brandOwner');
    assert.equal(combined.producer.entityType, 'producer');
  });
});
