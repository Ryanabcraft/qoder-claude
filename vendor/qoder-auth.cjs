'use strict';
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

function Api(){return{__proto__:null,"./qoder_auth_wasm_bg.js":{__proto__:null,__wbg_Error_2e59b1b37a9a34c3:function(A,e){return ew(Error(lD(A,e)))},__wbg___wbindgen_is_function_49868bde5eb1e745:function(A){return"function"==typeof CI(A)},__wbg___wbindgen_is_object_40c5a80572e8f9d3:function(A){let e=CI(A);return"object"==typeof e&&null!==e},__wbg___wbindgen_is_string_b29b5c5a8065ba1a:function(A){return"string"==typeof CI(A)},__wbg___wbindgen_is_undefined_c0cca72b82b86f4d:function(A){return void 0===CI(A)},__wbg___wbindgen_throw_81fc77679af83bc6:function(A,e){throw new Error(lD(A,e))},__wbg_call_d578befcc3145dee:function(){return dlA(function(A,e,t){return ew(CI(A).call(CI(e),CI(t)))},arguments)},__wbg_crypto_38df2bab126b63dc:function(A){return ew(CI(A).crypto)},__wbg_getRandomValues_c44a50d8cfdaebeb:function(){return dlA(function(A,e){CI(A).getRandomValues(CI(e))},arguments)},__wbg_getRandomValues_d49329ff89a07af1:function(){return dlA(function(A,e){globalThis.crypto.getRandomValues(x9e(A,e))},arguments)},__wbg_length_0c32cb8543c8e4c8:function(A){return CI(A).length},__wbg_msCrypto_bd5a034af96bcba6:function(A){return ew(CI(A).msCrypto)},__wbg_new_99cabae501c0a8a0:function(){return ew(new Map)},__wbg_new_with_length_9cedd08484b73942:function(A){return ew(new Uint8Array(A>>>0))},__wbg_node_84ea875411254db1:function(A){return ew(CI(A).node)},__wbg_now_88621c9c9a4f3ffc:function(){return Date.now()},__wbg_process_44c7a14e11e9f69e:function(A){return ew(CI(A).process)},__wbg_prototypesetcall_3e05eb9545565046:function(A,e,t){Uint8Array.prototype.set.call(x9e(A,e),CI(t))},__wbg_randomFillSync_6c25eac9869eb53c:function(){return dlA(function(A,e){CI(A).randomFillSync(lk(e))},arguments)},__wbg_require_b4edbdcf3e2a1ef0:function(){return dlA(function(){return ew(module.require)},arguments)},__wbg_set_08463b1df38a7e29:function(A,e,t){return ew(CI(A).set(CI(e),CI(t)))},__wbg_static_accessor_GLOBAL_THIS_a1248013d790bf5f:function(){let A=typeof globalThis>"u"?null:globalThis;return I$(A)?0:ew(A)},__wbg_static_accessor_GLOBAL_f2e0f995a21329ff:function(){let A=typeof global>"u"?null:global;return I$(A)?0:ew(A)},__wbg_static_accessor_SELF_24f78b6d23f286ea:function(){let A=typeof self>"u"?null:self;return I$(A)?0:ew(A)},__wbg_static_accessor_WINDOW_59fd959c540fe405:function(){let A=typeof window>"u"?null:window;return I$(A)?0:ew(A)},__wbg_subarray_0f98d3fb634508ad:function(A,e,t){return ew(CI(A).subarray(e>>>0,t>>>0))},__wbg_versions_276b2795b1c6a219:function(A){return ew(CI(A).versions)},__wbindgen_cast_0000000000000001:function(A,e){return ew(x9e(A,e))},__wbindgen_cast_0000000000000002:function(A,e){return ew(lD(A,e))},__wbindgen_object_clone_ref:function(A){return ew(CI(A))},__wbindgen_object_drop_ref:function(A){lk(A)}}}}

function lo(){return(null===y0e||!0===y0e.buffer.detached||void 0===y0e.buffer.detached&&y0e.buffer!==Mt.memory.buffer)&&(y0e=new DataView(Mt.memory.buffer)),y0e}
function P9e(){return(null===glA||0===glA.byteLength)&&(glA=new Uint8Array(Mt.memory.buffer)),glA}
function lD(A,e){return P0c(A>>>=0,e)}
function P0c(A,e){return(Fln+=e)>=x0c&&((KVA=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0})).decode(),Fln=e),KVA.decode(P9e().subarray(A,A+e))}
function I$(A){return null==A}
function x9e(A,e){return A>>>=0,P9e().subarray(A/1,A/1+e)}
function Uln(A,e){let t=e(1*A.length,1)>>>0;return P9e().set(A,t/1),Qg=A.length,t}
function qm(A,e,t){if(void 0===t){let t=plA.encode(A),i=e(t.length,1)>>>0;return P9e().subarray(i,i+t.length).set(t),Qg=t.length,i}let i=A.length,n=e(i,1)>>>0,r=P9e(),o=0;for(;o<i;o++){let e=A.charCodeAt(o);if(e>127)break;r[n+o]=e}if(o!==i){0!==o&&(A=A.slice(o)),n=t(n,i,i=o+3*A.length,1)>>>0;let e=P9e().subarray(n+o,n+i);o+=plA.encodeInto(A,e).written,n=t(n,i,o,1)>>>0}return Qg=o,n}
function lk(A){let e=CI(A);return y0c(A),e}

let hlA, x0e;
hlA=class{__destroy_into_raw(){let A=this.__wbg_ptr;return this.__wbg_ptr=0,$fi.unregister(this),A}free(){let A=this.__destroy_into_raw();Mt.__wbg_qodercontext_free(A,0)}get_external_providers_access(){let A,e;try{let n=Mt.__wbindgen_add_to_stack_pointer(-16);Mt.qodercontext_get_external_providers_access(n,this.__wbg_ptr);var t=lo().getInt32(n+0,!0),i=lo().getInt32(n+4,!0);return A=t,e=i,lD(t,i)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(A,e,1)}}constructor(A,e,t,i){try{let a=Mt.__wbindgen_add_to_stack_pointer(-16),g=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),l=Qg,B=qm(e,Mt.__wbindgen_export2,Mt.__wbindgen_export3),c=Qg,Q=qm(t,Mt.__wbindgen_export2,Mt.__wbindgen_export3),I=Qg;var n=I$(i)?0:qm(i,Mt.__wbindgen_export2,Mt.__wbindgen_export3),r=Qg;Mt.qodercontext_new(a,g,l,B,c,Q,I,n,r);var o=lo().getInt32(a+0,!0),s=lo().getInt32(a+4,!0);if(lo().getInt32(a+8,!0))throw lk(s);return this.__wbg_ptr=o>>>0,$fi.register(this,this.__wbg_ptr,this),this}finally{Mt.__wbindgen_add_to_stack_pointer(16)}}prepareInferRequest(A,e,t,i){try{let l=Mt.__wbindgen_add_to_stack_pointer(-16),B=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),c=Qg,Q=qm(e,Mt.__wbindgen_export2,Mt.__wbindgen_export3),I=Qg;var n=I$(t)?0:qm(t,Mt.__wbindgen_export2,Mt.__wbindgen_export3),r=Qg,o=I$(i)?0:qm(i,Mt.__wbindgen_export2,Mt.__wbindgen_export3),s=Qg;Mt.qodercontext_prepareInferRequest(l,this.__wbg_ptr,B,c,Q,I,n,r,o,s);var a=lo().getInt32(l+0,!0),g=lo().getInt32(l+4,!0);if(lo().getInt32(l+8,!0))throw lk(g);return x0e.__wrap(a)}finally{Mt.__wbindgen_add_to_stack_pointer(16)}}prepareRequest(A,e,t,i,n,r){try{let c=Mt.__wbindgen_add_to_stack_pointer(-16),Q=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),I=Qg,E=qm(e,Mt.__wbindgen_export2,Mt.__wbindgen_export3),u=Qg,d=qm(t,Mt.__wbindgen_export2,Mt.__wbindgen_export3),C=Qg,w=qm(i,Mt.__wbindgen_export2,Mt.__wbindgen_export3),h=Qg;var o=I$(n)?0:qm(n,Mt.__wbindgen_export2,Mt.__wbindgen_export3),s=Qg,a=I$(r)?0:qm(r,Mt.__wbindgen_export2,Mt.__wbindgen_export3),g=Qg;Mt.qodercontext_prepareRequest(c,this.__wbg_ptr,Q,I,E,u,d,C,w,h,o,s,a,g);var l=lo().getInt32(c+0,!0),B=lo().getInt32(c+4,!0);if(lo().getInt32(c+8,!0))throw lk(B);return x0e.__wrap(l)}finally{Mt.__wbindgen_add_to_stack_pointer(16)}}refreshAuthFields(A){try{let t=Mt.__wbindgen_add_to_stack_pointer(-16),i=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),n=Qg;Mt.qodercontext_refreshAuthFields(t,this.__wbg_ptr,i,n);var e=lo().getInt32(t+0,!0);if(lo().getInt32(t+4,!0))throw lk(e)}finally{Mt.__wbindgen_add_to_stack_pointer(16)}}};
x0e=class A{static __wrap(e){e>>>=0;let t=Object.create(A.prototype);return t.__wbg_ptr=e,epi.register(t,t.__wbg_ptr,t),t}__destroy_into_raw(){let A=this.__wbg_ptr;return this.__wbg_ptr=0,epi.unregister(this),A}free(){let A=this.__destroy_into_raw();Mt.__wbg_requestresult_free(A,0)}get body(){try{let t=Mt.__wbindgen_add_to_stack_pointer(-16);Mt.requestresult_body(t,this.__wbg_ptr);var A=lo().getInt32(t+0,!0),e=lo().getInt32(t+4,!0);let i;return 0!==A&&(i=lD(A,e).slice(),Mt.__wbindgen_export4(A,1*e,1)),i}finally{Mt.__wbindgen_add_to_stack_pointer(16)}}get headerCount(){return Mt.requestresult_headerCount(this.__wbg_ptr)>>>0}get headers(){return lk(Mt.requestresult_headers(this.__wbg_ptr))}get url(){let A,e;try{let n=Mt.__wbindgen_add_to_stack_pointer(-16);Mt.requestresult_url(n,this.__wbg_ptr);var t=lo().getInt32(n+0,!0),i=lo().getInt32(n+4,!0);return A=t,e=i,lD(t,i)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(A,e,1)}}};

function E0c(A){let e,t;try{let g=Mt.__wbindgen_add_to_stack_pointer(-16),l=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),B=Qg;Mt.generate_runtime_auth_fields(g,l,B);var i=lo().getInt32(g+0,!0),n=lo().getInt32(g+4,!0),r=lo().getInt32(g+8,!0),o=lo().getInt32(g+12,!0),s=i,a=n;if(o)throw s=0,a=0,lk(r);return e=s,t=a,lD(s,a)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(e,t,1)}}
function m0c(A){let e,t;try{let g=Mt.__wbindgen_add_to_stack_pointer(-16),l=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),B=Qg;Mt.decrypt_server_response(g,l,B);var i=lo().getInt32(g+0,!0),n=lo().getInt32(g+4,!0),r=lo().getInt32(g+8,!0),o=lo().getInt32(g+12,!0),s=i,a=n;if(o)throw s=0,a=0,lk(r);return e=s,t=a,lD(s,a)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(e,t,1)}}
function p0c(A,e){let t,i;try{let l=Mt.__wbindgen_add_to_stack_pointer(-16),B=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),c=Qg,Q=qm(e,Mt.__wbindgen_export2,Mt.__wbindgen_export3),I=Qg;Mt.credential_storage_encrypt(l,B,c,Q,I);var n=lo().getInt32(l+0,!0),r=lo().getInt32(l+4,!0),o=lo().getInt32(l+8,!0),s=lo().getInt32(l+12,!0),a=n,g=r;if(s)throw a=0,g=0,lk(o);return t=a,i=g,lD(a,g)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(t,i,1)}}
function f0c(A,e){let t,i;try{let l=Mt.__wbindgen_add_to_stack_pointer(-16),B=qm(A,Mt.__wbindgen_export2,Mt.__wbindgen_export3),c=Qg,Q=qm(e,Mt.__wbindgen_export2,Mt.__wbindgen_export3),I=Qg;Mt.credential_storage_decrypt(l,B,c,Q,I);var n=lo().getInt32(l+0,!0),r=lo().getInt32(l+4,!0),o=lo().getInt32(l+8,!0),s=lo().getInt32(l+12,!0),a=n,g=r;if(s)throw a=0,g=0,lk(o);return t=a,i=g,lD(a,g)}finally{Mt.__wbindgen_add_to_stack_pointer(16),Mt.__wbindgen_export4(t,i,1)}}

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
