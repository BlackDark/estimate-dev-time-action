import { build } from 'esbuild';
import path from 'node:path';

async function run(): Promise<void> {
  /** final location, identical to the original CLI command */
  const finalOutfile = path.resolve('dist', 'index.js');

  /* 1. run esbuild */
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    outfile: finalOutfile,
    minify: true,
    sourcemap: false,
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
