import dotenv from 'dotenv';
import { createApp, attachViteOrStatic } from './src/server/app.js';

dotenv.config();

async function startServer() {
  const { app, config } = await createApp();
  await attachViteOrStatic(app, config.nodeEnv);

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
