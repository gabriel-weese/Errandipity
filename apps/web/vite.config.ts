import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // API_PORT lets the web app talk to an API started on a non-default port.
  const apiPort = loadEnv(mode, '.', 'API_').API_PORT ?? '3001';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
  };
});
