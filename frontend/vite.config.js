import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // <--- FONDAMENTALE: permette l'accesso dalla rete locale
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Usa l'IP locale del backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
