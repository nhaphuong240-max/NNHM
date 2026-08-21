import { useEffect } from 'react';

export type PageMeta = {
  title: string;
  description?: string;
  canonical?: string;
};

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    if (meta.description) {
      upsertMeta('description', meta.description);
      upsertMeta('og:description', meta.description, 'property');
    }
    upsertMeta('og:title', meta.title, 'property');
    if (meta.canonical) upsertCanonical(meta.canonical);
  }, [meta.title, meta.description, meta.canonical]);
}
