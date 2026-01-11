import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          ui: ['lucide-react', '@headlessui/react']
        }
      }
    }
  },
  define: {
    // Define environment variables for build
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  server: {
    port: 3000,
    host: true
  }
})
