import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import fs from 'fs'

const keyPath = path.resolve(import.meta.dirname ?? path.resolve(), './certs/wingtrack-key.pem')
const certPath = path.resolve(import.meta.dirname ?? path.resolve(), './certs/wingtrack.pem')
const hasHttps = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname ?? path.resolve(), './src') },
  },
  server: {
    host: true,
    allowedHosts: ['wingtrack'],
    port: 443,
    ...(hasHttps
      ? {
          https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
        }
      : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
