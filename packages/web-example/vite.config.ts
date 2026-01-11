import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vueJsx()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bootstrap: resolve(__dirname, 'bootstrap.html'),
      },
    },
  },
})
