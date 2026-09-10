import { defineConfig } from 'tsup'
import { resolve } from 'node:path'

const config = {
  dts: true,
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js',
  }),
  minify: true,
  skipNodeModulesBundle: true,
  target: 'es2020',
}

export default defineConfig([
  {
    ...config,
    entry: { index: 'src/index.ts' },
    clean: true,
  },
  {
    ...config,
    entry: { browser: 'src/index.ts' },
    clean: false,
    platform: 'browser',
    esbuildPlugins: [
      {
        name: 'browser-cache-strategy',
        setup(build) {
          build.onResolve({ filter: /^\.\/cache\/createCacheStrategy$/ }, (args) => ({
            path: resolve(args.resolveDir, 'browser/createCacheStrategy.ts'),
          }))
        },
      },
    ],
  },
])
