import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { FRONTEND_SECURITY_HEADERS } from './src/lib/frontend-security';
import { siteFile } from './src/lib/site-files';

function siteFilesPlugin(): Plugin {
  const siteUrl = process.env.SITE_URL;
  const serve: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const file = siteFile(req.url?.split('?')[0], siteUrl);
      if (!file) {
        next();
        return;
      }
      res.setHeader('Content-Type', file.contentType);
      res.end(file.body);
    });
  };
  return {
    name: 'site-files',
    configureServer: serve,
    configurePreviewServer: serve,
    generateBundle() {
      for (const pathname of ['/robots.txt', '/sitemap.xml']) {
        const file = siteFile(pathname, siteUrl);
        if (!file) continue;
        this.emitFile({
          type: 'asset',
          fileName: pathname.slice(1),
          source: file.body,
        });
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  define:
    command === 'build'
      ? {
          'import.meta.env.VITE_DEV_PREFILL': JSON.stringify(''),
          'import.meta.env.VITE_DEV_PREFILL_EMAIL': JSON.stringify(''),
          'import.meta.env.VITE_DEV_PREFILL_PASSWORD': JSON.stringify(''),
        }
      : undefined,
  plugins: [react(), tailwindcss(), siteFilesPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    headers: FRONTEND_SECURITY_HEADERS,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        // Keep the browser Host. changeOrigin would replace it with 127.0.0.1.
        changeOrigin: false,
      },
    },
  },
  preview: {
    headers: FRONTEND_SECURITY_HEADERS,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
}));
