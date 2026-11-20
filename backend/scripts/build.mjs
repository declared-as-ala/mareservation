import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await esbuild.build({
  entryPoints: [join(root, 'src', 'server.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(root, 'dist', 'server.js'),
  packages: 'external',
  target: 'node20',
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
console.log('✅ Backend bundled successfully to dist/server.js');

