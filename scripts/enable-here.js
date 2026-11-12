import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cachedModels, refreshModels, refreshRemote } from '../src/models.js';
import { pickerFor } from '../src/claudePicker.js';
import { applyOpenCode, detect } from '../src/integrations.js';
import { ensureExa, EXA_URL } from '../src/exaSetup.js';
import { withWebTools } from '../src/claudeSettings.js';

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
// A model ID Claude Code knows, so custom Qoder ids inherit its client-side
// profile (1M window, effort defaults) without changing what is sent upstream.

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
  CLAUDE_CODE_AUTO_MODE_SERVER: '0',
  CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
  CLAUDE_CODE_DISABLE_1M_CONTEXT: '0',
  DISABLE_COMPACT: '0',
};
delete current.env.ANTHROPIC_DEFAULT_FABLE_MODEL;

current.model = process.env.QODER_DEFAULT_MODEL || 'Auto';

// Ask Qoder first: the CLI, then its model API. Only then fall back.
await refreshRemote({ force: true });
await refreshModels({ force: true });
current.modelPicker = pickerFor(cachedModels());

current.statusLine = {
  type: 'command',
  command: `node "${statusline}"`,
};

current = withWebTools(current).settings;

fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
console.log(`ok -> ${file}`);
if (fs.existsSync(file + '.bak')) console.log(`backup -> ${file}.bak`);

const exa = ensureExa();
if (exa.added) console.log(`exa -> ${EXA_URL} (user scope)`);
else if (exa.skipped === 'already') console.log('exa -> already configured');
else if (exa.skipped === 'disabled') console.log('exa -> skipped (QODER_NO_EXA=1)');
else console.log(`exa -> not configured: ${exa.error}`);

const installed = detect();
if (installed.opencode.installed) {
  const applied = applyOpenCode({ models: cachedModels(), setDefault: true });
  if (applied.ok) console.log(`opencode -> qoder-claude provider (${applied.models.length} models, 1M context)`);
  else console.warn(`opencode -> not updated: ${applied.error}`);
}

console.log('open it with: qclaude');
