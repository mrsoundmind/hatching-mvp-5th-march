/**
 * Test suite: Handoff Announcement Messages
 * Tests for server/autonomy/handoff/handoffAnnouncement.ts
 *
 * Run: npx tsx scripts/test-handoff-messages.ts
 */

import { emitHandoffAnnouncement } from '../server/autonomy/handoff/handoffAnnouncement.js';

// --- Mock helpers ---

function makeMockStorage() {
  const calls: { args: unknown[] }[] = [];
  const mock = {
    createMessage: async (msg: unknown) => {
      calls.push({ args: [msg] });
      return {
        id: 'msg-test-1',
        conversationId: 'project:proj-1',
        content: (msg as any).content,
        messageType: (msg as any).messageType,
        agentId: (msg as any).agentId,
        userId: null,
        metadata: (msg as any).metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentMessageId: null,
        replyCount: 0,
        isArchived: false,
      };
    },
    _calls: calls,
  };
  return mock;
}

function makeMockBroadcast() {
  const calls: { convId: string; payload: unknown }[] = [];
  const fn = (convId: string, payload: unknown) => {
    calls.push({ convId, payload });
  };
  (fn as any)._calls = calls;
  return fn as ((convId: string, payload: unknown) => void) & { _calls: typeof calls };
}

function makeCleanGenerateText(text = 'Done with the scope doc, @Engineer can take it from here.') {
  return async (_prompt: string, _system: string): Promise<string> => text;
}

// --- Test helpers ---

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// --- Test data ---

const completedAgent = { id: 'agent-pm-1', name: 'Maya', role: 'Product Manager' };
const nextAgent = { id: 'agent-eng-1', name: 'Engineer', role: 'Software Engineer' };
const completedTaskTitle = 'Write product scope document';
const projectId = 'proj-1';
const conversationId = 'project:proj-1';

// --- Test 1: createMessage called with messageType: 'agent' and correct agentId ---

console.log('\nTest 1: createMessage called with messageType="agent" and completing agent ID');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = makeCleanGenerateText();

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  assert(storage._calls.length === 1, 'createMessage called exactly once');
  const msgArg = storage._calls[0].args[0] as any;
  assert(msgArg.messageType === 'agent', 'messageType is "agent"');
  assert(msgArg.agentId === completedAgent.id, `agentId is completing agent's ID (${completedAgent.id})`);
}

// --- Test 2: metadata.isHandoffAnnouncement: true and nextAgentId set ---

console.log('\nTest 2: metadata.isHandoffAnnouncement and metadata.nextAgentId');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = makeCleanGenerateText();

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  const msgArg = storage._calls[0].args[0] as any;
  assert(msgArg.metadata?.isHandoffAnnouncement === true, 'metadata.isHandoffAnnouncement is true');
  assert(msgArg.metadata?.nextAgentId === nextAgent.id, `metadata.nextAgentId is next agent's ID (${nextAgent.id})`);
}

// --- Test 3: metadata.isAutonomous: true ---

console.log('\nTest 3: metadata.isAutonomous is true');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = makeCleanGenerateText();

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  const msgArg = storage._calls[0].args[0] as any;
  assert(msgArg.metadata?.isAutonomous === true, 'metadata.isAutonomous is true');
}

// --- Test 4: broadcastToConversation called with type: 'new_message' ---

console.log('\nTest 4: broadcastToConversation called with type="new_message"');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = makeCleanGenerateText();

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  assert(broadcast._calls.length === 1, 'broadcastToConversation called exactly once');
  const callArg = broadcast._calls[0];
  assert(callArg.convId === conversationId, 'broadcast convId matches conversationId');
  assert((callArg.payload as any)?.type === 'new_message', 'broadcast payload type is "new_message"');
  assert((callArg.payload as any)?.message !== undefined, 'broadcast payload contains message');
}

// --- Test 5: Clean announcement has no markdown headers or bullet points ---

console.log('\nTest 5: Clean announcement has no markdown headers or bullet points');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = makeCleanGenerateText('Done with the scope doc, @Engineer can take it from here.');

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  const msgArg = storage._calls[0].args[0] as any;
  assert(!(/^#+\s/m.test(msgArg.content)), 'content has no markdown headers (##)');
  assert(!(/^\*+\s/m.test(msgArg.content)), 'content has no bold bullet lines (***)');
  assert(!(/^-\s/m.test(msgArg.content)), 'content has no dash bullet points (- )');
}

// --- Test 6: Prompt includes completing agent name, role, task title, and next agent name ---

console.log('\nTest 6: Prompt includes key context (agent name, role, task title, next agent name)');
{
  let capturedPrompt = '';
  let capturedSystem = '';

  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = async (prompt: string, system: string): Promise<string> => {
    capturedPrompt = prompt;
    capturedSystem = system;
    return 'Done with the scope doc, @Engineer can take it from here.';
  };

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  assert(capturedPrompt.includes(completedAgent.name), `prompt includes completing agent name (${completedAgent.name})`);
  assert(capturedPrompt.includes(completedAgent.role), `prompt includes completing agent role (${completedAgent.role})`);
  assert(capturedPrompt.includes(completedTaskTitle), 'prompt includes task title');
  assert(capturedPrompt.includes(nextAgent.name), `prompt includes next agent name (${nextAgent.name})`);
  assert(capturedSystem.includes(completedAgent.name), 'system prompt includes completing agent name');
}

// --- Test 7: Markdown-heavy LLM output is stripped by post-processing ---

console.log('\nTest 7: Markdown from LLM output is stripped by post-processing');
{
  const storage = makeMockStorage();
  const broadcast = makeMockBroadcast();
  const generateText = async (_prompt: string, _system: string): Promise<string> =>
    '## Summary\n- Finished the scope\n- **Tagging** @Engineer';

  await emitHandoffAnnouncement({
    completedAgent,
    nextAgent,
    completedTaskTitle,
    projectId,
    conversationId,
    storage: storage as any,
    broadcastToConversation: broadcast,
    generateText,
  });

  const msgArg = storage._calls[0].args[0] as any;
  assert(!(/^#+\s/m.test(msgArg.content)), 'markdown headers stripped from output');
  assert(!(/^\*+\s/m.test(msgArg.content)), 'bullet asterisks stripped from output');
  assert(!(/^-\s/m.test(msgArg.content)), 'dash bullets stripped from output');
  assert(!(/\*\*/g.test(msgArg.content)), 'bold markers (**) stripped from output');
}

// --- Summary ---

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
