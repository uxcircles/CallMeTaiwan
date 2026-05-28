import { resolve } from 'path';
import { defineConfig } from 'vite';

// In dev, Vite serves /the-name/ (with slash) correctly but /the-name (no slash)
// falls back to root index.html. This plugin redirects bare slugs to their
// trailing-slash form so the browser lands on the right page.
const PAGES = ['the-name', 'identity', 'history', 'renamed', 'data', 'tw-vs-cn', 'make-a-card'];

function trailingSlashPlugin() {
  return {
    name: 'mpa-trailing-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (PAGES.some(p => pathname === `/${p}`)) {
          res.writeHead(302, { Location: pathname + '/' });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',
  plugins: [trailingSlashPlugin()],
  build: {
    rollupOptions: {
      input: {
        home:          resolve(__dirname, 'index.html'),
        'the-name':    resolve(__dirname, 'the-name/index.html'),
        identity:      resolve(__dirname, 'identity/index.html'),
        history:       resolve(__dirname, 'history/index.html'),
        renamed:       resolve(__dirname, 'renamed/index.html'),
        data:          resolve(__dirname, 'data/index.html'),
        'tw-vs-cn':    resolve(__dirname, 'tw-vs-cn/index.html'),
        'make-a-card': resolve(__dirname, 'make-a-card/index.html'),
      },
    },
    outDir: 'dist',
  },
});
