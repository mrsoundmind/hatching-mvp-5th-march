import { resolveAutonomyTrigger } from "../server/autonomy/triggers/autonomyTriggerResolver.js";
import { FEATURE_FLAGS, BUDGETS } from "../server/autonomy/config/policies.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function run(): void {
  // Test 1: explicit trigger phrase with pending todo tasks
  const result = resolveAutonomyTrigger({
    userMessage: "go ahead and work on this",
    pendingTasks: [{ id: "t1", status: "todo" }],
    autonomyEnabled: true,
    lastUserActivityAt: new Date(),
  });
  assert(result.shouldExecute === true, `shouldExecute should be true, got ${result.shouldExecute}`);
  assert(result.reason === "explicit", `reason should be 'explicit', got ${result.reason}`);
  assert(result.tasksToExecute.includes("t1"), `tasksToExecute should include 't1', got ${JSON.stringify(result.tasksToExecute)}`);

  // Test 2: trigger phrase but only completed tasks → shouldExecute=false
  const result2 = resolveAutonomyTrigger({
    userMessage: "go ahead",
    pendingTasks: [{ id: "t1", status: "completed" }],
    autonomyEnabled: true,
    lastUserActivityAt: new Date(),
  });
  assert(result2.shouldExecute === false, `shouldExecute should be false, got ${result2.shouldExecute}`);
  assert(result2.tasksToExecute.length === 0, `tasksToExecute should be empty, got ${JSON.stringify(result2.tasksToExecute)}`);

  // Test 3: autonomyEnabled=false → shouldExecute=false, reason='none'
  const result3 = resolveAutonomyTrigger({
    userMessage: "go ahead",
    pendingTasks: [{ id: "t1", status: "todo" }],
    autonomyEnabled: false,
    lastUserActivityAt: new Date(),
  });
  assert(result3.shouldExecute === false, `shouldExecute should be false, got ${result3.shouldExecute}`);
  assert(result3.reason === "none", `reason should be 'none', got ${result3.reason}`);

  // Test 4: non-trigger phrase → shouldExecute=false
  const result4 = resolveAutonomyTrigger({
    userMessage: "hello how are you",
    pendingTasks: [{ id: "t1", status: "todo" }],
    autonomyEnabled: true,
    lastUserActivityAt: new Date(),
  });
  assert(result4.shouldExecute === false, `shouldExecute should be false, got ${result4.shouldExecute}`);
  assert(result4.tasksToExecute.length === 0, `tasksToExecute should be empty, got ${JSON.stringify(result4.tasksToExecute)}`);

  // Test 5: no userMessage and no lastUserActivityAt → shouldExecute=false
  const result5 = resolveAutonomyTrigger({
    userMessage: undefined,
    pendingTasks: [{ id: "t1", status: "todo" }],
    autonomyEnabled: true,
    lastUserActivityAt: null,
  });
  assert(result5.shouldExecute === false, `shouldExecute should be false, got ${result5.shouldExecute}`);

  // Test 6: 'take it from here' with mixed tasks → only todo tasks returned
  const result6 = resolveAutonomyTrigger({
    userMessage: "take it from here",
    pendingTasks: [
      { id: "t1", status: "todo" },
      { id: "t2", status: "completed" },
      { id: "t3", status: "todo" },
      { id: "t4", status: "in_progress" },
    ],
    autonomyEnabled: true,
    lastUserActivityAt: new Date(),
  });
  assert(result6.shouldExecute === true, `shouldExecute should be true, got ${result6.shouldExecute}`);
  assert(result6.tasksToExecute.length === 2, `should have 2 todo tasks, got ${result6.tasksToExecute.length}`);
  assert(result6.tasksToExecute.includes("t1"), "should include t1");
  assert(result6.tasksToExecute.includes("t3"), "should include t3");
  assert(!result6.tasksToExecute.includes("t2"), "should not include t2 (completed)");
  assert(!result6.tasksToExecute.includes("t4"), "should not include t4 (in_progress)");

  // Test 7: FEATURE_FLAGS.backgroundExecution exists as boolean
  assert(typeof FEATURE_FLAGS.backgroundExecution === "boolean", `FEATURE_FLAGS.backgroundExecution should be boolean, got ${typeof FEATURE_FLAGS.backgroundExecution}`);

  // Test 8: BUDGETS.maxBackgroundLlmCallsPerProjectPerDay defaults to 5
  assert(BUDGETS.maxBackgroundLlmCallsPerProjectPerDay === 5, `should default to 5, got ${BUDGETS.maxBackgroundLlmCallsPerProjectPerDay}`);

  // Test 9: BUDGETS.maxConcurrentAutonomousTasks defaults to 3
  assert(BUDGETS.maxConcurrentAutonomousTasks === 3, `should default to 3, got ${BUDGETS.maxConcurrentAutonomousTasks}`);

  console.log("PASS: test-execution-trigger — all 9 tests passed.");
  process.exit(0);
}

run();
