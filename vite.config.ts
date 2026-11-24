import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/bmg-trading-post/',
  build: {
    rollupOptions: {
      input: {
        main: `${root}index.html`,
        playerForm: `${root}player-form.html`,
        admin: `${root}admin.html`,
      },
    },
  },
});
