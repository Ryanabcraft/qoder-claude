function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pick(raw, ...keys) {
  for (const key of keys) {
    const value = key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), raw);
    const number = finite(value);
    if (number !== null) return number;
  }
  return null;
}

export function normalizeUsage(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const input = pick(source, 'input_tokens', 'prompt_tokens');
  const output = pick(source, 'output_tokens', 'completion_tokens');
  const cacheRead = pick(source, 'cache_read_input_tokens', 'cache_read_tokens', 'prompt_tokens_details.cached_tokens');
  const cacheWrite = pick(source, 'cache_creation_input_tokens', 'cache_write_tokens', 'prompt_tokens_details.cache_creation_tokens');
  const credits = pick(source, 'credits', 'original_credits');
  const ratio = pick(source, 'context_usage_ratio');
  const known = [input, output, cacheRead, cacheWrite, credits, ratio].some((value) => value !== null);
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    credits,
    ratio,
    source: known ? 'upstream' : 'none',
  };
}

export function mergeUsage(raw, estimatedInput, estimatedOutput) {
  const usage = normalizeUsage(raw);
  const input = usage.input ?? estimatedInput ?? 0;
  const output = usage.output ?? estimatedOutput ?? 0;
  const hasInput = usage.input !== null;
  const hasOutput = usage.output !== null;

  const anthropic = {
    input_tokens: input,
    output_tokens: output,
    qoder_usage_source: hasInput && hasOutput ? 'upstream' : hasInput || hasOutput ? 'mixed' : 'estimated',
  };
  if (usage.cacheRead !== null) anthropic.cache_read_input_tokens = usage.cacheRead;
  if (usage.cacheWrite !== null) anthropic.cache_creation_input_tokens = usage.cacheWrite;
  if (usage.credits !== null) anthropic.credits = usage.credits;
  if (usage.ratio !== null) anthropic.context_usage_ratio = usage.ratio;

  return {
    anthropic,
    metrics: {
      in: input,
      out: output,
      credits: usage.credits ?? 0,
      cacheRead: usage.cacheRead ?? 0,
      cacheWrite: usage.cacheWrite ?? 0,
      source: anthropic.qoder_usage_source,
    },
  };
}
