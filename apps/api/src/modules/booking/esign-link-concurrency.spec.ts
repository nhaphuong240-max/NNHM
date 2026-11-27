import { Client } from 'pg';
import { ADVISORY_LOCK_SQL } from './esign-otp-atomic';

const url = process.env.DATABASE_URL ?? '';
const run = Boolean(url) && (process.env.ESIGN_CONCURRENCY_PG === '1' || process.env.CI === 'true');

describe('esign link advisory lock on postgres', () => {
  const itPg = run ? it : it.skip;

  itPg('serializes two transactions on the same key and unlocks on commit', async () => {
    const a = new Client({ connectionString: url });
    const b = new Client({ connectionString: url });
    await a.connect();
    await b.connect();
    try {
      await a.query('BEGIN');
      await a.query(ADVISORY_LOCK_SQL, ['esign-link:ten_b:ctr_b:usr_buyer']);
      const started = Date.now();
      let bLocked = false;
      const waiter = (async () => {
        await b.query('BEGIN');
        await b.query(ADVISORY_LOCK_SQL, ['esign-link:ten_b:ctr_b:usr_buyer']);
        bLocked = true;
        await b.query('COMMIT');
      })();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(bLocked).toBe(false);
      await a.query('COMMIT');
      await waiter;
      expect(bLocked).toBe(true);
      expect(Date.now() - started).toBeGreaterThan(150);
    } finally {
      await a.end();
      await b.end();
    }
  }, 15_000);
});
