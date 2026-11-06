let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let model = 'Auto';
  try {
    const j = JSON.parse(raw);
    model = j?.model?.display_name || j?.model?.id || model;
  } catch {}
  process.stdout.write(`\u001b[36mQoder\u001b[0m · ${model}`);
});
process.stdin.resume();
