/** T21. Seed a TOTP secret only in an explicit sandbox. Never log the secret. */
export function mfaSandboxSeedAllowed(env: string | undefined, flag: string | undefined): boolean {
  if (env !== 'development' && env !== 'test') return false;
  return flag === 'true';
}
