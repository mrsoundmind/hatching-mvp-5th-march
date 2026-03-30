// TDD: Tests for backgroundRunner idempotency guard and execution cron

import * as fs from "fs";
import * as path from "path";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function run(): Promise<void> {
  const src = fs.readFileSync(
    path.resolve("server/autonomy/background/backgroundRunner.ts"),
    "utf8"
  );

  // Test 1: _started guard exists at module scope
  assert(
    src.includes("let _started = false"),
    "backgroundRunner.ts must contain `let _started = false` at module scope"
  );

  // Test 2: start() called twice must log "Started" exactly once (idempotent guard)
  // Without the guard, both calls register cron jobs and both print "[BackgroundRunner] Started"
  // With the guard, the second call first stops the existing jobs, then registers once
  const { backgroundRunner } = await import("../server/autonomy/background/backgroundRunner.js");
  const mockDeps = {
    storage: { getProjects: async () => [], getAgentsByProject: async () => [], getTasksByProject: async () => [], getMessagesByConversation: async () => [], countAutonomyEventsForProjectToday: async () => 0, getProject: async () => null },
    broadcastToConversation: () => {},
    generateText: async () => "",
  };

  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args.join(" ")); };

  backgroundRunner.start(mockDeps);
  backgroundRunner.start(mockDeps); // second call — with guard this stops then re-starts once
  backgroundRunner.stop();

  console.log = origLog;

  const startedLogs = logs.filter(l => l.includes("[BackgroundRunner] Started"));
  assert(
    startedLogs.length === 1,
    `start() called twice should only log "[BackgroundRunner] Started" once (idempotent), but got ${startedLogs.length} times`
  );

  // Test 3: backgroundRunner exports runExecutionCycleNow (runtime behavioral test)
  // runExecutionCycleNow wraps runAutonomousExecutionCycle for test use (mirrors runHealthCheckNow pattern)
  const { backgroundRunner: br } = await import("../server/autonomy/background/backgroundRunner.js");
  assert(
    typeof (br as any).runExecutionCycleNow === "function",
    "backgroundRunner must export runExecutionCycleNow() — the function does not exist yet"
  );

  // Test 4: runExecutionCycleNow resolves without throwing when storage returns empty lists
  const mockStorage = {
    getProjects: async () => [],
    getAgentsByProject: async () => [],
    getTasksByProject: async () => [],
    getMessagesByConversation: async () => [],
    countAutonomyEventsForProjectToday: async () => 0,
    getProject: async () => null,
  };
  backgroundRunner.start({ storage: mockStorage, broadcastToConversation: () => {}, generateText: async () => "" });
  await (br as any).runExecutionCycleNow();
  backgroundRunner.stop();

  // Test 5: source registers '*/15 * * * *' execution cron
  assert(
    src.includes("*/15 * * * *"),
    "backgroundRunner.ts must register a '*/15 * * * *' execution cron in start()"
  );

  console.log("PASS: test-background-runner — all 5 tests passed.");
  process.exit(0);
}

run().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
