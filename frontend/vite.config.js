import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || env.VITE_API_URL || 'http://127.0.0.1:5000';
  const proxy = {
    target,
    changeOrigin: true,
    cookieDomainRewrite: '',
    proxyTimeout: 65000,
    configure(server) {
      server.on('error', (_error, _request, response) => {
        if (response && !response.headersSent && response.writeHead) {
          response.writeHead(503, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ message: 'The workspace service is temporarily unavailable.' }));
        }
      });
    },
  };
  return {
    plugins: [react()],
    server: { proxy: { '/api': { ...proxy }, '/static/uploads': { ...proxy } } },
    preview: { proxy: { '/api': { ...proxy }, '/static/uploads': { ...proxy } } },
  };
});
