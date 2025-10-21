import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
