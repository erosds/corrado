import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite' // <-- Aggiungi questo
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- E questo
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
