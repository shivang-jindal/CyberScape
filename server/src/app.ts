import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import type { AppConfig } from './config.js';
import type { Logger } from './logger.js';
import { apiRouter } from './http/routes.js';
import { createRequestLogger, errorHandler, notFoundHandler } from './http/middleware.js';

export interface AppDependencies {
  config: AppConfig;
  logger: Logger;
}

/**
 * Build the Express application. Kept separate from the HTTP listener so tests
 * can exercise the full middleware stack without binding a port.
 */
export function createApp({ config, logger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(createRequestLogger(logger));

  if (config.NODE_ENV !== 'test') {
    app.use(
      rateLimit({
        windowMs: config.RATE_LIMIT_WINDOW_MS,
        limit: config.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false
      })
    );
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  });

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
