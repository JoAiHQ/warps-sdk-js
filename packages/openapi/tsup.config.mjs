import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js',
  }),
  minify: true,
  clean: true,
  skipNodeModulesBundle: true,
  target: 'es2020',
  external: ['@joai/warps'],
})
