import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    rollupOptions: {
      input: {
        home:          resolve(__dirname, 'index.html'),
        'the-name':    resolve(__dirname, 'the-name/index.html'),
        identity:      resolve(__dirname, 'identity/index.html'),
        history:       resolve(__dirname, 'history/index.html'),
        data:          resolve(__dirname, 'data/index.html'),
        'tw-vs-cn':    resolve(__dirname, 'tw-vs-cn/index.html'),
        'make-a-card': resolve(__dirname, 'make-a-card/index.html'),
      },
    },
    outDir: 'dist',
  },
});
