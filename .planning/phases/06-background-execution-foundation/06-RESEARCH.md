# Phase 6: Background Execution Foundation - Research

**Researched:** 2026-03-19
**Domain:** Durable job queuing (pg-boss), autonomous task execution pipeline, safety scoring extension, backgroundRunner hardening
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | User can explicitly trigger autonomous execution by telling a Hatch to "go ahead and work on this" | AutonomyTriggerResolver parses trigger phrases from WS `send_message_streaming` handler post-processing; chat.ts modification documented |
| EXEC-02 | Hatches execute tasks in background via durable job queue (pg-boss), producing real output (plans, breakdowns, research) | pg-boss v12.14.0 confirmed on npm; `pg` v8.13.1 already installed as transitive dep — no compatibility blocker; TaskExecutionPipeline calls `generateText` directly (not `runTurn`), stores output as agent message |
| EXEC-03 | Per-project daily LLM spend cap prevents runaway cost from background execution | `policies.ts` has no cost cap today — must add `MAX_BACKGROUND_LLM_CALLS_PER_PROJECT_PER_DAY` constant and enforcement in `runAutonomousExecutionCycle`; tracked via `autonomy_events` by `projectId + date` |
| SAFE-01 | Low-risk autonomous actions execute without approval; high-risk actions surface for user sign-off | Existing `evaluateSafetyScore` thresholds: auto-execute < 0.35, peer review 0.35–0.59, block >= 0.60 (stricter autonomous threshold vs 0.70 chat threshold); task status set to `blocked` + WS event emitted for approval path |
| SAFE-02 | Safety scoring adapted for autonomous context (no user message) with appropriate baseline risk | `evaluateSafetyScore` currently requires `userMessage: string` — passing empty string gives misleadingly low baseline; must add optional `executionContext?: 'autonomous_task'` parameter that raises `executionRisk` baseline by +0.10 and uses stricter 0.60 clarification threshold |
| SAFE-03 | Autonomous outputs undergo peer review by another Hatch before delivery | `peerReviewRunner.ts` is production-ready and reusable; call `runPeerReview()` from `TaskExecutionPipeline` when safety score is 0.35–0.59; no changes to peerReviewRunner.ts needed |
| UX-02 | "Team is working..." presence indicator visible in chat during autonomous execution | New `background_execution_started` and `background_execution_completed` WS events; frontend `useRealTimeUpdates` subscribes and shows status badge; dismissed on completion event |

</phase_requirements>

---

## Summary

Phase 6 builds the missing entry point and execution loop for Hatchin's autonomy layer. The v1.0 platform ships with safety scoring, peer review, task graph engine, background cron runner, and event logging — but no code path that takes a task from "user says go ahead" to "Hatch produces output stored as a message." This phase bridges that gap.

The technical surface is narrow and well-bounded: one new package (`pg-boss` for durable job queuing), four new server modules (`AutonomyTriggerResolver`, `TaskExecutionPipeline`, `taskGraphPersistence.ts`, cron extension to `backgroundRunner.ts`), and targeted modifications to three existing files (`safety.ts`, `policies.ts`, `chat.ts`). No new DB tables are required for this phase — existing tables (`tasks`, `messages`, `autonomy_events`) handle all persistence.

The critical implementation constraint is that background execution must NOT call `runTurn` or `graph.invoke`. It must call `generateText` directly. This is because `runTurn` uses `MemorySaver` keyed by `thread_id` — background execution has no active conversation thread and would corrupt in-memory state. All safety guardrails (cost cap, handoff cycle detection, autonomous safety threshold, duplicate cron job guard, stalled task recovery) must be in place before any real LLM call is made in autonomous context.

**Primary recommendation:** Build in this order: `AutonomyTriggerResolver` (pure, no deps) → `policies.ts` additions → `safety.ts` extension → `taskGraphPersistence.ts` → pg-boss setup → `TaskExecutionPipeline` → `backgroundRunner.ts` cron addition → `chat.ts` trigger hook. Each layer is a prerequisite for the next. Do not skip the cost cap or duplicate cron guard — they prevent production incidents the first time `BACKGROUND_AUTONOMY_ENABLED=true` is set.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pg-boss` | 12.14.0 (latest) | Durable job queue backed by PostgreSQL | Survives process restarts; retries; dead-letter queue; deduplication; runs on existing Neon PostgreSQL — no new infrastructure |
| `pg` | 8.13.1 (already installed) | Node.js PostgreSQL driver for pg-boss | pg-boss requires the standard `pg` driver — confirmed already present as transitive dep (`connect-pg-simple` depends on it) |
| `p-queue` | 6.6.2 (already installed) | In-process concurrency control for LLM calls | Prevents Gemini rate limit bursts when multiple background tasks fire in the same cycle; already a transitive dep |
| `eventemitter3` | 4.0.7 (already installed) | Internal event bus for execution progress | Bridges pg-boss worker to WS broadcast layer without Redis pub/sub; already a transitive dep |

### Already Installed — Use As-Is

| Library | Version | Role in Phase 6 |
|---------|---------|----------------|
| `node-cron` | 4.2.1 | Keep for existing health check (2h) and world sensor (6h) cron jobs; do NOT replace with pg-boss |
| `drizzle-orm` | 0.39.1 | All persistence through existing tables — no migration needed for Phase 6 |
| `zod` | 3.24.2 | Validate all inter-agent task payloads before processing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pg-boss` | BullMQ + Redis | Only if app outgrows single-node and needs Redis for WS clustering anyway; at MVP scale, pg-boss on existing Neon is zero added infrastructure |
| `pg-boss` | In-process queue with `p-queue` + tasks table | Zero new package; less durable (no retry/dead-letter); acceptable fallback ONLY if pg-boss has an unforeseen incompatibility |
| Direct `generateText` call | `runTurn` / `graph.invoke` | runTurn corrupts MemorySaver state in background context; generateText is the correct path for autonomous execution |

**Installation:**
```bash
npm install pg-boss
```

**pg-boss driver note (VERIFIED):** pg-boss v12.14.0 requires `pg: ^8.19.0` as a peer dependency. The project has `pg@8.13.1` installed as a transitive dep (via `connect-pg-simple`). Version 8.13.1 satisfies the `^8` range. pg-boss manages its own schema tables (`pgboss.*`) — no conflict with Drizzle tables in `public.*`. Initialize with the same `DATABASE_URL` connection string but using the standard `pg` client (not the Neon serverless WebSocket driver):

```typescript
// Use standard DATABASE_URL — pg-boss uses standard pg driver, not @neondatabase/serverless
import PgBoss from 'pg-boss';
const boss = new PgBoss(process.env.DATABASE_URL!);
await boss.start(); // creates pgboss.* schema on first run
```

The Neon serverless driver continues to power Drizzle ORM for all application tables. pg-boss gets its own standard `pg` connection to the same database. This is a confirmed safe dual-driver pattern.

---

## Architecture Patterns

### Recommended Project Structure

```
server/autonomy/
├── background/
│   └── backgroundRunner.ts    [MODIFIED — add execution cron + _started guard]
├── config/
│   └── policies.ts            [MODIFIED — add backgroundExecution flag + cost cap]
├── execution/                 [NEW DIRECTORY]
│   └── taskExecutionPipeline.ts [NEW]
├── taskGraph/
│   ├── taskGraphEngine.ts     [UNCHANGED — pure functions stay pure]
│   └── taskGraphPersistence.ts [NEW — persistence wrapper only]
└── triggers/                  [NEW DIRECTORY]
    └── autonomyTriggerResolver.ts [NEW]

server/ai/
└── safety.ts                  [MODIFIED — add executionContext parameter]

server/routes/
└── chat.ts                    [MODIFIED — trigger check post-streaming + join_conversation briefing check]
```

### Pattern 1: AutonomyTriggerResolver (Pure Decision Function)

**What:** Pure function with no I/O, no LLM calls — decides whether autonomous execution should start.

**When to use:** Called from both the WS `send_message_streaming` handler (explicit trigger) and from the background runner cron (inactivity trigger check). Being pure makes it trivially unit-testable.

**Example:**
```typescript
// server/autonomy/triggers/autonomyTriggerResolver.ts
const TRIGGER_PHRASES = [
  'go ahead', 'work on this', 'take it from here',
  'you handle it', 'start working', 'begin execution',
  'handle this autonomously', 'go work on',
];

export interface AutonomyTriggerDecision {
  shouldExecute: boolean;
  reason: 'explicit' | 'inactivity' | 'none';
  tasksToExecute: string[]; // task IDs from pending tasks
}

export function resolveAutonomyTrigger(input: {
  userMessage?: string;
  lastUserActivityAt: Date | null;
  pendingTasks: Array<{ id: string; status: string }>;
  autonomyEnabled: boolean;
}): AutonomyTriggerDecision {
  if (!input.autonomyEnabled) {
    return { shouldExecute: false, reason: 'none', tasksToExecute: [] };
  }

  const lower = (input.userMessage ?? '').toLowerCase();
  const isExplicit = TRIGGER_PHRASES.some(phrase => lower.includes(phrase));

  if (isExplicit) {
    const ready = input.pendingTasks
      .filter(t => t.status === 'todo')
      .map(t => t.id);
    return { shouldExecute: ready.length > 0, reason: 'explicit', tasksToExecute: ready };
  }

  return { shouldExecute: false, reason: 'none', tasksToExecute: [] };
}
```

### Pattern 2: TaskExecutionPipeline with Risk-Gated Output

**What:** Drives a single task through autonomous execution: build prompt, call LLM, safety-gate output, peer-review or block, store as message.

**When to use:** Called from the backgroundRunner cron and from the explicit trigger path in chat.ts.

**Example:**
```typescript
// server/autonomy/execution/taskExecutionPipeline.ts
import { evaluateSafetyScore } from '../../ai/safety.js';
import { runPeerReview } from '../peerReview/peerReviewRunner.js';
import { logAutonomyEvent } from '../events/eventLogger.js';

export async function executeTask(input: {
  task: Task;
  agent: Agent;
  project: Project;
  conversationId: string;
  storage: IStorage;
  broadcastToConversation: (convId: string, payload: unknown) => void;
  generateText: (prompt: string, system: string, maxTokens?: number) => Promise<string>;
}): Promise<{ status: 'completed' | 'pending_approval' | 'failed' }> {

  // Build autonomous execution prompt from project Brain + task + agent personality
  const prompt = buildAutonomousTaskPrompt(input.task, input.agent, input.project);

  // CRITICAL: call generateText directly — do NOT use runTurn/graph.invoke
  const output = await input.generateText(prompt, buildAgentSystemPrompt(input.agent));

  // Safety gate with autonomous context (stricter threshold: 0.60 not 0.70)
  const safetyScore = evaluateSafetyScore({
    userMessage: input.task.description ?? input.task.title,
    draftResponse: output,
    conversationMode: 'project',
    projectName: input.project.name,
    executionContext: 'autonomous_task',  // new param — stricter thresholds
  });

  await logAutonomyEvent({
    eventType: 'autonomous_safety_eval' as any,
    projectId: input.project.id,
    hatchId: input.agent.id,
    riskScore: Math.max(safetyScore.hallucinationRisk, safetyScore.scopeRisk, safetyScore.executionRisk),
    payload: { taskId: input.task.id, reasons: safetyScore.reasons } as any,
  });

  // >= 0.60: block + surface for human approval
  if (safetyScore.executionRisk >= 0.60 || safetyScore.scopeRisk >= 0.60) {
    await input.storage.updateTask(input.task.id, {
      status: 'blocked',
      metadata: { awaitingApproval: true, draftOutput: output }
    });
    input.broadcastToConversation(input.conversationId, {
      type: 'task_requires_approval',
      taskId: input.task.id,
      agentName: input.agent.name,
      riskReasons: safetyScore.reasons,
    });
    return { status: 'pending_approval' };
  }

  // 0.35–0.59: run peer review before storing
  let finalOutput = output;
  if (safetyScore.hallucinationRisk >= 0.35 || safetyScore.executionRisk >= 0.35) {
    const review = await runPeerReview({
      projectId: input.project.id,
      conversationId: input.conversationId,
      draftResponse: output,
      agentRole: input.agent.role,
      storage: input.storage,
      generateText: input.generateText,
    });
    if (review.revisedContent) finalOutput = review.revisedContent;
  }

  // Store as agent message with autonomous flag in metadata
  await input.storage.createMessage({
    conversationId: input.conversationId,
    content: finalOutput,
    messageType: 'agent',
    agentId: input.agent.id,
    userId: null,
    metadata: { isAutonomous: true, taskId: input.task.id, executionRunId: null },
  });

  await input.storage.updateTask(input.task.id, { status: 'completed' });

  input.broadcastToConversation(input.conversationId, {
    type: 'task_execution_completed',
    taskId: input.task.id,
    agentId: input.agent.id,
    agentName: input.agent.name,
  });

  return { status: 'completed' };
}
```

### Pattern 3: safety.ts Extension for Autonomous Context

**What:** Add optional `executionContext` parameter with backward-compatible default. Autonomous context uses stricter 0.60 clarification threshold and +0.10 baseline `executionRisk`.

**When to use:** All calls from the autonomous execution pipeline. All existing calls from the chat pipeline are unchanged (they don't pass `executionContext`).

```typescript
// Modified signature for server/ai/safety.ts
export function evaluateSafetyScore(input: {
  userMessage: string;
  draftResponse?: string;
  conversationMode: "project" | "team" | "agent";
  projectName?: string;
  executionContext?: 'chat' | 'autonomous_task';  // NEW — default 'chat'
}): SafetyScore {
  // ...existing logic unchanged...

  // NEW: autonomous context raises baseline executionRisk
  if (input.executionContext === 'autonomous_task') {
    executionRisk = Math.min(1, executionRisk + 0.10);
  }

  // ...rest of function unchanged...
}

// NEW: stricter thresholds for autonomous context
export const AUTONOMOUS_SAFETY_THRESHOLDS = {
  peerReviewTrigger: 0.35,        // same
  clarificationRequiredRisk: 0.60, // stricter than chat (0.70)
} as const;
```

### Pattern 4: backgroundRunner _started Guard (Idempotent Start)

**What:** Prevent duplicate cron job registration on Vite HMR hot reload.

**When to use:** In `backgroundRunner.start()` before registering any cron jobs.

```typescript
// In backgroundRunner.ts — add at module scope
let _started = false;

export const backgroundRunner = {
  start(deps: BackgroundRunnerDeps): void {
    if (_started) {
      // Hot reload detected — stop existing jobs before re-registering
      backgroundRunner.stop();
    }
    _started = true;

    _storage = deps.storage;
    // ...rest of start() unchanged...
  },

  stop(): void {
    for (const job of cronJobs) { job.stop(); }
    cronJobs.length = 0;
    _started = false;
    console.log('[BackgroundRunner] Stopped');
  },
};
```

### Pattern 5: policies.ts Cost Cap Addition

**What:** Add `BACKGROUND_AUTONOMY_ENABLED` feature flag and per-project daily LLM call cap to the existing `FEATURE_FLAGS` and `BUDGETS` objects.

```typescript
// In server/autonomy/config/policies.ts

export const FEATURE_FLAGS = {
  // ...existing flags...
  backgroundExecution: (process.env.BACKGROUND_AUTONOMY_ENABLED ?? 'false').toLowerCase() === 'true',
};

export const BUDGETS: CognitiveBudgets = {
  // ...existing budgets...
  maxConcurrentAutonomousTasks: Number(process.env.MAX_CONCURRENT_AUTONOMOUS_TASKS ?? 3),
  maxBackgroundLlmCallsPerProjectPerDay: Number(process.env.MAX_BACKGROUND_LLM_CALLS_PER_PROJECT_PER_DAY ?? 5),
};
```

### Pattern 6: taskGraphPersistence.ts Wrapper

**What:** Keep `taskGraphEngine.ts` pure functions unchanged. The persistence wrapper reads/writes graph state to `tasks.metadata` JSONB — no new table required.

**When to use:** Called from `backgroundRunner`'s execution cycle to load existing task graph state before processing.

```typescript
// server/autonomy/taskGraph/taskGraphPersistence.ts
import { createTaskGraph, markTaskStatus, type TaskGraph } from './taskGraphEngine.js';
import type { IStorage } from '../../storage.js';

export async function persistTaskGraph(
  projectId: string,
  graph: TaskGraph,
  storage: IStorage,
): Promise<void> {
  // Store in project's brain JSONB under executionRules.taskGraph
  await storage.updateProject(projectId, {
    executionRules: { taskGraph: graph },
  });
}

export async function loadTaskGraph(
  projectId: string,
  storage: IStorage,
): Promise<TaskGraph | null> {
  const project = await storage.getProject(projectId);
  return (project?.executionRules as any)?.taskGraph ?? null;
}
```

### Anti-Patterns to Avoid

- **Calling `runTurn` or `graph.invoke` from background execution:** Uses `MemorySaver` keyed by `thread_id`; background execution has no active WS thread; corrupts in-memory state. Always call `generateText` directly.
- **Passing `userMessage: ''` to evaluateSafetyScore for autonomous tasks:** Gives misleadingly low baseline risk. Always populate `userMessage` with the task description and pass `executionContext: 'autonomous_task'`.
- **Writing autonomous output to an active conversation without checking for active writers:** Two concurrent writers cause message ordering violations. Check `typing_indicators` table for active indicators before writing. If user is typing, defer to next cron cycle.
- **Rebuilding task graph from `createTaskGraph` each cron tick:** Discards all completed/in-progress status transitions. Load via `loadTaskGraph`, call `markTaskStatus` to sync, then find ready nodes.
- **Starting pg-boss with the `@neondatabase/serverless` WebSocket client:** pg-boss requires the standard `pg` driver. Use `DATABASE_URL` directly with pg-boss — it will use standard TCP, not WebSocket. Drizzle continues using the Neon serverless driver.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Durable job queue with retries | Custom setTimeout/setInterval + tasks table | `pg-boss` | Restart-safe; retry with backoff; dead-letter queue; deduplication by job key; all over existing PostgreSQL |
| LLM call concurrency control | Custom semaphore or counter | `p-queue` (already installed, 6.6.2) | p-queue is battle-tested; supports priority, concurrency limits, pause/resume |
| Internal event bus for progress events | Redis pub/sub | `eventemitter3` (already installed, 4.0.7) | In-process, zero latency, zero cost at single-node scale; Redis pub/sub only needed for multi-node clustering |
| Peer review gate | Custom reviewer logic | `peerReviewRunner.ts` (existing) | Already implements rubric evaluation + revision cycle; plug in directly |
| Cycle detection in task graph | Custom graph walk | `visitedAgentIds` array + `maxHops` check in `TaskGraphNode` | Simple array append + length check; graph traversal complexity not needed at 4-hop MVP scale |
| Stalled task recovery | Manual SQL | Startup query in `server/index.ts` + retryCount in task metadata | Query `status='in_progress' AND updated_at < NOW() - INTERVAL '30 min'`; reset to `todo`; cap retries at 3 |

**Key insight:** The existing autonomy infrastructure is complete and production-tested. Phase 6 is wiring, not building. Every new module should call existing infrastructure rather than re-implementing it.

---

## Common Pitfalls

### Pitfall 1: pg-boss Double-Start in Development
**What goes wrong:** `backgroundRunner.start()` called twice on Vite HMR reload; pg-boss `.work()` registers a second worker for the same queue; two workers process the same jobs concurrently.
**Why it happens:** No idempotency guard in `start()`. Module re-evaluated on HMR.
**How to avoid:** The `_started` guard pattern (Pattern 4 above) prevents this. Also call `boss.stop()` before `boss.start()` on re-entry.
**Warning signs:** Same `taskId` processed twice in `autonomy_events` within milliseconds; duplicate agent messages.

### Pitfall 2: runTurn Corrupts Conversation State
**What goes wrong:** Developer calls `runTurn` in `TaskExecutionPipeline` because it "works in chat." Background execution injects ghost messages into a user's live conversation; streaming chunks emitted to wrong WS clients.
**Why it happens:** `runTurn` reads from `MemorySaver` using `thread_id`; background execution uses the project conversation ID as thread_id; live chat users are using the same thread_id.
**How to avoid:** Never import or call `runTurn` from any autonomy module. The rule in STATE.md is explicit: "Do NOT call runTurn from background execution — call generateText directly."
**Warning signs:** Messages appearing in wrong conversations; streaming events emitted during background execution reaching chat clients.

### Pitfall 3: Missing Cost Cap Before Production
**What goes wrong:** `BACKGROUND_AUTONOMY_ENABLED=true` set in production; pg-boss picks up queued jobs for all projects; 50 projects x 3 tasks x 1 LLM call = 150 Gemini calls in first cron cycle.
**Why it happens:** No `maxBackgroundLlmCallsPerProjectPerDay` enforcement before Phase 6 is deployed.
**How to avoid:** Add the daily cap check to `runAutonomousExecutionCycle` as the FIRST thing it does — query `autonomy_events` for today's autonomous calls for the project, abort if cap reached. This must ship with the feature, not as a follow-up.
**Warning signs:** Gemini API dashboard shows spikes at 15-minute intervals; no correlation with active users.

### Pitfall 4: Safety Score Degrades Silently for Autonomous Work
**What goes wrong:** Developer passes `userMessage: ''` to `evaluateSafetyScore` because autonomous tasks have no user message; baseline `hallucinationRisk` starts at 0.15; risky task content scores < 0.35 and auto-executes without peer review.
**Why it happens:** The parameter name suggests a user message is required; passing empty string is the path of least resistance.
**How to avoid:** Always populate `userMessage` with `task.description ?? task.title` when scoring autonomous output. Additionally, add `executionContext: 'autonomous_task'` which raises `executionRisk` baseline by +0.10.
**Warning signs:** Autonomous tasks completing without any `peer_review_started` event in `autonomy_events`; risk scores for autonomous tasks averaging lower than chat risk scores.

### Pitfall 5: Tasks Stuck in `in_progress` After Server Restart
**What goes wrong:** pg-boss job picked up; `TaskExecutionPipeline` started; server restarts mid-execution; task remains `in_progress` forever; pg-boss has no record of the in-flight state (it was in Node.js memory).
**Why it happens:** Task status written to DB immediately on pickup; execution state lives in memory; restart loses the execution handle.
**How to avoid:** Add startup recovery in `server/index.ts`: on boot, query for tasks with `status='in_progress'` and `updatedAt < NOW() - INTERVAL '30 min'`; reset to `todo` with `retryCount + 1`; fail after 3 retries. pg-boss retries handle the queue-level durability; this handles the app-level task state.
**Warning signs:** User reports "team was working but stopped"; tasks showing `in_progress` status with no recent `autonomy_events`.

### Pitfall 6: Duplicate Cron Jobs on Hot Reload
**What goes wrong:** 5 hot reloads = 5 execution cron jobs firing every 15 minutes simultaneously; 5x LLM calls per cycle; 5x duplicate messages per task.
**Why it happens:** `cronJobs` array is module-level; `start()` appends new jobs without checking if already running; Vite HMR re-evaluates the module.
**How to avoid:** `_started` guard (Pattern 4); `cronJobs.length = 0` in `stop()`; log a warning when `start()` is called while already running.
**Warning signs:** `[BackgroundRunner] Started` appearing multiple times in dev console without `[BackgroundRunner] Stopped` between them.

---

## Code Examples

### pg-boss Setup and Job Registration

```typescript
// server/autonomy/execution/jobQueue.ts
import PgBoss from 'pg-boss';
import { FEATURE_FLAGS } from '../config/policies.js';

let _boss: PgBoss | null = null;

export async function getJobQueue(): Promise<PgBoss | null> {
  if (!FEATURE_FLAGS.backgroundExecution) return null;
  if (_boss) return _boss;

  _boss = new PgBoss(process.env.DATABASE_URL!);
  await _boss.start();

  // Register worker for autonomous task execution
  await _boss.work<{ taskId: string; projectId: string; agentId: string }>(
    'autonomous_task_execution',
    { batchSize: 1 },  // process one at a time per worker
    async (jobs) => {
      for (const job of jobs) {
        await executeTaskFromJob(job.data);
      }
    }
  );

  return _boss;
}

export async function queueTaskExecution(data: {
  taskId: string;
  projectId: string;
  agentId: string;
}): Promise<string | null> {
  const boss = await getJobQueue();
  if (!boss) return null;

  return boss.send('autonomous_task_execution', data, {
    retryLimit: 3,
    retryDelay: 30,       // 30 seconds between retries
    expireInMinutes: 30,
    singletonKey: data.taskId,  // deduplication — same task not queued twice
  });
}
```

### Execution Cron in backgroundRunner.ts

```typescript
// Addition to backgroundRunner.ts — new third cron job
import { queueTaskExecution } from '../execution/jobQueue.js';
import { resolveAutonomyTrigger } from '../triggers/autonomyTriggerResolver.js';
import { loadTaskGraph } from '../taskGraph/taskGraphPersistence.js';
import { FEATURE_FLAGS, BUDGETS } from '../config/policies.js';

async function runAutonomousExecutionCycle(): Promise<void> {
  if (!_storage || !FEATURE_FLAGS.backgroundExecution) return;

  const today = new Date().toISOString().slice(0, 10);
  const projects = await _storage.getProjects();

  for (const project of projects.slice(0, MAX_PROJECTS_PER_CYCLE)) {
    // Skip projects with no activity in last 7 days
    const recentMessages = await _storage.getMessagesByConversation(
      `project:${project.id}`, { limit: 1 }
    );
    const lastActive = recentMessages[0]?.createdAt
      ? new Date(recentMessages[0].createdAt)
      : null;
    if (lastActive) {
      const daysInactive = (Date.now() - lastActive.getTime()) / 86400000;
      if (daysInactive > 7) continue;
    }

    // Check daily LLM cap for this project
    const todayEvents = await _storage.countAutonomyEventsForProjectToday(project.id, today);
    if (todayEvents >= BUDGETS.maxBackgroundLlmCallsPerProjectPerDay) continue;

    const tasks = await _storage.getTasksByProject(project.id);
    const trigger = resolveAutonomyTrigger({
      lastUserActivityAt: lastActive,
      pendingTasks: tasks,
      autonomyEnabled: (project.executionRules as any)?.autonomyEnabled ?? false,
    });

    if (!trigger.shouldExecute) continue;

    // Queue up to maxConcurrentAutonomousTasks tasks
    const toQueue = trigger.tasksToExecute.slice(0, BUDGETS.maxConcurrentAutonomousTasks);
    for (const taskId of toQueue) {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.assignee) continue;
      await queueTaskExecution({ taskId, projectId: project.id, agentId: task.assignee });
    }
  }
}

// Register in backgroundRunner.start() alongside existing cron jobs:
// const executionJob = cronSchedule('*/15 * * * *', runAutonomousExecutionCycle, { timezone: 'UTC' });
// cronJobs.push(executionJob);
```

### WS Trigger Check in chat.ts (post-streaming)

```typescript
// In chat.ts — after streaming_completed is emitted, add:
// (called from the send_message_streaming handler, post-response)

async function checkForAutonomyTrigger(
  userMessage: string,
  projectId: string,
  userId: string,
  conversationId: string,
): Promise<void> {
  if (!FEATURE_FLAGS.backgroundExecution) return;

  const project = await storage.getProject(projectId);
  const tasks = await storage.getTasksByProject(projectId);

  const trigger = resolveAutonomyTrigger({
    userMessage,
    lastUserActivityAt: new Date(), // user just sent a message
    pendingTasks: tasks,
    autonomyEnabled: (project?.executionRules as any)?.autonomyEnabled ?? false,
  });

  if (!trigger.shouldExecute) return;

  // Broadcast working indicator to connected clients
  broadcastToConversation(conversationId, {
    type: 'background_execution_started',
    projectId,
    taskCount: trigger.tasksToExecute.length,
  });

  // Queue tasks via pg-boss
  for (const taskId of trigger.tasksToExecute) {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.assignee) continue;
    await queueTaskExecution({ taskId, projectId, agentId: task.assignee });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BullMQ + Redis for job queuing | `pg-boss` over existing PostgreSQL | 2023+ for single-database deployments | Eliminates Redis operational overhead; same durability guarantees |
| polling-based status updates | WebSocket event-driven push | Pre-existing in this codebase | No changes needed; emit new event types |
| LangGraph for all agent calls | `generateText` directly for background | Architecture decision in STATE.md | Background execution avoids MemorySaver thread contamination |
| Synchronous safety scoring | Async + context-aware scoring with `executionContext` parameter | Phase 6 change | Correct baseline risk for autonomous vs. user-directed actions |

**Deprecated/outdated patterns to avoid:**
- Using `runTurn` outside a WebSocket context: causes MemorySaver thread_id collisions (architecture decision confirmed in STATE.md)
- Global `getProjects()` without activity filter: already causes unnecessary cycles at scale; fixed in Phase 6 with 7-day inactivity filter

---

## Open Questions

1. **pg-boss version: 12.14.0 vs 10.4.2**
   - What we know: Milestone research recommends `^10.x`; npm shows latest is `12.14.0`; both use `pg` driver; v10.4.2 last published Feb 2024; v12.x published weekly
   - What's unclear: Breaking API differences between v10 and v12 (v10 uses `.subscribe()`/`.publish()`, v12 uses `.work()`/`.send()` — API changed)
   - Recommendation: Use v12.14.0 (latest stable). The `pg-boss` v12 API is cleaner. Research used v10 examples but v12 is the current standard. Verify `.work()` and `.send()` signatures against official docs before writing integration code.

2. **`countAutonomyEventsForProjectToday` — new storage method needed**
   - What we know: The daily LLM cap enforcement requires querying `autonomy_events` by `project_id + date`; this method does not exist in `IStorage`
   - What's unclear: Whether to add a new `IStorage` method or query the DB directly in `runAutonomousExecutionCycle`
   - Recommendation: Add `countAutonomyEventsForProjectToday(projectId: string, date: string): Promise<number>` to `IStorage` interface and implement in `DatabaseStorage`. Keeps the storage abstraction clean.

3. **`tasks.assignee` field — agent ID or role string**
   - What we know: The `tasks` table has an `assignee` column; `TaskGraphNode.ownerRole` is a role string ("Product Manager", "Engineer")
   - What's unclear: Whether `tasks.assignee` stores an agent UUID or a role name; this determines how `TaskExecutionPipeline` resolves the agent to call
   - Recommendation: Check `shared/schema.ts` tasks table definition. If `assignee` is a role string, add a lookup step: `getAgentsByProject(projectId)` then filter by role. Document the resolved agent ID in task metadata when queuing.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | tsx script execution (existing pattern — no Jest/Vitest configured) |
| Config file | none — scripts run via `tsx scripts/test-*.ts` |
| Quick run command | `tsx scripts/test-execution-trigger.ts` (new) |
| Full suite command | `npm run gate:safety && npm run test:integrity && npm run test:dto` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXEC-01 | `resolveAutonomyTrigger` returns `shouldExecute: true` for "go ahead" phrase | unit | `tsx scripts/test-execution-trigger.ts` | Wave 0 |
| EXEC-01 | `resolveAutonomyTrigger` returns `shouldExecute: false` when `autonomyEnabled: false` | unit | `tsx scripts/test-execution-trigger.ts` | Wave 0 |
| EXEC-02 | pg-boss queues job and worker picks up task; output stored as agent message | integration | `tsx scripts/test-execution-pipeline.ts` | Wave 0 |
| EXEC-03 | Daily cap enforcement: 6th call blocked when cap is 5 | unit | `tsx scripts/test-execution-trigger.ts` | Wave 0 |
| SAFE-01 | Low-risk task (score < 0.35) auto-executes without approval WS event | integration | `tsx scripts/test-execution-pipeline.ts` | Wave 0 |
| SAFE-01 | High-risk task (score >= 0.60) sets `status: blocked` and emits `task_requires_approval` | integration | `tsx scripts/test-execution-pipeline.ts` | Wave 0 |
| SAFE-02 | `evaluateSafetyScore` with `executionContext: 'autonomous_task'` returns higher executionRisk than chat context | unit | `npm run gate:safety` | Extend existing |
| SAFE-03 | Mid-risk task (0.35–0.59) invokes `runPeerReview` before message storage | unit | `tsx scripts/test-execution-pipeline.ts` | Wave 0 |
| UX-02 | Explicit trigger in WS message causes `background_execution_started` event broadcast | integration | `tsx scripts/test-ws-execution-events.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run gate:safety` (covers SAFE-02 and safety extension regression)
- **Per wave merge:** `npm run gate:safety && npm run test:integrity && npm run test:dto`
- **Phase gate:** Full suite above green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/test-execution-trigger.ts` — covers EXEC-01, EXEC-03 (pure function tests for AutonomyTriggerResolver)
- [ ] `scripts/test-execution-pipeline.ts` — covers EXEC-02, SAFE-01, SAFE-03 (integration tests with mock LLM provider)
- [ ] `scripts/test-ws-execution-events.ts` — covers UX-02 (WebSocket event emission test)
- [ ] Extend `scripts/gate-safety.ts` to include `executionContext: 'autonomous_task'` test cases for SAFE-02

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `server/autonomy/background/backgroundRunner.ts` — confirmed cron pattern, injected deps signature, no `_started` guard, no cost cap
- Direct codebase inspection: `server/ai/safety.ts` — confirmed current `evaluateSafetyScore` signature, existing thresholds (0.35/0.65/0.70), no `executionContext` parameter
- Direct codebase inspection: `server/autonomy/config/policies.ts` — confirmed existing `FEATURE_FLAGS` and `BUDGETS`; no `backgroundExecution` flag; no cost cap constant
- Direct codebase inspection: `server/autonomy/taskGraph/taskGraphEngine.ts` — confirmed pure in-memory functions only; no persistence; no `visitedAgentIds` on `TaskGraphNode`
- Direct codebase inspection: `server/autonomy/events/eventLogger.ts` — confirmed existing task event types; dual write (DB + file fallback)
- Direct codebase inspection: `server/db.ts` — confirmed Neon serverless driver (`@neondatabase/serverless Pool + drizzle`)
- `package.json` — confirmed: `pg@8.13.1` installed as transitive dep (satisfies pg-boss `^8` range); `p-queue@6.6.2` and `eventemitter3@4.0.7` confirmed installed
- npm registry: `pg-boss@12.14.0` — latest stable; uses `pg: ^8.19.0` peer dep; v10.4.2 is `maint-v10` branch

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `FEATURES.md` — milestone-level research; HIGH confidence on architecture; MEDIUM on pg-boss API (was based on v10 examples, actual version is v12)
- `.planning/STATE.md` — confirmed locked decisions: pg-boss, autonomous context uses `generateText` not `runTurn`, safety threshold 0.60 for autonomous mode

### Tertiary (LOW confidence)

- pg-boss v12 API examples in RESEARCH.md (code examples use `.work()` / `.send()` pattern from v12 docs) — verify exact method signatures in official pg-boss v12 README before writing integration code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry and node_modules; pg driver compatibility confirmed
- Architecture: HIGH — all integration points derived from direct codebase inspection; no training assumptions
- Pitfalls: HIGH — all derived from codebase analysis of actual missing guards + domain knowledge of autonomous agent failure modes
- Test strategy: MEDIUM — test file patterns follow existing scripts convention; exact test command names are new (Wave 0 gaps)

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (pg-boss is actively developed; re-verify latest version before install)
