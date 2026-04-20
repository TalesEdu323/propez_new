import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Stripe Initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Neon DB Initialization
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function startServer() {
  // Middleware
  app.use(cors());
  
  // Stripe Webhook needs raw body
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Payment successful for session:', session.id);
        // Here you would update the user's subscription in Neon DB
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Regular JSON middleware for other routes
  app.use(express.json());

  // API Routes
  app.get('/api/health', async (req, res) => {
    let dbStatus = false;
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      dbStatus = !!result.rows[0];
    } catch (err) {
      console.error('Database connection error:', err);
    }
    res.json({ status: 'ok', database: dbStatus });
  });

  // Stripe Checkout
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Plano Pro - PropEZ',
                description: 'Acesso ilimitado a todas as funcionalidades premium.',
              },
              unit_amount: 4990, // R$ 49,90
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/configuracoes?success=true`,
        cancel_url: `${process.env.APP_URL}/configuracoes?canceled=true`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications API
  app.get('/api/notifications', async (req, res) => {
    try {
      // Example of fetching from Neon DB
      // const result = await pool.query('SELECT * FROM notifications ORDER BY date DESC LIMIT 10');
      // res.json(result.rows);
      
      // Fallback mock
      const notifications = [
        { id: 1, title: 'Bem-vindo ao PropEZ!', message: 'Obrigado por escolher nossa plataforma para gerenciar suas propostas.', date: new Date().toISOString() },
        { id: 2, title: 'Dica: PWA Instalado', message: 'Você já pode usar o PropEZ como um app nativo no seu celular.', date: new Date().toISOString() },
        { id: 3, title: 'Plano Pro Disponível', message: 'Assine o plano Pro para remover limites e ter acesso a modelos exclusivos.', date: new Date().toISOString() },
      ];
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  });

  // Rubrica Webhook (Contract Signed)
  app.post('/api/webhooks/rubrica', async (req, res) => {
    const { documentId, status, signedAt } = req.body;
    console.log(`[Rubrica Webhook] Document ${documentId} status updated to: ${status}`);
    
    // Here you would update the proposal status in the database
    // await pool.query('UPDATE propostas SET assinado = true WHERE rubrica_doc_id = $1', [documentId]);
    
    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
