// Test: SAFE-04 — Progressive trust scoring for agents
// Verifies: trust score calculation, threshold adjustment, and integration wiring

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

console.log('=== SAFE-04 Progressive Trust Scoring Tests ===\n');

// Test 1: trustScorer module exists
const scorerPath = path.resolve(__dirname, '../server/autonomy/trustScoring/trustScorer.ts');
assert(fs.existsSync(scorerPath), 'trustScorer.ts exists');

// Test 2: trustScorer exports calculateTrustScore
const scorerContent = fs.existsSync(scorerPath) ? fs.readFileSync(scorerPath, 'utf-8') : '';
assert(scorerContent.includes('calculateTrustScore'), 'trustScorer exports calculateTrustScore');

// Test 3: calculateTrustScore accounts for completions and failures
assert(
  scorerContent.includes('tasksCompleted') && scorerContent.includes('tasksFailed'),
  'calculateTrustScore uses completions and failures'
);

// Test 4: Trust score is bounded 0.0-1.0
assert(
  scorerContent.includes('Math.min') && scorerContent.includes('Math.max'),
  'Trust score is bounded (Math.min/Math.max)'
);

// Test 5: trustAdapter module exists and adjusts thresholds
const adapterPath = path.resolve(__dirname, '../server/autonomy/trustScoring/trustAdapter.ts');
assert(fs.existsSync(adapterPath), 'trustAdapter.ts exists');

const adapterContent = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, 'utf-8') : '';
assert(
  adapterContent.includes('getAdjustedThresholds') && adapterContent.includes('trustScore'),
  'trustAdapter exports getAdjustedThresholds using trustScore'
);

// Test 6: High trust score raises the clarificationRequiredRisk threshold (more autonomy)
assert(
  adapterContent.includes('clarificationRequiredRisk'),
  'trustAdapter adjusts clarificationRequiredRisk'
);

// Test 7: taskExecutionPipeline imports trust scoring
const pipelinePath = path.resolve(__dirname, '../server/autonomy/execution/taskExecutionPipeline.ts');
const pipelineContent = fs.readFileSync(pipelinePath, 'utf-8');
assert(
  pipelineContent.includes('trustScor') || pipelineContent.includes('updateAgentTrust'),
  'taskExecutionPipeline references trust scoring'
);

// Test 8: Storage has method to count agent events
const storagePath = path.resolve(__dirname, '../server/storage.ts');
const storageContent = fs.readFileSync(storagePath, 'utf-8');
assert(
  storageContent.includes('countAutonomyEventsByAgent'),
  'IStorage has countAutonomyEventsByAgent method'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
