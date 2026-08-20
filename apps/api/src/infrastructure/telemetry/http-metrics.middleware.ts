import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { httpRequestDuration, httpRequestsTotal } from './prometheus.registry';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url || '';
    if (path.includes('/metrics') || path.includes('/health/live')) {
      next();
      return;
    }

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const elapsedSec = Number(process.hrtime.bigint() - start) / 1e9;
      const route = normalizeRoute(req.path || path);
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, elapsedSec);
    });
    next();
  }
}

function normalizeRoute(path: string): string {
  return path
    .replace(/\/[a-f0-9-]{8,36}/gi, '/:id')
    .replace(/\/[a-z]+_[a-z0-9]+/gi, '/:id');
}
