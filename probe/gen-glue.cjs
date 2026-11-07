const fs = require('fs');
const path = require('path');

const BUNDLE = 'C:/Users/-Ryan-/AppData/Roaming/npm/node_modules/@qoder-ai/qodercli/bundle/qodercli.js';
const OUT = path.join(__dirname, '..', 'vendor', 'qoder-auth.cjs');
const src = fs.readFileSync(BUNDLE, 'utf8');

function sliceBlock(text, startMarker) {
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
  throw new Error('unbalanced block: ' + startMarker);
}

const parts = {
  Api: sliceBlock(src, 'function Api()'),
  lo: sliceBlock(src, 'function lo()'),
  P9e: sliceBlock(src, 'function P9e()'),
  lD: sliceBlock(src, 'function lD('),
  P0c: sliceBlock(src, 'function P0c('),
  qm: sliceBlock(src, 'function qm('),
  Uln: sliceBlock(src, 'function Uln('),
  lk: sliceBlock(src, 'function lk('),
  I$: sliceBlock(src, 'function I$('),
  x9e: sliceBlock(src, 'function x9e('),
  QoderContext: sliceBlock(src, 'hlA=class'),
  RequestResult: sliceBlock(src, 'x0e=class A'),
  generateAuth: sliceBlock(src, 'function E0c('),
  decryptResponse: sliceBlock(src, 'function m0c('),
  credEncrypt: sliceBlock(src, 'function p0c('),
  credDecrypt: sliceBlock(src, 'function f0c('),
};

const out = `'use strict';
// Generated from the Qoder CLI bundle: wasm-bindgen glue + embedded auth module.
// No dependency on the CLI process; only the extracted WebAssembly and this glue.
const fs = require('node:fs');
const path = require('node:path');

const WASM = path.join(__dirname, 'qoder_auth_wasm_bg.wasm');

let Mt = null;
let h$ = [undefined];
let nextRef = 1;
let y0e = null;
let glA = null;
let Qg = 0;
let Fln = 0;
const x0c = 2146435072;
const plA = new TextEncoder();
const KVA = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
KVA.decode();
const $fi = { register() {}, unregister() {} };
const epi = { register() {}, unregister() {} };
const zfi = { register() {}, unregister() {} };
const _fi = { register() {}, unregister() {} };

function CI(i) { return h$[i]; }
function ew(o) { h$[nextRef] = o; return nextRef++; }
function y0c(i) { h$[i] = undefined; }
function dlA(fn, args) {
  try { return fn.apply(this, args); } catch (e) { Mt.__wbindgen_export(ew(e)); }
}

${parts.Api}

${parts.lo}
${parts.P9e}
${parts.lD}
${parts.P0c}
${parts.I$}
${parts.x9e}
${parts.Uln}
${parts.qm}
${parts.lk}

let hlA, x0e;
${parts.QoderContext};
${parts.RequestResult};

${parts.generateAuth}
${parts.decryptResponse}
${parts.credEncrypt}
${parts.credDecrypt}

function init() {
  if (Mt) return Mt;
  const bytes = fs.readFileSync(WASM);
  const mod = new WebAssembly.Module(bytes);
  const inst = new WebAssembly.Instance(mod, Api());
  Mt = inst.exports;
  return Mt;
}

module.exports = {
  init,
  QoderContext: hlA,
  RequestResult: x0e,
  generateRuntimeAuthFields(userInfoJson) { init(); return E0c(userInfoJson); },
  decryptServerResponse(...args) { init(); return m0c(...args); },
  credentialEncrypt(...args) { init(); return p0c(...args); },
  credentialDecrypt(...args) { init(); return f0c(...args); },
};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log('wrote', OUT, out.length, 'bytes');
