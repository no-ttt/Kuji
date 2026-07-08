/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://kuji-gules.vercel.app',
        changeOrigin: true,
      }
    }
  },
  base: process.env.VERCEL ? '/' : '/Kuji/', // Use '/' on Vercel deployment, '/Kuji/' on GitHub Pages
})
