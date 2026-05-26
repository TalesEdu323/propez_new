import type { Application } from 'express';
import { createApp } from './app.js';

let appPromise: Promise<Application> | null = null;

/**
 * Instância Express partilhada entre invocações (warm starts na Vercel).
 * Não chama attachViteOrStatic — o CDN serve `dist/`; só rotas /api/* chegam aqui.
 */
export function getExpressApp(): Promise<Application> {
  if (!appPromise) {
    appPromise = createApp().then(({ app }) => app);
  }
  return appPromise;
}
