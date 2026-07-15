import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeIdSelections, toggleIdSelection } from './selection.js';

test('adds multiple independently selected IDs', () => {
  const firstSelection = toggleIdSelection([], 'user-1');
  const secondSelection = toggleIdSelection(firstSelection, 'user-2');
  assert.deepEqual(secondSelection, ['user-1', 'user-2']);
});

test('clicking an already selected ID removes only that ID', () => {
  assert.deepEqual(toggleIdSelection(['user-1', 'user-2'], 'user-1'), ['user-2']);
});

test('select all merges visible IDs without duplicates', () => {
  assert.deepEqual(
    mergeIdSelections(['user-1'], ['user-1', 'user-2', 'user-3']),
    ['user-1', 'user-2', 'user-3'],
  );
});

