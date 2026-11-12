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
        description: 'Listas de ejército, colección y partidas de Warhammer 40.000',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
