import fs from 'node:fs';
import os from 'node:os';
import { cachedModels } from './models.js';
import { settingsPath } from './claudeSettings.js';

const BEHAVES_AS = process.env.QODER_BEHAVES_AS || 'claude-opus-4-8';

export function pickerFor(models = cachedModels()) {
  return {
    replaceBuiltInOptions: true,
    options: models.map((model) => ({
      model,
      label: `Qoder · ${model}`,
      description: `${model} via Qoder CLI`,
      behavesAs: BEHAVES_AS,
    })),
  };
}

export function applyModelPicker({ home = os.homedir(), models = cachedModels(), backup = true } = {}) {
  const file = settingsPath(home);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { ok: false, error: 'settings.json is missing or invalid', file };
  }
  const next = pickerFor(models);
  if (JSON.stringify(data.modelPicker) === JSON.stringify(next)) {
    return { ok: true, changed: false, count: next.options.length, file };
  }
  try {
    if (backup && fs.existsSync(file)) {
      fs.copyFileSync(file, `${file}.bak-picker-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    }
    data.modelPicker = next;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
  } catch (e) {
    return { ok: false, error: `settings write failed: ${e.message}`, file };
  }
  return { ok: true, changed: true, count: next.options.length, file };
}
