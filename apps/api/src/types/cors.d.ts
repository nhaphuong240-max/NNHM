declare module 'cors' {
  import type { RequestHandler } from 'express';

  function cors(options: { origin?: unknown; credentials?: boolean }): RequestHandler;
  export = cors;
}
