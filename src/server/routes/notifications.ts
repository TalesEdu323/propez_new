import express from 'express';
import type { Request, Response, Router } from 'express';

export function createNotificationsRouter(): Router {
  const router = express.Router();

  router.get('/notifications', async (_req: Request, res: Response) => {
    try {
      const notifications = [
        { id: 1, title: 'Bem-vindo ao PropEZ!', message: 'Obrigado por escolher nossa plataforma para gerenciar suas propostas.', date: new Date().toISOString() },
        { id: 2, title: 'Dica: PWA Instalado', message: 'Você já pode usar o PropEZ como um app nativo no seu celular.', date: new Date().toISOString() },
        { id: 3, title: 'Plano Pro Disponível', message: 'Assine o plano Pro para remover limites e ter acesso a modelos exclusivos.', date: new Date().toISOString() },
      ];
      res.json(notifications);
    } catch (_error) {
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  });

  return router;
}
