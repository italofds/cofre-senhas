import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' faz o app funcionar tanto na raiz quanto em um subcaminho
// do GitHub Pages (ex.: https://usuario.github.io/cofre/). Se preferir,
// troque por '/nome-do-repo/'.
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Cofre — Gerenciador de Senhas',
        short_name: 'Cofre',
        description: 'Gerenciador de senhas offline e criptografado.',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#0f1211',
        background_color: '#0f1211',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        file_handlers: [
          {
            action: './',
            accept: { 'application/octet-stream': ['.cofre'] },
            launch_type: 'single-client'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,ico}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
});
