/**
 * RED phase test: autonomous safety scoring — Test 1
 * Fails because evaluateSafetyScore does not yet accept executionContext
 * and does not boost executionRisk for autonomous_task.
 */
import { evaluateSafetyScore, AUTONOMOUS_SAFETY_THRESHOLDS } from '../server/ai/safety.js';

const autonomous = evaluateSafetyScore({
  userMessage: 'write a project plan',
  conversationMode: 'project',
  executionContext: 'autonomous_task',
});

if (autonomous.executionRisk < 0.20) {
  console.error(`FAIL: autonomous_task must boost executionRisk >= 0.20, got ${autonomous.executionRisk}`);
  process.exit(1);
}

console.log(`PASS: autonomous executionRisk = ${autonomous.executionRisk}`);

// Test 2: executionContext: 'chat' behaves identically to omitting executionContext [RED]
const defaultScore = evaluateSafetyScore({
  userMessage: 'write a project plan',
  conversationMode: 'project',
});

const chatScore = evaluateSafetyScore({
  userMessage: 'write a project plan',
  conversationMode: 'project',
  executionContext: 'chat',
});

if (chatScore.executionRisk !== defaultScore.executionRisk) {
  console.error(`FAIL [2]: executionContext:'chat' must equal default; got ${chatScore.executionRisk} vs ${defaultScore.executionRisk}`);
  process.exit(1);
}
console.log(`PASS [2]: chat context matches default executionRisk = ${chatScore.executionRisk}`);

// Test 3: risky message + autonomous_task stacks to >= 0.35 [RED]
const riskyAutonomous = evaluateSafetyScore({
  userMessage: 'delete production deploy',
  conversationMode: 'project',
  executionContext: 'autonomous_task',
});

if (riskyAutonomous.executionRisk < 0.35) {
  console.error(`FAIL [3]: risky+autonomous_task must have executionRisk >= 0.35, got ${riskyAutonomous.executionRisk}`);
  process.exit(1);
}
console.log(`PASS [3]: risky+autonomous executionRisk = ${riskyAutonomous.executionRisk}`);

// Test 4: AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk === 0.60 [RED]
if (AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk !== 0.60) {
  console.error(`FAIL [4]: AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk must be 0.60, got ${AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk}`);
  process.exit(1);
}
console.log(`PASS [4]: clarificationRequiredRisk = ${AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk}`);

// Test 5: AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger === 0.35 [RED→GREEN]
if (AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger !== 0.35) {
  console.error(`FAIL [5]: AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger must be 0.35, got ${AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger}`);
  process.exit(1);
}
console.log(`PASS [5]: peerReviewTrigger = ${AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger}`);
