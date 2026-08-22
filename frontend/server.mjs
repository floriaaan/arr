// Minimal Node http -> Fetch API bridge for the SSR handler emitted at
// dist/server/server.js. TanStack Start's Vite build (no --deployment target
// selected) produces a plain `{ fetch(request) }` handler rather than a
// standalone server, so this is what actually boots it under plain Node/Docker.
// Revisit if the `nitro` add-on is applied later (cf. Dockerfile comment).
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import handler from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'
const CLIENT_DIR = join(import.meta.dirname, 'dist', 'client')

const MIME_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

function tryServeStatic(req, res) {
  // Only GET/HEAD requests can map to static files
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(CLIENT_DIR, safePath)

  // Prevent path traversal outside of CLIENT_DIR
  if (!filePath.startsWith(CLIENT_DIR)) return false
  if (!existsSync(filePath)) return false

  const stat = statSync(filePath)
  if (!stat.isFile()) return false

  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

  res.statusCode = 200
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Length', stat.size)
  // Hashed filenames (e.g. card-D2zW8Oym.js) are safe to cache aggressively
  if (/-[A-Za-z0-9_-]{6,}\.(js|mjs|css)$/.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  if (req.method === 'HEAD') {
    res.end()
    return true
  }

  createReadStream(filePath).pipe(res)
  return true
}

createServer(async (req, res) => {
  if (tryServeStatic(req, res)) return

  const url = `http://${req.headers.host}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? 'half' : undefined,
  })
  const response = await handler.fetch(request)
  res.statusCode = response.status
  for (const [key, value] of response.headers) res.setHeader(key, value)
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}).listen(port, host, () => {
  console.log(`arr-frontend listening on http://${host}:${port}`)
})
