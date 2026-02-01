import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** Build the extension host (Node.js) */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
};

if (watch) {
  const ctx = await esbuild.context(extensionConfig);
  await ctx.watch();
  console.log('Watching extension host...');
} else {
  await esbuild.build(extensionConfig);
  console.log('Extension host built.');
}
