const fs = require('fs');
const path = require('path');

const rawUrl = process.env.API_BASE_URL || '';
let apiBase = '';

if (rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    apiBase = parsed.origin;
  } catch {
    throw new Error('API_BASE_URL debe ser una URL HTTP(S) valida.');
  }
}

const target = path.join(__dirname, '..', 'runtime-config.js');
fs.writeFileSync(
  target,
  `// Generado en el despliegue. No contiene secretos.\nwindow.DEPLOY_API_BASE = ${JSON.stringify(apiBase)};\n`,
  'utf8'
);
