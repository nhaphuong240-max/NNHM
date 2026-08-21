import { mediaCdnBaseFromEnv, resolveMediaPublicUrl } from './media-cdn.util';

describe('resolveMediaPublicUrl', () => {
  it('returns null for empty', () => {
    expect(resolveMediaPublicUrl(null, 'https://cdn.test')).toBeNull();
  });

  it('passes through absolute URLs', () => {
    expect(resolveMediaPublicUrl('https://img.test/a.jpg', 'https://cdn.test')).toBe(
      'https://img.test/a.jpg',
    );
  });

  it('prefixes relative API media paths', () => {
    expect(
      resolveMediaPublicUrl('/api/v1/listings/ls_01/media/md_01/file', 'https://ngoinhahomnay.vn'),
    ).toBe('https://ngoinhahomnay.vn/api/v1/listings/ls_01/media/md_01/file');
  });

  it('leaves relative when no CDN base', () => {
    expect(resolveMediaPublicUrl('/api/v1/x', undefined)).toBe('/api/v1/x');
  });
});

describe('mediaCdnBaseFromEnv', () => {
  it('prefers MEDIA_CDN_BASE', () => {
    expect(mediaCdnBaseFromEnv({ MEDIA_CDN_BASE: 'https://a', PUBLIC_SITE_URL: 'https://b' })).toBe(
      'https://a',
    );
  });
});
