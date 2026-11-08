import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_PATH, ROOT } from './config.js';
import { activeAccount } from './accounts.js';
import { sessionCount } from './sessions.js';
import { poolStatus } from './cli.js';
import { METRICS_PATH, lastError } from './metrics.js';

export function appVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function healthSnapshot() {
  const memory = process.memoryUsage();
  return {
    ok: true,
    version: appVersion(),
    node: process.version,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
    },
    transport: process.env.BRIDGE_TRANSPORT || 'auto',
    port: Number(process.env.BRIDGE_PORT || 8787),
    host: process.env.BRIDGE_HOST || '127.0.0.1',
    account: activeAccount(),
    sessions: sessionCount(),
    pool: poolStatus(),
    paths: {
      config: CONFIG_PATH,
      metrics: METRICS_PATH,
      log: process.env.BRIDGE_LOG_FILE || path.join(ROOT, 'bridge.log'),
    },
    lastError: lastError(),
  };
}
