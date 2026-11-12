import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneBackups } from '../src/backups.js';
import { combineSignals } from '../src/abort.js';

test('only the newest backups are kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-backups-'));
  const file = path.join(dir, 'settings.json');
  fs.writeFileSync(file, '{}');
  for (let i = 0; i < 6; i += 1) {
    const name = `${file}.bak-picker-2026-01-0${i + 1}`;
    fs.writeFileSync(name, String(i));
    const when = new Date(Date.now() + i * 60000);
    fs.utimesSync(name, when, when);
  }
  const removed = pruneBackups(file, '.bak-picker-', 3);
  const left = fs.readdirSync(dir).filter((n) => n.startsWith('settings.json.bak-picker-'));
  assert.equal(removed, 3);
  assert.equal(left.length, 3);
});

test('combineSignals aborts when one of them does', () => {
  const a = new AbortController();
  const b = new AbortController();
  const signal = combineSignals([a.signal, b.signal]);
  assert.equal(signal.aborted, false);
  b.abort();
  assert.equal(signal.aborted, true);
});
