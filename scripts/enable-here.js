import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectModels } from '../src/models.js';

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.env.QODER_CLAUDE_TARGET || process.cwd();
const dir = path.join(target, '.claude');
const file = path.join(dir, 'settings.json');
const port = process.env.BRIDGE_PORT || '8787';
const statusline = path.join(home, 'scripts', 'statusline.js');

fs.mkdirSync(dir, { recursive: true });

let current = {};
if (fs.existsSync(file)) {
  fs.copyFileSync(file, file + '.bak');
  try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
}

const CAPS = 'effort,xhigh_effort,thinking,adaptive_thinking,interleaved_thinking';

current.env = {
  ...(current.env || {}),
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
  ANTHROPIC_AUTH_TOKEN: process.env.BRIDGE_API_KEY || 'dummy',
  ANTHROPIC_DEFAULT_OPUS_MODEL: 'Ultimate',
  ANTHROPIC_DEFAULT_SONNET_MODEL: 'Auto',
  ANTHROPIC_DEFAULT_HAIKU_MODEL: 'Fast',
  ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: CAPS,
  ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: CAPS,
  ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES: CAPS,
};
delete current.env.ANTHROPIC_DEFAULT_FABLE_MODEL;

current.model = process.env.QODER_DEFAULT_MODEL || 'Auto';

const models = detectModels();
current.modelPicker = {
  replaceBuiltInOptions: true,
  options: models.map((m) => ({
    model: m,
    label: `Qoder · ${m}`,
    description: `${m} via Qoder CLI`,
  })),
};

current.statusLine = {
  type: 'command',
  command: `node "${statusline}"`,
};

fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
console.log(`ok -> ${file}`);
if (fs.existsSync(file + '.bak')) console.log(`backup -> ${file}.bak`);
const starter = process.platform === 'win32' ? 'start.cmd' : 'start.sh';
console.log(`inicia o bridge com: "${path.join(home, starter)}"`);
