/** Explicit local switch. Production, staging, and an empty NODE_ENV must not boot with it. */
export function allowDefaultTenant(): boolean {
  const env = process.env.NODE_ENV ?? '';
  return process.env.ALLOW_DEFAULT_TENANT === 'true' && (env === 'development' || env === 'test');
}

export function refuseDefaultTenantAtBoot(): void {
  if (process.env.ALLOW_DEFAULT_TENANT !== 'true') return;
  const env = process.env.NODE_ENV ?? '';
  if (env === 'production' || env === 'staging' || env === '') {
    throw new Error(
      'Refusing to start: ALLOW_DEFAULT_TENANT=true while NODE_ENV is production, staging, or empty',
    );
  }
}
