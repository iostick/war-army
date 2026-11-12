import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Solo en desarrollo: si BSDATA_DIR apunta a un clon local de BSData/wh40k-11e,
 * simula las rutas de GitHub en /__bsdata para probar sin conexión.
 */
function localBSData(): Plugin {
  const dir = process.env.BSDATA_DIR
  return {
    name: 'local-bsdata',
    apply: 'serve',
    configureServer(server) {
      if (!dir) return
      server.middlewares.use('/__bsdata', (req, res) => {
        const url = decodeURIComponent(req.url ?? '')
        const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
        const sha = (f: string) => createHash('sha1').update(String(statSync(join(dir, f)).mtimeMs) + f).digest('hex')
        res.setHeader('Content-Type', 'application/json')
        if (url.includes('/commits/')) {
          res.end(JSON.stringify({ sha: 'local-' + files.map(sha).join('').slice(0, 12), commit: { committer: { date: new Date().toISOString() } } }))
        } else if (url.includes('/git/trees/')) {
          res.end(JSON.stringify({ tree: files.map((f) => ({ path: f, sha: sha(f), type: 'blob', size: statSync(join(dir, f)).size })) }))
        } else {
          const name = url.split('/').pop()!
          res.end(readFileSync(join(dir, name)))
        }
      })
    },
  }
}

export default defineConfig({
  base: './',
  define: {
    __LOCAL_BSDATA__: JSON.stringify(Boolean(process.env.BSDATA_DIR)),
  },
  plugins: [
    react(),
    localBSData(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'War Army',
        short_name: 'War Army',
        description: 'Warhammer 40,000 army lists, collection and games',
        theme_color: '#f2f2f7',
        background_color: '#f2f2f7',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,csv}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Official terrain layouts (rendered from the Event Companion when publishing): kept once seen
            urlPattern: /\/layouts\/\d+\.jpg$/,
            handler: 'CacheFirst',
            options: { cacheName: 'layouts', expiration: { maxEntries: 60 } },
          },
          {
            // Deployment maps and rule diagrams from Wahapedia, kept for offline games
            urlPattern: /^https:\/\/wahapedia\.ru\/.*\.(png|jpg|gif|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'wahapedia-img', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
})
