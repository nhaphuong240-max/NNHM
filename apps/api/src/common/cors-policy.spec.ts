import * as http from 'http';
// cors and express are CommonJS exports. This project does not enable esModuleInterop.
/* eslint-disable @typescript-eslint/no-require-imports */
import cors = require('cors');
import express = require('express');
/* eslint-enable @typescript-eslint/no-require-imports */
import { allowedCorsOrigins, createCorsOrigin } from './cors-policy';
import { applySecurityHeaders } from './security-headers';

function listen(app: express.Express): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('missing port');
      resolve({
        port: address.port,
        close: () => new Promise((done, reject) => server.close((err) => (err ? reject(err) : done()))),
      });
    });
  });
}

function request(
  port: number,
  headers: Record<string, string>,
): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/probe', headers }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('cors policy', () => {
  it('rejects a foreign origin and does not echo it', async () => {
    const app = express();
    app.disable('x-powered-by');
    app.use(cors({ origin: createCorsOrigin({ NODE_ENV: 'production' }), credentials: true }));
    app.get('/probe', (_req, res) => res.status(204).end());
    const server = await listen(app);
    try {
      const response = await request(server.port, { Origin: 'https://evil.example' });
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it('accepts an origin that is on the allowlist', async () => {
    const app = express();
    app.use(
      cors({
        origin: createCorsOrigin({
          NODE_ENV: 'production',
          CORS_ALLOWED_ORIGINS: 'https://app.example',
        }),
        credentials: true,
      }),
    );
    app.get('/probe', (_req, res) => res.status(204).end());
    const server = await listen(app);
    try {
      const response = await request(server.port, { Origin: 'https://app.example' });
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    } finally {
      await server.close();
    }
  });

  it('rejects every cross-origin request when the allowlist is missing outside development', () => {
    expect(allowedCorsOrigins({ NODE_ENV: 'production' })).toEqual([]);
    expect(allowedCorsOrigins({ NODE_ENV: 'test' })).toEqual([]);
    expect(allowedCorsOrigins({})).toEqual([]);
    const decide = createCorsOrigin({ NODE_ENV: 'production' });
    decide('http://localhost:5174', (_err, allow) => {
      expect(allow).toBe(false);
    });
  });

  it('adds localhost only when NODE_ENV is development', () => {
    const origins = allowedCorsOrigins({ NODE_ENV: 'development' });
    expect(origins).toContain('http://localhost:5174');
    expect(origins).toContain('http://127.0.0.1:4173');
    expect(origins).not.toContain('https://evil.example');
    expect(allowedCorsOrigins({ NODE_ENV: 'development', CORS_ALLOWED_ORIGINS: '*' })).not.toContain('*');
  });
});

describe('api security headers', () => {
  it('sets the baseline headers, hides the server name, and sends HSTS only on HTTPS', async () => {
    const app = express();
    app.disable('x-powered-by');
    app.use(applySecurityHeaders);
    app.get('/probe', (_req, res) => res.status(204).end());
    const server = await listen(app);
    try {
      const plain = await request(server.port, {});
      expect(plain.headers['x-powered-by']).toBeUndefined();
      expect(plain.headers['x-content-type-options']).toBe('nosniff');
      expect(plain.headers['x-frame-options']).toBe('DENY');
      expect(plain.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(plain.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()');
      expect(plain.headers['strict-transport-security']).toBeUndefined();
    } finally {
      await server.close();
    }

    const secure = express();
    secure.disable('x-powered-by');
    secure.enable('trust proxy');
    secure.use(applySecurityHeaders);
    secure.get('/probe', (_req, res) => res.status(204).end());
    const tls = await listen(secure);
    try {
      const response = await request(tls.port, { 'X-Forwarded-Proto': 'https' });
      expect(response.headers['strict-transport-security']).toBe('max-age=15552000');
      expect(String(response.headers['strict-transport-security'])).not.toContain('includeSubDomains');
      expect(String(response.headers['strict-transport-security'])).not.toContain('preload');
    } finally {
      await tls.close();
    }
  });

  it('ignores a forwarded https scheme when trust proxy is off', async () => {
    const app = express();
    app.use(applySecurityHeaders);
    app.get('/probe', (_req, res) => res.status(204).end());
    const server = await listen(app);
    try {
      const response = await request(server.port, { 'X-Forwarded-Proto': 'https' });
      expect(response.headers['strict-transport-security']).toBeUndefined();
    } finally {
      await server.close();
    }
  });
});
