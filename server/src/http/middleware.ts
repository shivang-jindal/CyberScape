import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { Logger } from '../logger.js';

export interface ApiErrorLike extends Error {
  statusCode?: number;
  code?: string;
}

export function createRequestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        { method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: Math.round(durationMs) },
        'request completed'
      );
    });
    next();
  };
}

/** Replace the request body with the parsed, typed value. */
export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data as z.infer<T>;
    next();
  };
}

/** Replace the query object with the parsed, typed value. */
export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.query = result.data as unknown as Request['query'];
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = result.data;
    next();
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`
    }
  });
}

export function errorHandler(logger: Logger): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err instanceof ZodError) {
      logger.warn({ issues: err.issues, url: req.originalUrl }, 'request validation failed');
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          issues: err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        }
      });
      return;
    }

    const apiError = err as ApiErrorLike;
    const statusCode = apiError.statusCode ?? 500;
    if (statusCode >= 500) {
      logger.error({ err, url: req.originalUrl }, 'unhandled error');
    }
    res.status(statusCode).json({
      error: {
        code: apiError.code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
        message: statusCode >= 500 ? 'Internal server error' : apiError.message
      }
    });
  };
}

/** Wrap async handlers so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
