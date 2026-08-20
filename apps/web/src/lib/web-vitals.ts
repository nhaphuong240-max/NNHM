/** RUM — report LCP to console + optional beacon (target < 2.5s). */
export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== 'largest-contentful-paint') continue;
        const lcpMs = Math.round(entry.startTime);
        const target = Number(getComputedStyle(document.documentElement).getPropertyValue('--lcp-target-ms')) || 2500;
        const ok = lcpMs <= target;
        console.info(`[web-vitals] LCP=${lcpMs}ms target=${target}ms ${ok ? 'PASS' : 'SLOW'}`);
        window.dispatchEvent(new CustomEvent('wereal:lcp', { detail: { lcpMs, ok, target } }));
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* unsupported */
  }
}
