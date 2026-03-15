/**
 * Vite configuration for SmartAttend frontend
 * - Splits vendor chunks for better caching
 * - Proxies student photo requests to institution server during development
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  build: {
    sourcemap: false,
    // Split large dependencies into separate chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  server: {
    host: true, // Listen on all interfaces for network/mobile access
    // Proxy student photo requests to the institution's photo server during dev
    proxy: {
      '/ACOE/StudentPhotos': {
        target: 'https://info.aec.edu.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ACOE/i, '/acoe'),
      },
      '/ACET/StudentPhotos': {
        target: 'https://info.aec.edu.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ACET/i, '/acet'),
      },
      '/AEC/StudentPhotos': {
        target: 'https://info.aec.edu.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/AEC/i, '/aec'),
      },
    },
  },
})
