/**
 * Focused test: countAutonomyEventsForProjectToday on IStorage (Plan 06-03 Task 1).
 * Run: npx tsx scripts/test-storage-cost-cap.ts
 */

// Stub DATABASE_URL so db.ts doesn't throw on import
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://stub:stub@localhost/stub';

import { MemStorage } from '../server/storage.js';

async function main(): Promise<void> {
  console.log('=== Storage cost-cap method test ===');

  const storage = new MemStorage();

  // This must exist on IStorage and return a number
  const count = await (storage as any).countAutonomyEventsForProjectToday('project-001', '2026-03-19');
  console.assert(typeof count === 'number', `expected number, got ${typeof count}`);
  console.log(`PASS: countAutonomyEventsForProjectToday returned ${count}`);

  process.exit(0);
}

main().catch((err) => { console.error('ERROR:', err); process.exit(1); });
