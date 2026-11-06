import fs from 'node:fs';
import path from 'node:path';

const target = process.cwd();
const dir = path.join(target, '.claude');
const file = path.join(dir, 'settings.json');
const port = process.env.BRIDGE_PORT || '8787';

fs.mkdirSync(dir, { recursive: true });

let current = {};
if (fs.existsSync(file)) {
  fs.copyFileSync(file, file + '.bak');
  try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
}

current.env = {
  ...(current.env || {}),
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
  ANTHROPIC_AUTH_TOKEN: process.env.BRIDGE_API_KEY || 'dummy',
  ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-5',
  ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-5',
  ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
};

fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
console.log(`ok -> ${file}`);
if (fs.existsSync(file + '.bak')) console.log(`backup -> ${file}.bak`);
console.log(`suba o bridge com: "${path.join(process.env.QODER_BRIDGE_HOME || 'D:\\SISTEMAS\\Projetos\\Qoder-Claude\\qoder-bridge', 'start.cmd')}"`);
