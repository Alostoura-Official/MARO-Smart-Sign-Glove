import { defineConfig } from 'vite'

export default defineConfig({
  base: '/MARO-Smart-Sign-Glove/build/',
  publicDir: 'public',

  build: {
    outDir: 'build',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        simulator: 'محاكي-إيماءات-اليد.html'
      }
    }
  }
})
