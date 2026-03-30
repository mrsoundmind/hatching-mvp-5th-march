/**
 * One-time migration: give all existing users a 15-day Pro grace period.
 *
 * Run: npx tsx scripts/migrate-existing-users-grace.ts
 *
 * What it does:
 * - Sets tier = 'pro' for all users
 * - Sets graceExpiresAt = NOW() + 15 days
 * - subscriptionStatus stays 'none' (no Stripe subscription)
 * - tierGate.ts auto-downgrades to 'free' once graceExpiresAt passes
 */

import 'dotenv/config';

async function main() {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const graceDate = new Date();
  graceDate.setDate(graceDate.getDate() + 15);

  const result = await pool.query(
    `UPDATE users
     SET tier = 'pro',
         grace_expires_at = $1
     WHERE subscription_status = 'none'
       AND (grace_expires_at IS NULL OR grace_expires_at < NOW())`,
    [graceDate],
  );

  console.log(`Migrated ${result.rowCount} users → Pro with grace until ${graceDate.toISOString()}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
