#!/usr/bin/env node
// Confere os limites de caracteres da ficha da Play Store (listing-pt-BR.md) e
// grava store/listing-check.json. Uso: node store/check-listing.js
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'listing-pt-BR.md'), 'utf8');
const blocks = [...md.matchAll(/## ([^\n]+)\n+```\n([\s\S]*?)\n```/g)].map((m) => ({ title: m[1].trim(), text: m[2] }));
const limits = [
  { key: 'Nome do app', max: 30 },
  { key: 'Descrição curta', max: 80 },
  { key: 'Descrição completa', max: 4000 },
  { key: 'Notas da versão', max: 500 },
];
const out = limits.map(({ key, max }) => {
  const b = blocks.find((x) => x.title.startsWith(key));
  const len = b ? [...b.text].length : null; // conta code points (como o Console)
  return { campo: key, caracteres: len, limite: max, ok: len !== null && len <= max };
});
fs.writeFileSync(path.join(__dirname, 'listing-check.json'), JSON.stringify(out, null, 2) + '\n');
for (const r of out) console.log(`${r.ok ? 'OK ' : 'ERRO'} ${r.campo.padEnd(20)} ${String(r.caracteres).padStart(5)} / ${r.limite}`);
process.exit(out.every((r) => r.ok) ? 0 : 1);
