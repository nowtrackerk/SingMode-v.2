import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}', '**/*.jpeg'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'SingMode v.2',
        short_name: 'SingMode',
        description: 'Advanced Karaoke Queue and Display System',
        theme_color: '#ff2a6d',
        background_color: '#050510',
        display: 'standalone',
        icons: [
          {
            src: 'IGK.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'IGK.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
  base: '/SingMode-v.2/',
  define: {
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
