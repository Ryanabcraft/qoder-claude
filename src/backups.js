import fs from 'node:fs';
import path from 'node:path';

// Timestamped backups are useful right after a mistake and clutter after a week.
export function pruneBackups(file, prefix, keep = 3) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  const mine = names
    .filter((name) => name.startsWith(`${base}${prefix}`))
    .map((name) => {
      const full = path.join(dir, name);
      try {
        return { full, at: fs.statSync(full).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.at - a.at);
  let removed = 0;
  for (const entry of mine.slice(keep)) {
    try {
      fs.unlinkSync(entry.full);
      removed += 1;
    } catch {}
  }
  return removed;
}
