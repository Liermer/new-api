import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import zlib from 'node:zlib'

import { defineConfig, loadEnv, type RsbuildPlugin } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// A stylesheet in <head> blocks every paint, including the inline splash. In
// <body> it only blocks content after it, and the deferred scripts still wait
// for it, so React never mounts unstyled.
const pluginPaintSplashBeforeStyles: RsbuildPlugin = {
  name: 'paint-splash-before-styles',
  setup(api) {
    api.modifyHTMLTags(({ headTags, bodyTags }) => {
      const isStylesheet = (tag: (typeof headTags)[number]) =>
        tag.tag === 'link' && tag.attrs?.rel === 'stylesheet'
      return {
        headTags: headTags.filter((tag) => !isStylesheet(tag)),
        bodyTags: [...headTags.filter(isStylesheet), ...bodyTags],
      }
    })
  },
}

// Brotli's best level is too slow to run per request, so compress once here. The
// Go server sends `<file>.br` as is when the client accepts it (see
// middleware/frontend_static.go).
const pluginPrecompressAssets: RsbuildPlugin = {
  name: 'precompress-assets',
  setup(api) {
    const brotliCompress = promisify(zlib.brotliCompress)
    api.onAfterBuild(async () => {
      const dist = api.context.distPath
      const files = await fs.readdir(dist, { recursive: true })
      await Promise.all(
        files
          .filter((file) => /\.(js|css|json|svg)$/.test(file))
          .map(async (file) => {
            const source = await fs.readFile(path.join(dist, file))
            if (source.length < 1024) return
            const compressed = await brotliCompress(source, {
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]:
                  zlib.constants.BROTLI_MAX_QUALITY,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length,
              },
            })
            await fs.writeFile(path.join(dist, `${file}.br`), compressed)
          })
      )
    })
  },
}

export default defineConfig(({ envMode }) => {
  const env = loadEnv({ mode: envMode, prefixes: ['VITE_'] })
  const serverUrl =
    process.env.VITE_REACT_APP_SERVER_URL ||
    env.rawPublicVars.VITE_REACT_APP_SERVER_URL ||
    'http://localhost:3000'

  const isProd = envMode === 'production'
  const devProxy = Object.fromEntries(
    (['/api', '/v1', '/mj', '/pg'] as const).map((key) => [
      key,
      { target: serverUrl, changeOrigin: true },
    ])
  ) as Record<string, { target: string; changeOrigin: boolean }>

  return {
    plugins: [
      pluginReact(),
      pluginTailwindcss({ optimize: false }),
      pluginPaintSplashBeforeStyles,
      pluginPrecompressAssets,
    ],
    // Rsbuild 2: replaces deprecated `performance.chunkSplit` (RSPack 2 aligned)
    splitChunks: {
      preset: 'default',
      // Merge small shared modules into their route chunks: on a high-latency
      // link every extra request costs more than the duplicated bytes.
      minSize: 100_000,
      maxAsyncRequests: 10,
      cacheGroups: {
        // Every page needs the locale for its first paint, so it ships with the
        // entry. Its own chunk keeps it cached across releases that change code
        // but not copy.
        'locale-zh': {
          test: /[\\/]src[\\/]i18n[\\/]locales[\\/]zh\.json$/,
          name: 'locale-zh',
          chunks: 'all',
          enforce: true,
        },
      },
    },
    source: {
      entry: {
        index: './src/main.tsx',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    html: {
      template: './index.html',
      favicon: './public/favicon.ico',
    },
    server: {
      host: '0.0.0.0',
      strictPort: false,
      proxy: devProxy,
    },
    output: {
      // Production optimizations
      minify: isProd,
      target: 'web',
      distPath: {
        root: 'dist',
      },
      // Rely on Rsbuild default legalComments ("linked" → per-chunk *.LICENSE.txt) in all modes.
      // Do not set "none" in production: that strips minifier-preserved third-party notices and
      // extracted license files, which some distributions require for open-source compliance.
    },
    performance: {
      // Remove console in production
      removeConsole: isProd ? ['log'] : false,
      buildCache: false,
    },
    tools: {
      rspack: {
        plugins: [
          tanstackRouter({
            target: 'react',
            // Dev: avoid per-route async chunks (reduces white flash on navigation + faster HMR feedback).
            // Prod: keep route-based code splitting.
            autoCodeSplitting: isProd,
          }),
        ],
      },
    },
  }
})
