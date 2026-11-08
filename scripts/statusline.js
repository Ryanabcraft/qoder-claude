let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let model = 'Auto';
  try {
    const j = JSON.parse(raw);
    model = j?.model?.id || j?.model?.display_name || model;
    model = String(model).replace(/^Qoder\s*·\s*/i, '');
  } catch {}
  process.stdout.write(`\u001b[36mQoder\u001b[0m · ${model}`);
});
process.stdin.resume();
