// AbortSignal.any arrived in Node 20.3, and engines allows 20.0.
export function combineSignals(signals) {
  const list = signals.filter(Boolean);
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(list);
  const ctrl = new AbortController();
  const abort = (reason) => {
    try { ctrl.abort(reason); } catch {}
  };
  for (const signal of list) {
    if (signal.aborted) {
      abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => abort(signal.reason), { once: true });
  }
  return ctrl.signal;
}
