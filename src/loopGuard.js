function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

function callsOf(message) {
  if (Array.isArray(message?.tool_calls)) {
    return message.tool_calls
      .map((call) => {
        const name = call?.function?.name || call?.name || '';
        const args = call?.function?.arguments ?? call?.arguments ?? '';
        return name ? { name, args: typeof args === 'string' ? args : stable(args) } : null;
      })
      .filter(Boolean);
  }
  if (Array.isArray(message?.content)) {
    return message.content
      .filter((block) => block?.type === 'tool_use' && block.name)
      .map((block) => ({ name: block.name, args: stable(block.input ?? {}) }));
  }
  return [];
}

// The model repeats an action that already failed and no one tells it so. This
// finds that pattern in the history before the next turn is sent.
export function repeatedCall(messages = [], threshold = 3) {
  const list = [];
  for (const message of messages) {
    if (message?.role !== 'assistant') continue;
    for (const call of callsOf(message)) list.push(call);
  }
  if (!list.length) return null;
  const last = list[list.length - 1];
  let count = 0;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].name === last.name && list[i].args === last.args) count += 1;
    else break;
  }
  return count >= threshold ? { name: last.name, arguments: last.args, count } : null;
}

export function loopWarning(hit) {
  return `The tool call ${hit.name} with these exact arguments has already been sent ${hit.count} times and failed. `
    + 'Do not call it again. Read the error, change the arguments or the approach, or answer the user directly.';
}

export function loopGuardEnabled() {
  return process.env.QODER_LOOP_GUARD !== '0';
}
