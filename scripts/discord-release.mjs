import fs from 'node:fs';
import { execSync } from 'node:child_process';

const repo = 'Ryanabcraft/qoder-claude';
const webhook = process.env.DISCORD_WEBHOOK_URL;
const event = process.env.GITHUB_EVENT_NAME || 'workflow_dispatch';
const force = process.env.FORCE_ANNOUNCE === '1' || event === 'workflow_dispatch' || event === 'release';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

function previousVersion() {
  try {
    return JSON.parse(execSync('git show HEAD^:package.json', { encoding: 'utf8' })).version;
  } catch {
    return null;
  }
}

if (!force && event === 'push' && previousVersion() === version) {
  console.log(`version unchanged (${version}); skipping`);
  process.exit(0);
}
if (!webhook && process.env.DRY_RUN !== '1') {
  console.log('DISCORD_WEBHOOK_URL not set; skipping');
  process.exit(0);
}

let releaseUrl = `https://github.com/${repo}/commit/${process.env.GITHUB_SHA || 'main'}`;
let notes = '';
if (event === 'release' && process.env.GITHUB_EVENT_PATH) {
  try {
    const payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    releaseUrl = payload.release?.html_url || releaseUrl;
    notes = payload.release?.body || '';
  } catch {}
}

function changelogFor(v) {
  const text = fs.readFileSync('CHANGELOG.md', 'utf8');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${v}`);
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (item) out.push(item[1].trim());
  }
  return out;
}

const bullets = (notes ? notes.split(/\r?\n/).filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim()) : changelogFor(version))
  .slice(0, 10)
  .map((line) => `• ${line.length > 280 ? `${line.slice(0, 277)}...` : line}`);
const description = [
  bullets.length ? bullets.join('\n') : `See the [changelog](https://github.com/${repo}/blob/main/CHANGELOG.md).`,
  '',
  'Update with `qclaude update`.',
].join('\n').slice(0, 3500);

const payload = {
  username: 'qoder-claude',
  avatar_url: `https://raw.githubusercontent.com/${repo}/main/docs/assets/logo.png`,
  embeds: [{
    title: `qoder-claude v${version}`,
    url: releaseUrl,
    description,
    color: 0x3fffd1,
    footer: { text: repo },
    timestamp: new Date().toISOString(),
  }],
};

if (process.env.DRY_RUN === '1') {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

for (let attempt = 0; attempt < 4; attempt += 1) {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) {
    const wait = (await res.json()).retry_after ?? 1;
    await new Promise((r) => setTimeout(r, wait * 1000));
    continue;
  }
  if (!res.ok) throw new Error(`Discord webhook HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  console.log(`announced v${version}`);
  process.exit(0);
}
throw new Error('Discord webhook rate limited');
