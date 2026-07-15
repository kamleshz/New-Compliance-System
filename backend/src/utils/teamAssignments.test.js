import test from 'node:test';
import assert from 'node:assert/strict';
import { collectActiveComplianceManagers, normalizeReferenceIds } from './teamAssignments.js';

test('keeps multiple compliance manager IDs', () => {
  assert.deepEqual(
    normalizeReferenceIds(['manager-1', 'manager-2', 'manager-3']),
    ['manager-1', 'manager-2', 'manager-3'],
  );
});

test('supports populated references and removes duplicates', () => {
  assert.deepEqual(
    normalizeReferenceIds([{ _id: 'manager-1' }, { id: 'manager-2' }], 'manager-1'),
    ['manager-1', 'manager-2'],
  );
});

test('collects every selected active compliance manager for email', () => {
  const managers = collectActiveComplianceManagers([
    {
      operationHeads: [
        { _id: 'manager-1', name: 'One', email: 'one@example.com', status: 'active' },
        { _id: 'manager-2', name: 'Two', email: 'two@example.com', isActive: true },
        { _id: 'manager-3', name: 'Inactive', email: 'inactive@example.com', status: 'inactive' },
      ],
      operationHead: { _id: 'manager-1', name: 'One', email: 'one@example.com' },
    },
  ]);

  assert.deepEqual(managers.map((manager) => manager.email), ['one@example.com', 'two@example.com']);
});

test('keeps the legacy single compliance manager for existing teams', () => {
  const managers = collectActiveComplianceManagers([
    { operationHead: { _id: 'legacy-manager', email: 'legacy@example.com' } },
  ]);
  assert.equal(managers[0].email, 'legacy@example.com');
});
