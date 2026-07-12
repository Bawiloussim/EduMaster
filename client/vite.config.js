import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    headers: {
      // Allow YouTube, Vimeo, local uploads and Cloudinary-hosted files (covers, PDFs) to be embedded
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "media-src 'self' blob: https:; " +
        "object-src 'self' https://res.cloudinary.com; " +
        "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://youtube.com http://localhost:5000 https://res.cloudinary.com; " +
        "connect-src 'self' http://localhost:5000 ws://localhost:5173 https://res.cloudinary.com;",
    },
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
