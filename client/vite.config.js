import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, Vite serves the UI on :5173 and proxies Socket.io traffic to the game
// server on :3001, so the client can always connect to its own origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // expose on your LAN so phones can join
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
