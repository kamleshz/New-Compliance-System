import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeConfig } from './env.js';

test('accepts MONGO_URI and a production-safe JWT secret', () => {
  const config = validateRuntimeConfig({
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb://example.test/compliance',
    JWT_SECRET: 'a'.repeat(32),
  });
  assert.equal(config.mongoUri, 'mongodb://example.test/compliance');
});

test('accepts MONGODB_URI as an alternative variable name', () => {
  const config = validateRuntimeConfig({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://example.test/compliance',
    JWT_SECRET: 'development-secret',
  });
  assert.equal(config.mongoUri, 'mongodb://example.test/compliance');
});

test('reports every missing required setting', () => {
  assert.throws(
    () => validateRuntimeConfig({ NODE_ENV: 'production' }),
    /MONGO_URI or MONGODB_URI is required; JWT_SECRET is required/,
  );
});

