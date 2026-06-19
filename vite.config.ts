import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite produit le dossier dist/ que Capacitor copie ensuite dans android/
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  server: { host: true, port: 5173 },
});
