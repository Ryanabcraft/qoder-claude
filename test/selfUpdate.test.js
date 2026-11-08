import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewer } from '../src/selfUpdate.js';

test('compares versions numerically', () => {
  assert.equal(isNewer('1.10.0', '1.9.9'), true);
  assert.equal(isNewer('1.9.0', '1.9.0'), false);
  assert.equal(isNewer('2.0.0', '1.99.99'), true);
});
