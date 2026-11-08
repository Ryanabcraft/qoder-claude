import test from 'node:test';
import assert from 'node:assert/strict';
import { createStallTimer, stallMs } from '../src/stall.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('the stall timer fires after inactivity', async () => {
  let hits = 0;
  const timer = createStallTimer(40, () => { hits += 1; });
  timer.arm();
  await wait(90);
  assert.equal(hits, 1);
  assert.equal(timer.fired, true);
  timer.clear();
});

test('re-arming postpones the expiry', async () => {
  let hits = 0;
  const timer = createStallTimer(70, () => { hits += 1; });
  timer.arm();
  await wait(40);
  timer.arm();
  await wait(40);
  assert.equal(hits, 0);
  await wait(60);
  assert.equal(hits, 1);
});

test('clearing prevents the expiry', async () => {
  let hits = 0;
  const timer = createStallTimer(30, () => { hits += 1; });
  timer.arm();
  timer.clear();
  await wait(80);
  assert.equal(hits, 0);
  assert.equal(timer.fired, false);
});

test('stallMs defaults to 90s and refuses values below 5s', () => {
  const previous = process.env.BRIDGE_STALL_MS;
  try {
    delete process.env.BRIDGE_STALL_MS;
    assert.equal(stallMs(), 90000);
    process.env.BRIDGE_STALL_MS = '100';
    assert.equal(stallMs(), 90000);
    process.env.BRIDGE_STALL_MS = '15000';
    assert.equal(stallMs(), 15000);
  } finally {
    if (previous === undefined) delete process.env.BRIDGE_STALL_MS;
    else process.env.BRIDGE_STALL_MS = previous;
  }
});
