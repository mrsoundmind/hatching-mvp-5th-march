/**
 * Tests for extractTasksFallback — keyword-based task detection.
 */

import { extractTasksFallback, extractTasksFromMessage } from '../server/ai/taskExtractor.js';

const agents = ['Product Manager', 'Backend Developer', 'Product Designer'];

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

console.log('\n🧪 extractTasksFallback tests\n');

// Short greeting "hey" should NOT create tasks even when agent response contains "create"
{
  const result = extractTasksFallback('hey', 'I can help prioritize and create a plan to get it done.', agents);
  assert(!result.hasTasks, 'Short greeting "hey" should not trigger tasks');
  assert(result.tasks.length === 0, 'No tasks for "hey"');
}

// extractTasksFromMessage should skip short/casual messages without calling the LLM.
// We verify by checking that no LLM call log appears for short messages.
{
  const originalLog = console.log;
  let llmCalled = false;
  console.log = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('[TEST_MODE]') || msg.includes('generateChat')) {
      llmCalled = true;
    }
  };

  const result = await extractTasksFromMessage('hey', 'What do you want to work on?', {
    projectName: 'Test',
    agentRole: 'Product Manager',
    availableAgents: ['Product Manager'],
  });

  console.log = originalLog;
  assert(!result.hasTasks, 'AI extractor: "hey" should not trigger tasks');
  assert(!llmCalled, 'AI extractor: should NOT call LLM for short messages');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
