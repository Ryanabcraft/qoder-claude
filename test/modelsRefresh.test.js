import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function fixture(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return file;
}

function sandbox(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

let seq = 0;
async function loadModels({ home, cliBin }) {
  process.env.QODER_BRIDGE_HOME = home;
  process.env.QODER_CLI_BIN = cliBin;
  process.env.BRIDGE_MODELS_REFRESH = '0';
  seq += 1;
  return import(`../src/models.js?case=${seq}`);
}

test('an empty CLI answer falls back to the built-in list and records the error', async () => {
  const dir = sandbox('qc-models-empty-');
  const cli = fixture(dir, 'empty.js', "process.stderr.write('Warning: no models available for your account.\\n'); process.exit(0);\n");
  const models = await loadModels({ home: dir, cliBin: cli });

  await models.refreshModels({ force: true });
  const status = models.modelsStatus();

  assert.equal(status.source, 'builtin');
  assert.match(status.lastError, /no models available/);
  assert.deepEqual(status.models, models.QODER_MODELS);
  assert.equal(fs.existsSync(path.join(dir, 'models.cache.json')), false);
});

test('a real CLI answer becomes the source and is written to disk', async () => {
  const dir = sandbox('qc-models-good-');
  const cli = fixture(dir, 'good.js', "process.stdout.write('MODEL\\nAuto\\nQwen9-Max\\nKimi-K4\\n');\n");
  const models = await loadModels({ home: dir, cliBin: cli });

  await models.refreshModels({ force: true });
  const status = models.modelsStatus();

  assert.equal(status.source, 'cli');
  assert.deepEqual(status.models, ['Auto', 'Qwen9-Max', 'Kimi-K4']);
  assert.equal(status.lastError, '');

  const cache = JSON.parse(fs.readFileSync(path.join(dir, 'models.cache.json'), 'utf8'));
  assert.deepEqual(cache.models, ['Auto', 'Qwen9-Max', 'Kimi-K4']);
});

test('the last good list survives a restart', async () => {
  const dir = sandbox('qc-models-cache-');
  const cli = fixture(dir, 'good.js', "process.stdout.write('Auto\\nDeepSeek-V9\\n');\n");
  const first = await loadModels({ home: dir, cliBin: cli });
  await first.refreshModels({ force: true });

  const broken = fixture(dir, 'broken.js', "process.stderr.write('Warning: no models available.\\n');\n");
  const restarted = await loadModels({ home: dir, cliBin: broken });
  const status = restarted.modelsStatus();

  assert.equal(status.source, 'cache');
  assert.deepEqual(status.models, ['Auto', 'DeepSeek-V9']);
});

test('a failure starts a backoff that force clears', async () => {
  const dir = sandbox('qc-models-backoff-');
  const bad = fixture(dir, 'bad.js', "process.stderr.write('Warning: no models available.\\n');\n");
  const models = await loadModels({ home: dir, cliBin: bad });

  await models.refreshModels({ force: true });
  const afterOne = models.modelsStatus();
  assert.equal(afterOne.failures, 1);
  assert.ok(afterOne.lastAttempt);

  await models.refreshModels();
  assert.equal(models.modelsStatus().failures, 1, 'backoff blocks an immediate retry');

  const good = fixture(dir, 'good.js', "process.stdout.write('Auto\\nUltimate-X\\n');\n");
  process.env.QODER_CLI_BIN = good;
  await models.refreshModels({ force: true });
  const afterForce = models.modelsStatus();

  assert.equal(afterForce.failures, 0);
  assert.equal(afterForce.source, 'cli');
  assert.deepEqual(afterForce.models, ['Auto', 'Ultimate-X']);
});
