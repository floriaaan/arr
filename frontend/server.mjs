// Minimal Node http -> Fetch API bridge for the SSR handler emitted at
// dist/server/server.js. TanStack Start's Vite build (no --deployment target
// selected) produces a plain `{ fetch(request) }` handler rather than a
// standalone server, so this is what actually boots it under plain Node/Docker.
// Revisit if the `nitro` add-on is applied later (cf. Dockerfile comment).
import { createServer } from 'node:http'
import handler from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

createServer(async (req, res) => {
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
