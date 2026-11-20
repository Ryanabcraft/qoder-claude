// Tool arguments are checked before they reach the client: a call that does not
// match the declared schema is a broken turn, not a working one.

const TYPE_CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  null: (v) => v === null,
};

// Trims fences, trailing commas and unquoted keys — the usual model damage.
export function repairJson(text) {
  let value = String(text || '').trim();
  if (!value) return null;
  value = value.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(value); } catch {}
  const withoutTrailing = value.replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(withoutTrailing); } catch {}
  const quoted = withoutTrailing.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  try { return JSON.parse(quoted); } catch {}
  return null;
}

export function validateInput(schema, input) {
  const shape = schema && typeof schema === 'object' ? schema : null;
  if (!shape) return null;
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
  if (!value) return 'input must be an object';
  const properties = shape.properties && typeof shape.properties === 'object' ? shape.properties : {};
  for (const key of Array.isArray(shape.required) ? shape.required : []) {
    if (value[key] === undefined) return `missing required property: ${key}`;
  }
  for (const [key, part] of Object.entries(properties)) {
    const given = value[key];
    if (given === undefined || !part || typeof part !== 'object') continue;
    const check = TYPE_CHECKS[part.type];
    if (check && !check(given)) return `${key} must be ${part.type}`;
    if (Array.isArray(part.enum) && !part.enum.includes(given)) return `${key} must be one of ${part.enum.join(', ')}`;
  }
  if (shape.additionalProperties === false) {
    for (const key of Object.keys(value)) if (!(key in properties)) return `unexpected property: ${key}`;
  }
  return null;
}

export function toolSchema(tools = [], name = '') {
  const list = Array.isArray(tools) ? tools : [];
  const found = list.find((tool) => (tool?.function?.name || tool?.name) === name);
  return found?.function?.parameters || found?.input_schema || found?.parameters || null;
}

export function checkToolCall(tools, name, input) {
  const schema = toolSchema(tools, name);
  return validateInput(schema, input);
}
