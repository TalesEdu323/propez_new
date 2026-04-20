import type { NextFunction, Request, Response } from 'express';

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
  res.status(500).json({ error: 'Erro interno do servidor' });
}
