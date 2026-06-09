import type { NextFunction, Request, Response } from 'express';
import { captureUnhandledErrorDetail } from './services/apiErrorTracking.js';

/**
 * Error handler global. Deve ser registrado por último, após todas as rotas.
 * Respeita respostas já enviadas, delegando para o default handler do Express.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  console.error('Unhandled server error:', error);
  captureUnhandledErrorDetail(error, res);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
