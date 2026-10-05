import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'

dotenv.config()

import checkoutRouter  from './routes/checkout'
import inventoryRouter from './routes/inventory'
import staffRouter     from './routes/staff'
import ordersRouter    from './routes/orders'
import productsRouter  from './routes/products'
import shiftsRouter    from './routes/shifts'

const app  = express()
const PORT = Number(process.env.PORT ?? 4000)

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = [
  'http://wingtrack',
  'http://localhost',
  'http://localhost:80',
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true) // allow in dev
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use(express.json())

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'WINGTRACK API', timestamp: new Date().toISOString() })
})

// ── Routes ───────────────────────────────────────────────────
app.use('/api/checkout',  checkoutRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/staff',     staffRouter)
app.use('/api/orders',    ordersRouter)
app.use('/api/products',  productsRouter)
app.use('/api/shifts',    shiftsRouter)

// ── 404 catch-all ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

// ── Error handler ────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[WINGTRACK API Error]', err)
  res.status(500).json({ message: 'Internal server error.' })
})

app.listen(PORT, () => {
  console.log(`\n  WINGTRACK API running at http://localhost:${PORT}`)
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`)
})

// Optional HTTP (port 80) -> HTTPS (port 443) redirector
try {
  http.createServer((req, res) => {
    const rawHost = req.headers.host || 'wingtrack'
    const host = rawHost.replace(/:\d+$/, '')
    res.writeHead(301, { Location: `https://${host}${req.url}` })
    res.end()
  }).listen(80, () => {
    console.log('  HTTP port 80 -> HTTPS port 443 redirect active')
  }).on('error', () => {
    // Non-fatal if port 80 cannot be bound
  })
} catch {
  // ignore
}

export default app
