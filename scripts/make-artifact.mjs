// Converte dist/index.html numa página para o visualizador do claude.ai:
// o visualizador acrescenta <!doctype>, <html>, <head> e <body>, por isso
// ficam só o título, os estilos, o contentor e os scripts.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const out = [
  pick(/<title>[\s\S]*?<\/title>/g),
  pick(/<style>[\s\S]*?<\/style>/g),
  pick(/<link rel="modulepreload"[^>]*>/g),
  '<div id="app"></div>',
  pick(/<script type="module"[^>]*><\/script>/g),
].join('\n');
writeFileSync('dist/artifact.html', out + '\n');
console.log('dist/artifact.html');
