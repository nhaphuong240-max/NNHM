export type ConfigEnvReader = {
  get(key: string, defaultValue?: string): string | undefined;
};

/** Nest ConfigService overloads reject `fallback?: string`; normalize to string | undefined. */
export function configEnvReader(config: {
  get(key: string, defaultValue?: string): unknown;
}): ConfigEnvReader {
  return {
    get(key, fallback) {
      const raw = fallback === undefined ? config.get(key) : config.get(key, fallback);
      return typeof raw === 'string' ? raw : fallback;
    },
  };
}
