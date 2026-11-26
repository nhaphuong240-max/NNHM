/** Cross-origin allowlist. Never reflects an arbitrary Origin while credentials are enabled. */

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const;

export type CorsCallback = (err: Error | null, allow?: boolean) => void;

export function allowedCorsOrigins(env: NodeJS.ProcessEnv): string[] {
  const listed = (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
  const origins = new Set(listed);
  if (env.NODE_ENV === 'development') {
    for (const origin of LOCAL_DEV_ORIGINS) origins.add(origin);
  }
  return [...origins];
}

export function createCorsOrigin(env: NodeJS.ProcessEnv) {
  const allowed = new Set(allowedCorsOrigins(env));
  return (origin: string | undefined, callback: CorsCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.has(origin));
  };
}
