import pino from 'pino';
import type { AppConfig } from './config.js';

export type Logger = pino.Logger;

export function createLogger(config: Pick<AppConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: 'CyberScape-api', env: config.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime
  });
}
