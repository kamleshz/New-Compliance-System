import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBaseUrl } from './apiBaseUrl.js';

test('appends /api to a backend origin', () => {
  assert.equal(
    normalizeApiBaseUrl('https://new-compliance-system.onrender.com'),
    'https://new-compliance-system.onrender.com/api',
  );
});

test('does not append /api twice', () => {
  assert.equal(
    normalizeApiBaseUrl('https://new-compliance-system.onrender.com/api/'),
    'https://new-compliance-system.onrender.com/api',
  );
});

test('uses the local API during development when unset', () => {
  assert.equal(normalizeApiBaseUrl(), 'http://localhost:5000/api');
});

