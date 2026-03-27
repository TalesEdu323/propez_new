import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'PropEZ - Propostas Inteligentes',
          short_name: 'PropEZ',
          description: 'Plataforma profissional para criação e gestão de propostas comerciais.',
          theme_color: '#09090b',
          background_color: '#F5F5F7',
          display: 'standalone',
          icons: [
            {
              src: 'https://picsum.photos/192/192?seed=propez',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/512/512?seed=propez',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/512/512?seed=propez',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
