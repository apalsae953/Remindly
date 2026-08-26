import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion de Vite. El service worker vive en /public para servirse en la raiz
// del dominio y poder controlar todo el ambito de la aplicacion.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // permite abrir la app desde el movil usando la IP local de la red
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
