import type { CorsOptions } from 'cors';
import type { EnvironmentConfig } from './env.js';

export function createCorsOptions(config: EnvironmentConfig): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}
