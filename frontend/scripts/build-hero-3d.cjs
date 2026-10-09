const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const frontendDir = path.resolve(__dirname, '..');
const vendorDir = path.join(frontendDir, 'vendor');

async function buildHeroScene() {
  await esbuild.build({
    entryPoints: [path.join(frontendDir, 'js', 'hero-3d.js')],
    outfile: path.join(frontendDir, 'js', 'hero-3d.bundle.js'),
    bundle: true,
    treeShaking: true,
    minify: true,
    legalComments: 'inline',
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'info',
  });

  fs.mkdirSync(vendorDir, { recursive: true });
  fs.copyFileSync(
    path.join(frontendDir, 'node_modules', 'three', 'LICENSE'),
    path.join(vendorDir, 'THREE-LICENSE.txt')
  );
}

buildHeroScene().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
