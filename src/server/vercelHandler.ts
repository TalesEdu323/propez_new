import type { Application } from 'express';
import { createApp } from './app.js';

let appPromise: Promise<Application> | null = null;

/**
 * Instância Express partilhada entre invocações (warm starts na Vercel).
 * Não chama attachViteOrStatic — o CDN serve `dist/`; só rotas /api/* chegam aqui.
 */
export function getExpressApp(): Promise<Application> {
  if (!appPromise) {
    appPromise = createApp()
      .then(({ app }) => app)
      .catch((err) => {
        console.error('[vercel] createApp falhou — verifique env vars e logs da função:', err);
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}
