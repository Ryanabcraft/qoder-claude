import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyModelPicker, pickerFor } from '../src/claudePicker.js';

function home(settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-picker-'));
  if (settings !== undefined) {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify(settings, null, 2));
  }
  return dir;
}

test('the picker is built from the given model list', () => {
  const picker = pickerFor(['Auto', 'GLM-5.3']);
  assert.equal(picker.replaceBuiltInOptions, true);
  assert.deepEqual(picker.options.map((o) => o.model), ['Auto', 'GLM-5.3']);
  assert.equal(picker.options[1].label, 'Qoder · GLM-5.3');
  assert.ok(picker.options[1].behavesAs);
});

test('applying writes the picker and keeps the rest of the settings', () => {
  const dir = home({ env: { A: '1' }, permissions: { allow: ['Read'] }, modelPicker: { options: [] } });
  const result = applyModelPicker({ home: dir, models: ['Auto', 'New-Model'] });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.count, 2);

  const saved = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(saved.env, { A: '1' });
  assert.deepEqual(saved.permissions, { allow: ['Read'] });
  assert.deepEqual(saved.modelPicker.options.map((o) => o.model), ['Auto', 'New-Model']);
});

test('a second apply is a no-op', () => {
  const dir = home({});
  applyModelPicker({ home: dir, models: ['Auto'] });
  const again = applyModelPicker({ home: dir, models: ['Auto'] });
  assert.equal(again.ok, true);
  assert.equal(again.changed, false);
});

test('a missing settings file is reported, not created', () => {
  const dir = home();
  const result = applyModelPicker({ home: dir, models: ['Auto'] });
  assert.equal(result.ok, false);
  assert.match(result.error, /missing or invalid/);
  assert.equal(fs.existsSync(path.join(dir, '.claude', 'settings.json')), false);
});
