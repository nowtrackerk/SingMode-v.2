
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0' // Listen on all network interfaces for mobile access
  }
});
