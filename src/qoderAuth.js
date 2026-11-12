import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { cliVersion } from './cliPath.js';

const require = createRequire(import.meta.url);
const auth = require('../vendor/qoder-auth.cjs');

const CONFIG_DIR =
  process.env.QODER_CONFIG_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.qoder');
const VERSION = cliVersion();

const cache = new Map();

export function authDir(dir) {
  return dir || CONFIG_DIR;
}

function load(dir, force) {
  const root = authDir(dir);
  const cached = cache.get(root);
  if (cached && !force) return cached;

  const user = fs.readFileSync(path.join(root, '.auth', 'user'), 'utf8').trim();
  const mid = fs.readFileSync(path.join(root, '.auth', 'machine_id'), 'utf8').trim();

  auth.init();
  const raw = JSON.parse(auth.credentialDecrypt(user, mid.slice(0, 16)));
  const entry = { root, uid: raw.uid, token: raw.security_oauth_token, mid, raw };
  cache.set(root, entry);
  return entry;
}

export function credentials(dir, { force = false } = {}) {
  const entry = load(dir, force);
  return { uid: entry.uid, token: entry.token, mid: entry.mid };
}

export function context(dir, force = false) {
  if (process.env.QODER_AUTH_FAKE === "1") {
    return {
      uid: "fake",
      ctx: {
        prepareInferRequest: (url, body) => ({
          url: process.env.QODER_INFER_ENDPOINT || url,
          headers: [],
          body,
        }),
      },
    };
  }
  const entry = load(dir, force);
  if (entry.ctx && !force) return { ctx: entry.ctx, uid: entry.uid };

  const fields = JSON.parse(
    auth.generateRuntimeAuthFields(
      JSON.stringify({
        uid: entry.uid,
        security_oauth_token: entry.token,
        data_policy_agreed: true,
      }),
    ),
  );
  const info = JSON.stringify({
    uid: entry.uid,
    encrypt_user_info: fields.encrypt_user_info,
    key: fields.key,
    data_policy_agreed: true,
  });
  const client = JSON.stringify({
    client_type: '5',
    business_product: 'cli',
    business_type: 'agent',
    scene: 'assistant',
  });
  entry.ctx = new auth.QoderContext(entry.mid, VERSION, info, client);
  return { ctx: entry.ctx, uid: entry.uid };
}

export function forgetContext(dir) {
  cache.delete(authDir(dir));
}
