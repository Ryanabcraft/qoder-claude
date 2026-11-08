import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { notesForVersion, parseReleaseNotes, showReleaseNotes, showVersionNotes } from '../src/releaseNotes.js';

const changelog = [
  '# Changelog',
  '',
  '## 1.2.0',
  '- newest',
  '- also new',
  '',
  '## v1.1.0',
  '- middle',
  '',
  '## 1.0.0',
  '- old',
].join('\n');

test('notes are selected between versions, newest first', () => {
  const { lines, truncated } = parseReleaseNotes(changelog, '1.0.0', '1.2.0');
  assert.deepEqual(lines, ['newest', 'also new', 'middle']);
  assert.equal(truncated, false);
});

test('the list is capped and reports truncation', () => {
  const { lines, truncated } = parseReleaseNotes(changelog, '1.0.0', '1.2.0', 2);
  assert.deepEqual(lines, ['newest', 'also new']);
  assert.equal(truncated, true);
});

test('a version equal to the current one is not repeated', () => {
  const { lines } = parseReleaseNotes(changelog, '1.1.0', '1.2.0');
  assert.deepEqual(lines, ['newest', 'also new']);
});

test('an unknown range yields nothing', () => {
  assert.deepEqual(parseReleaseNotes(changelog, '9.0.0', '10.0.0'), { lines: [], truncated: false });
});

test('notesForVersion returns one exact section', () => {
  assert.deepEqual(notesForVersion(changelog, '1.1.0'), ['middle']);
  assert.deepEqual(notesForVersion(changelog, 'v1.2.0'), ['newest', 'also new']);
  assert.deepEqual(notesForVersion(changelog, '9.9.9'), []);
});

test('showVersionNotes prints a single version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-version-'));
  try {
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog);
    const out = [];
    assert.equal(showVersionNotes(dir, '1.1.0', (line) => out.push(line)), true);
    assert.deepEqual(out, ['notes for 1.1.0:', '  - middle']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('showReleaseNotes reads CHANGELOG.md and prints the cap', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-notes-'));
  try {
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog);
    const out = [];
    assert.equal(showReleaseNotes(dir, '1.0.0', '1.2.0', (line) => out.push(line)), true);
    assert.equal(out[0], 'notes:');
    assert.equal(out.at(-1), '  - middle');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
