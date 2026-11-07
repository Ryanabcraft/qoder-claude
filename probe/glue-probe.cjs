const fs = require('fs');
const path = require('path');

const BUNDLE = 'C:/Users/-Ryan-/AppData/Roaming/npm/node_modules/@qoder-ai/qodercli/bundle/qodercli.js';
const WASM = path.join(__dirname, '..', 'qoder_auth_wasm_bg.wasm');
const src = fs.readFileSync(BUNDLE, 'utf8');

function sliceFn(text, startMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error('marker not found: ' + startMarker);
  let i = text.indexOf('{', start);
  let depth = 0;
  let inStr = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw new Error('unbalanced');
}

const apiText = sliceFn(src, 'function Api()');
console.log('Api() chars', apiText.length);

const heap = [undefined];
let next = 1;
const CI = (i) => heap[i];
const ew = (o) => { heap[next] = o; return next++; };
const y0c = (i) => { heap[i] = undefined; };
const lD = (ptr, len) => new TextDecoder().decode(new Uint8Array(Mt.memory.buffer, ptr, len));
let Mt = null;
const plA = new TextEncoder();
function dlA(fn, args) {
  try { return fn.apply(this, args); } catch (e) { Mt.__wbindgen_export(ew(e)); }
}

const makeApi = new Function('CI', 'lD', 'ew', 'dlA', 'Mt', 'plA', `return (${apiText})()`);
const imports = makeApi(CI, lD, ew, dlA, new Proxy({}, { get: () => () => 0 }), plA);
console.log('imports', Object.keys(imports), Object.keys(imports['./qoder_auth_wasm_bg.js'] || {}).length);

const bytes = fs.readFileSync(WASM);
const mod = new WebAssembly.Module(bytes);
const inst = new WebAssembly.Instance(mod, imports);
Mt = inst.exports;
console.log('instantiated. exports:', Object.keys(Mt).slice(0, 12).join(', '), '...');
