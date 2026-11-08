const DEFAULT_MS = 90000;
const MIN_MS = 5000;

export function stallMs() {
  const n = Number(process.env.BRIDGE_STALL_MS || DEFAULT_MS);
  return Number.isFinite(n) && n >= MIN_MS ? n : DEFAULT_MS;
}

export function createStallTimer(ms, onExpire) {
  let timer = null;
  let fired = false;

  const arm = () => {
    if (fired) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      onExpire();
    }, ms);
    timer.unref?.();
  };

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return { arm, clear, get fired() { return fired; } };
}
