const ALIASES = {
  bash: 'Bash',
  shell: 'Bash',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  multiedit: 'MultiEdit',
  glob: 'Glob',
  grep: 'Grep',
  ls: 'LS',
  task: 'Task',
  agent: 'Task',
  todowrite: 'TodoWrite',
  todo_write: 'TodoWrite',
  webfetch: 'WebFetch',
  web_fetch: 'WebFetch',
  websearch: 'WebSearch',
  web_search: 'WebSearch',
  notebookedit: 'NotebookEdit',
  notebook_read: 'NotebookRead',
};

export function toolNames(tools = []) {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => (tool && tool.type === 'function' ? tool.function?.name : tool?.name))
    .filter((name) => typeof name === 'string' && name);
}

const lower = (value) => String(value || '').toLowerCase();
const lastSegment = (value) => lower(value).split(/__|\.|\//).filter(Boolean).pop() || '';

export function resolveToolName(name, available = []) {
  const raw = String(name || '');
  if (!raw) return raw;
  const list = Array.isArray(available) ? available : [];

  if (list.includes(raw)) return raw;

  const exact = list.find((tool) => lower(tool) === lower(raw));
  if (exact) return exact;

  const tail = lastSegment(raw);
  const byTail = list.find((tool) => lastSegment(tool) === tail);
  if (byTail) return byTail;

  const alias = ALIASES[lower(raw)] || ALIASES[tail];
  if (alias) {
    const known = list.find((tool) => lower(tool) === lower(alias));
    return known || alias;
  }
  return raw;
}
