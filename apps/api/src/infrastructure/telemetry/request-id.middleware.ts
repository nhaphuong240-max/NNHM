import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId =
      (typeof incoming === 'string' && incoming.trim()) || `req_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    (req as Request & { requestId?: string }).requestId = requestId;
    next();
  }
}
