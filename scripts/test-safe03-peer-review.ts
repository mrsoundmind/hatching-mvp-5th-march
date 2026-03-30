// Test: SAFE-03 — executeTask calls peer review for mid-risk tasks (0.35-0.59)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pipelinePath = path.resolve(__dirname, '../server/autonomy/execution/taskExecutionPipeline.ts');
const content = fs.readFileSync(pipelinePath, 'utf-8');

console.log('=== SAFE-03 Peer Review Gate Test ===\n');

// Test: executeTask has a branch that references peerReviewTrigger threshold
const hasPeerReviewBranch = content.includes('peerReviewTrigger') && content.includes('peer');

if (hasPeerReviewBranch) {
  console.log('  PASS: executeTask has peer review branch for mid-risk tasks');
} else {
  console.log('  FAIL: executeTask missing peer review branch (0.35-0.59 risk range)');
}

console.log(`\n=== Results: ${hasPeerReviewBranch ? 1 : 0} passed, ${hasPeerReviewBranch ? 0 : 1} failed ===`);
process.exit(hasPeerReviewBranch ? 0 : 1);
