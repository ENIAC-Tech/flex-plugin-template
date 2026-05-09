import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/frontend'),
  base: './',
  plugins: [
    vue({ template: { transformAssetUrls } }),
    vuetify({ autoImport: true })
  ],
  build: {
    outDir: resolve(__dirname, 'dist/src/frontend'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'unit-function-editor': resolve(__dirname, 'src/frontend/unit-function-editor.html'),
        'unit-appearance-editor': resolve(__dirname, 'src/frontend/unit-appearance-editor.html'),
        'unit-view': resolve(__dirname, 'src/frontend/unit-view.html'),
        'config-page': resolve(__dirname, 'src/frontend/config-page.html')
      }
    }
  }
});
