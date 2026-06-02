import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { LANDING_SEO } from './src/marketing/siteCopy';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icone.svg', 'logo.svg'],
        manifest: {
          name: LANDING_SEO.title,
          short_name: 'Propez',
          description: LANDING_SEO.description,
          theme_color: '#09090b',
          background_color: '#F5F5F7',
          display: 'standalone',
          icons: [
            {
              src: '/icone.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/icone.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: '/icone.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // HMR em dev: `middlewareMode` + mesmo `http.Server` do Express em `attachViteOrStatic` (app.ts).
    // Evita bind extra na porta 24678. Para desligar HMR: DISABLE_HMR=true no ambiente.
  };
});
