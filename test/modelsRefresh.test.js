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
async function loadModels({ home, cliBin, configDir }) {
  process.env.QODER_BRIDGE_HOME = home;
  process.env.QODER_CLI_BIN = cliBin;
  process.env.QODER_CONFIG_DIR = configDir || path.join(home, '.qoder');
  process.env.BRIDGE_MODELS_REFRESH = '0';
  seq += 1;
  return import(`../src/models.js?case=${seq}`);
}

function writeCatalog(configDir, items) {
  const dir = path.join(configDir, '.auth');
  fs.mkdirSync(dir, { recursive: true });
  const texts = { schemaVersion: 3, locales: { en: items } };
  fs.writeFileSync(path.join(dir, 'dynamic-texts.json'), JSON.stringify(texts));
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

test('the Qoder catalog is used when the CLI has nothing to say', async () => {
  const dir = sandbox('qc-models-catalog-');
  const configDir = path.join(dir, '.qoder');
  writeCatalog(configDir, {
    'modelSelector.item.auto': 'Auto',
    'modelSelector.item.ultimate': 'Ultimate',
    'modelSelector.item.gm51model': 'GLM-5.2',
    'modelSelector.item.gm51model.description': 'A description that is not a model',
    'modelSelector.item.dogfood': 'Qwen3.7-Max-DogFooding',
    'modelSelector.item.dup': 'GLM-5.2',
    'modelSelector.item.fast': 'Fast',
  });
  const cli = fixture(dir, 'empty2.js', "process.stderr.write(['Warning: no models available for your account.'].join(''));\n");
  const models = await loadModels({ home: dir, cliBin: cli, configDir });

  const initial = models.modelsStatus();
  assert.equal(initial.source, 'catalog');
  assert.deepEqual(initial.models, ['Auto', 'Ultimate', 'Fast', 'GLM-5.2']);

  await models.refreshModels({ force: true });
  const after = models.modelsStatus();
  assert.equal(after.source, 'catalog', 'a failed CLI attempt does not discard the catalog');
  assert.deepEqual(after.models, ['Auto', 'Ultimate', 'Fast', 'GLM-5.2']);
  assert.match(after.lastError, /no models available/);
});

test('a fresh CLI answer beats the catalog', async () => {
  const dir = sandbox('qc-models-cli-wins-');
  const configDir = path.join(dir, '.qoder');
  writeCatalog(configDir, { 'modelSelector.item.auto': 'Auto', 'modelSelector.item.qmodel': 'Qwen-Old' });
  const cli = fixture(dir, 'good.js', "process.stdout.write(['Auto','Qwen-New'].join(String.fromCharCode(10)));\n");
  const models = await loadModels({ home: dir, cliBin: cli, configDir });

  await models.refreshModels({ force: true });
  const status = models.modelsStatus();

  assert.equal(status.source, 'cli');
  assert.deepEqual(status.models, ['Auto', 'Qwen-New']);
});
