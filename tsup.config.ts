import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  minify: false,
  splitting: false,
  treeshake: true,
  target: 'node18',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js'
    };
  }
});