import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://www.gstatic.com https://*.googleapis.com https://all-in-one-virtual-travel-guide-production.up.railway.app; frame-src 'self' https://www.google.com https://maps.google.com;",
    },
  },
  build: {
    sourcemap: true,
  },
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
      process.env.VITE_BACKEND_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app'
    ),
  },
});
