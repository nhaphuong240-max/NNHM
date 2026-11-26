import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { buildRobotsTxt, buildSitemapXml, siteFile } from './site-files.ts';

function serve(siteUrl: string | undefined) {
  const server = http.createServer((req, res) => {
    const file = siteFile(req.url?.split('?')[0], siteUrl);
    if (!file) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><div id="root"></div>');
      return;
    }
    res.writeHead(200, { 'Content-Type': file.contentType });
    res.end(file.body);
  });
  return new Promise<{ port: number; close: () => Promise<void> }>((resolve) => {
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

function fetchHeaders(port: number, path: string) {
  return new Promise<{ status: number; contentType: string | undefined; body: string }>((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          contentType: res.headers['content-type'],
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    }).on('error', reject);
  });
}

describe('site files', () => {
  it('serves robots and sitemap with their own content types', async () => {
    const server = await serve(undefined);
    try {
      const robots = await fetchHeaders(server.port, '/robots.txt');
      const sitemap = await fetchHeaders(server.port, '/sitemap.xml');
      assert.equal(robots.status, 200);
      assert.equal(robots.contentType, 'text/plain; charset=utf-8');
      assert.equal(robots.body.includes('<html'), false);
      assert.match(robots.body, /Disallow: \/login/);
      assert.match(robots.body, /Disallow: \/admin/);
      assert.match(robots.body, /Disallow: \/api/);
      assert.match(robots.body, /Sitemap: \/sitemap\.xml/);
      assert.equal(sitemap.status, 200);
      assert.equal(sitemap.contentType, 'application/xml; charset=utf-8');
      assert.match(sitemap.body, /<loc>\/public\/search<\/loc>/);
      assert.equal(sitemap.body.includes('https://'), false);
    } finally {
      await server.close();
    }
  });

  it('uses SITE_URL when it is an http origin and ignores anything else', () => {
    assert.match(buildRobotsTxt('https://example.test'), /Sitemap: https:\/\/example\.test\/sitemap\.xml/);
    assert.match(buildSitemapXml('https://example.test/ignored'), /<loc>https:\/\/example\.test\/<\/loc>/);
    assert.match(buildRobotsTxt('not a url'), /Sitemap: \/sitemap\.xml/);
    assert.equal(buildSitemapXml('ftp://files.example').includes('ftp:'), false);
  });
});
