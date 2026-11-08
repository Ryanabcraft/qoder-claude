import fs from 'node:fs';
import path from 'node:path';
import { isNewer } from './selfUpdate.js';

export function parseReleaseNotes(markdown, from, to, limit = 10) {
  const sections = [];
  let current = null;
  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = line.match(/^##\s+v?(\d+\.\d+\.\d+)\b/);
    if (heading) {
      current = { version: heading[1], items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const item = line.trim();
    if (!item || /^#{1,6}\s/.test(item)) continue;
    const text = item.replace(/^[-*+]\s+/, '').trim();
    if (text) current.items.push(text);
  }

  const selected = sections
    .filter((section) => isNewer(section.version, from) && !isNewer(section.version, to))
    .sort((a, b) => (isNewer(a.version, b.version) ? -1 : 1));

  const lines = [];
  for (const section of selected) lines.push(...section.items);
  return { lines: lines.slice(0, limit), truncated: lines.length > limit };
}

export function showReleaseNotes(root, from, to, log = console.log) {
  let markdown = '';
  try {
    markdown = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  } catch {
    return false;
  }
  const { lines, truncated } = parseReleaseNotes(markdown, from, to);
  if (!lines.length) return false;
  log('notes:');
  for (const line of lines) log(`  - ${line}`);
  if (truncated) log('  ...');
  return true;
}
