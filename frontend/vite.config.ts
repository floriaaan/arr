import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './vite-pwa.config'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), VitePWA(pwaOptions)],
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
})

export default config
