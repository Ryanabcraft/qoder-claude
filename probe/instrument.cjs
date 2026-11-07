const fs = require('fs');

const SRC = 'C:/Users/-Ryan-/AppData/Roaming/npm/node_modules/@qoder-ai/qodercli/bundle/qodercli.js';
const OUT = 'C:/Users/-Ryan-/AppData/Local/Temp/qcli-instr.mjs';

let s = fs.readFileSync(SRC, 'utf8');

const log = (tag, expr) => `process.stderr.write("[INSTR] ${tag} " + (${expr}) + "\\n");`;

// log the QoderContext constructor args
s = s.replace(
  'constructor(A,e,t,i){try{let a=Mt.__wbindgen_add_to_stack_pointer(-16)',
  'constructor(A,e,t,i){' +
    'try{process.stderr.write("[INSTR ctx] A="+String(A)+" e="+String(e)+" t="+String(t).slice(0,800)+" i="+String(i).slice(0,400)+"\\n")}catch{};' +
    'try{let a=Mt.__wbindgen_add_to_stack_pointer(-16)',
);

// log generate_runtime_auth_fields input/output
s = s.replace(
  'function E0c(A){let e,t;try{',
  'function E0c(A){try{process.stderr.write("[INSTR e0c-in] "+String(A).slice(0,1200)+"\\n")}catch{};let e,t;try{',
);
s = s.replace(
  'Mt.generate_runtime_auth_fields(g,l,B);var i=',
  'Mt.generate_runtime_auth_fields(g,l,B);try{var _p=lo().getInt32(g+0,!0),_l=lo().getInt32(g+4,!0);process.stderr.write("[INSTR e0c-out] "+lD(_p,_l).slice(0,800)+"\\n")}catch{};var i=',
);

// log prepareInferRequest args
s = s.replace(
  'prepareInferRequest(A,e,t,i){try{',
  'prepareInferRequest(A,e,t,i){try{process.stderr.write("[INSTR infer] endpoint="+String(A)+" body="+String(e).slice(0,4000)+" modelKey="+String(t)+" modelSource="+String(i)+"\\n")}catch{};try{',
);

fs.writeFileSync(OUT, s);
console.log('wrote', OUT, fs.statSync(OUT).size);
