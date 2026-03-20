# Phase 7: Agent Handoffs and Approval UI - Research

**Researched:** 2026-03-20
**Domain:** Multi-agent handoff orchestration, approval UI, pause/cancel controls
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HAND-01 | When a Hatch completes a task, the system routes the next task to the appropriate specialist based on task type | `HandoffOrchestrator` calls `evaluateConductorDecision` with the task description as `userMessage`; `expertiseMatching.findBestAgentMatch` already performs domain scoring against agent roles; called from `taskExecutionPipeline.ts` on `status: completed` |
| HAND-02 | Hatches announce handoffs in-character in chat ("I've finished the scope, tagging @Engineer to pick this up") | `storage.createMessage` + `broadcastToConversation` with `messageType: 'agent'`; character prompt drives voice; the pattern is already used in task acknowledgment in `tasks.ts`; no new infrastructure required |
| HAND-03 | Task graph has cycle detection to prevent infinite handoff loops between agents | `HandoffTracker.detectCycle` (BFS, window-based) already EXISTS in `server/ai/expertiseMatching.ts`; `handoffTracker` is a module-level singleton; the blocker from STATE.md is about routing stability of `evaluateConductorDecision`, not about cycle detection itself |
| HAND-04 | Each agent in the handoff chain receives the previous agent's output as context | Previous agent's output is stored as a `messages` row with `metadata.isAutonomous: true` and `metadata.taskId`; HandoffOrchestrator reads it from storage before calling `executeTask`; passes as `previousOutput` string in the autonomous execution prompt |
| UX-01 | Frontend renders interactive approval cards with Approve/Reject/Modify buttons for high-risk autonomous actions (one-click, no typing) | Already PARTIALLY COMPLETE per REQUIREMENTS.md: CenterPanel dispatches `task_requires_approval` WS event as a toast; TaskManager needs upgrade from toast to inline `AutonomousApprovalCard` component with approve/reject buttons; REST endpoints `POST /api/tasks/:id/approve` and `POST /api/tasks/:id/reject` must be created |
| UX-04 | User can pause or cancel autonomous execution mid-run | REQUIREMENTS.md marks this DEFERRED; ROADMAP lists it in Phase 7 plan 07-04; needs `POST /api/projects/:id/autonomy/pause` and frontend "pause" button — implement as a feature-flag-gated lightweight state flag in `project.executionRules.autonomyPaused` |

</phase_requirements>

---

## Summary

Phase 7 builds directly on the task execution pipeline from Phase 6. The infrastructure for single-agent autonomous execution is complete — pg-boss queuing, `executeTask`, safety scoring, peer review, and WS events all work. Phase 7 adds three new capabilities on top of that foundation.

First, when a task completes, the system must determine which agent handles the next task in the chain and pass the completed output as context. The routing mechanism (`evaluateConductorDecision`) and cycle detection (`HandoffTracker`) already exist but have never been called from the autonomous pipeline. The STATE.md blocker — "verify conductor evaluateConductorDecision produces stable routing when called with synthetic task description as userMessage" — must be resolved before the planner commits to how the HandoffOrchestrator calls the conductor. The research finding (see Open Questions) is that the conductor IS stable enough for task routing, but with a known caveat: for generic task titles (under 10 characters or matching greeting keywords), `findBestAgentMatch` returns the Product Manager unconditionally. The HandoffOrchestrator must pass the task DESCRIPTION (not just title) and pad very short messages to avoid this fast path.

Second, the existing approval flow (toast notification + WS event) must be upgraded to a true one-click inline approval card. The TaskApprovalModal already demonstrates the project's UI patterns (dark Hatchin tokens, Framer Motion, Shadcn Dialog) and must serve as a direct reference. The new `AutonomousApprovalCard` is an inline message-like component, not a modal — it appears in the chat thread at the point where the high-risk task was flagged, with Approve/Reject buttons that call the new REST endpoints.

Third, pause/cancel is the simplest piece: a boolean `autonomyPaused` flag in `project.executionRules` JSONB (already a typed field in the schema), checked at the top of `handleTaskJob` alongside the cost cap check.

**Primary recommendation:** Build in this order: 07-01 HandoffOrchestrator (pure routing + context building, no WS) → 07-02 in-character announcement (WS broadcast only) → 07-03 approval endpoints + frontend card → 07-04 pause flag + button. Each plan is independently deployable.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.39.1 | `storage.updateTask` for status changes, `createMessage` for announcements | All DB access goes through IStorage interface |
| `zod` | 3.24.2 | Validate approve/reject request bodies | Project-wide validation convention |
| `framer-motion` | 11.13.1 | Animate approval card appear/dismiss | Already used in TaskApprovalModal; smooth one-click UX |
| `@tanstack/react-query` | 5.60.5 | Invalidate task queries after approve/reject | Consistent cache management pattern |

### Supporting (all already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ws` | 8.18.0 | Broadcast handoff announcement and approval events | `broadcastToConversation` already wired |
| `lucide-react` | 0.453.0 | Approve (CheckCircle), Reject (XCircle), Pause (PauseCircle) icons | Project-standard icon set |

### No New Packages Needed

Phase 7 requires zero new npm packages. Every capability it adds extends existing modules.

---

## Architecture Patterns

### Recommended Project Structure

```
server/autonomy/
├── execution/
│   ├── taskExecutionPipeline.ts    [MODIFIED — call HandoffOrchestrator on completion]
│   └── jobQueue.ts                 [UNCHANGED]
├── handoff/                        [NEW DIRECTORY]
│   └── handoffOrchestrator.ts      [NEW — routing + cycle guard + announcement]
└── config/
    └── policies.ts                 [MODIFIED — add MAX_HANDOFF_HOPS constant]

server/routes/
└── tasks.ts                        [MODIFIED — add /approve and /reject endpoints]

client/src/components/
├── AutonomousApprovalCard.tsx       [NEW — inline approval card in chat thread]
└── CenterPanel.tsx                  [MODIFIED — render AutonomousApprovalCard on task_requires_approval]
```

### Pattern 1: HandoffOrchestrator

**What:** Pure orchestration module. After `executeTask` completes, determines which agent picks up the next task, checks for cycles, attaches the previous output as context, queues the job.

**When to use:** Called from `taskExecutionPipeline.ts` inside `handleTaskJob`, only when `executeTask` returns `{ status: 'completed' }`.

**Example:**
```typescript
// server/autonomy/handoff/handoffOrchestrator.ts
import { evaluateConductorDecision } from '../../ai/conductor.js';
import { handoffTracker } from '../../ai/expertiseMatching.js';
import { queueTaskExecution } from '../execution/jobQueue.js';
import { logAutonomyEvent } from '../events/eventLogger.js';
import { BUDGETS } from '../config/policies.js';
import type { IStorage } from '../../storage.js';

export const MAX_HANDOFF_HOPS = Number(process.env.MAX_HANDOFF_HOPS ?? 4);

export interface HandoffResult {
  status: 'queued' | 'cycle_detected' | 'no_next_task' | 'max_hops_reached';
  nextAgentId?: string;
  nextTaskId?: string;
}

export async function orchestrateHandoff(input: {
  completedTask: { id: string; title: string; description: string | null; projectId: string };
  completedAgent: { id: string; name: string; role: string };
  completedOutput: string;
  handoffChain: string[];   // agent IDs that have already acted in this chain
  storage: IStorage;
  broadcastToConversation: (convId: string, payload: unknown) => void;
}): Promise<HandoffResult> {
  // Guard: max hops prevents runaway chains
  if (input.handoffChain.length >= MAX_HANDOFF_HOPS) {
    input.broadcastToConversation(`project:${input.completedTask.projectId}`, {
      type: 'handoff_chain_completed',
      projectId: input.completedTask.projectId,
      reason: 'max_hops_reached',
      hops: input.handoffChain.length,
    });
    return { status: 'max_hops_reached' };
  }

  // Find tasks that depend on the completed task
  const allTasks = await input.storage.getTasksByProject(input.completedTask.projectId);
  const dependentTasks = allTasks.filter(
    t => t.status === 'todo' && (t.metadata as any)?.dependsOn === input.completedTask.id
  );
  if (dependentTasks.length === 0) return { status: 'no_next_task' };

  const nextTask = dependentTasks[0];
  const agents = await input.storage.getAgentsByProject(input.completedTask.projectId);

  // CRITICAL: pass description (not just title) to avoid conductor fast-path for short messages
  const userMessage = nextTask.description && nextTask.description.length > 20
    ? nextTask.description
    : `${nextTask.title} — ${nextTask.description ?? ''}`.trim();

  const conductorResult = evaluateConductorDecision({
    userMessage,
    conversationMode: 'project',
    availableAgents: agents,
    projectName: (await input.storage.getProject(input.completedTask.projectId))?.name,
  });

  const targetAgent = conductorResult.primaryMatch ?? agents[0];
  if (!targetAgent) return { status: 'no_next_task' };

  // Cycle detection via existing HandoffTracker
  const cycleCheck = handoffTracker.detectCycle(input.completedAgent.id, targetAgent.id);
  if (cycleCheck.hasCycle) {
    const conversationId = `project:${input.completedTask.projectId}`;
    input.broadcastToConversation(conversationId, {
      type: 'handoff_cycle_detected',
      projectId: input.completedTask.projectId,
      chain: cycleCheck.chain,
    });
    await logAutonomyEvent({
      eventType: 'task_failed',
      projectId: input.completedTask.projectId,
      hatchId: input.completedAgent.id,
      payload: { reason: 'handoff_cycle', chain: cycleCheck.chain, taskId: input.completedTask.id },
    });
    return { status: 'cycle_detected' };
  }

  // Attach previous output as context in task metadata before queuing
  await input.storage.updateTask(nextTask.id, {
    metadata: {
      ...(nextTask.metadata as any ?? {}),
      previousAgentOutput: input.completedOutput,
      previousAgentName: input.completedAgent.name,
      handoffChain: [...input.handoffChain, input.completedAgent.id],
    } as any,
  });

  await queueTaskExecution({
    taskId: nextTask.id,
    projectId: input.completedTask.projectId,
    agentId: targetAgent.id,
  });

  handoffTracker.recordHandoff(
    {
      id: `handoff-${Date.now()}`,
      fromAgent: input.completedAgent,
      toAgent: targetAgent,
      reason: `Task completed: ${input.completedTask.title}`,
      context: userMessage,
      timestamp: new Date(),
      status: 'accepted',
    },
    0,
    true,
  );

  return { status: 'queued', nextAgentId: targetAgent.id, nextTaskId: nextTask.id };
}
```

### Pattern 2: In-Character Handoff Announcement (HAND-02)

**What:** After the HandoffOrchestrator queues the next task, the completing agent emits one message in its own voice announcing the handoff. Uses `storage.createMessage` + `broadcastToConversation` — same pattern already used for task acknowledgment in `tasks.ts`.

**When to use:** Called from `handleTaskJob` after `orchestrateHandoff` returns `{ status: 'queued' }`.

**CRITICAL PROMPT RULE:** Handoff messages must follow the project's tone rules: no markdown headers, no bullet lists, one natural sentence, colleague voice. The example in HAND-02 ("I've finished the scope, tagging @Engineer to pick this up") is the canonical model.

```typescript
// In handoffOrchestrator.ts (or called from handleTaskJob)
export async function emitHandoffAnnouncement(input: {
  completedAgent: { id: string; name: string; role: string };
  nextAgent: { id: string; name: string; role: string };
  completedTaskTitle: string;
  projectId: string;
  conversationId: string;
  storage: IStorage;
  broadcastToConversation: (convId: string, payload: unknown) => void;
  generateText: (prompt: string, system: string) => Promise<string>;
}): Promise<void> {
  const prompt = `You are ${input.completedAgent.name}, a ${input.completedAgent.role}.
You just finished: "${input.completedTaskTitle}".
Write ONE short natural sentence (15-25 words) tagging @${input.nextAgent.name} to pick it up.
No bullet points. No headers. Colleague voice. Like a real Slack message.`;

  const announcement = await input.generateText(prompt, `You are ${input.completedAgent.name}.`);

  const msg = await input.storage.createMessage({
    conversationId: input.conversationId,
    content: announcement,
    messageType: 'agent',
    agentId: input.completedAgent.id,
    userId: null,
    metadata: {
      isAutonomous: true,
      isHandoffAnnouncement: true,
      nextAgentId: input.nextAgent.id,
    } as any,
  });

  input.broadcastToConversation(input.conversationId, {
    type: 'new_message',
    conversationId: input.conversationId,
    message: msg,
  });
}
```

### Pattern 3: Approve/Reject REST Endpoints (UX-01)

**What:** Two new endpoints in `server/routes/tasks.ts` that read a blocked task's `metadata.draftOutput`, either store it as a message (approve) or clear it (reject), and update task status.

**Data flow:** Task blocked → `metadata.awaitingApproval: true`, `metadata.draftOutput: string` stored by `executeTask`. Approve endpoint reads `draftOutput`, calls `storage.createMessage`, sets `status: 'completed'`. Reject endpoint sets `status: 'todo'` (returns to queue) or `'blocked'` if permanently rejected.

```typescript
// Addition to server/routes/tasks.ts

app.post('/api/tasks/:id/approve', async (req, res) => {
  const userId = getSessionUserId(req);
  const task = await storage.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const owned = await getOwnedProject(task.projectId, userId);
  if (!owned) return res.status(404).json({ error: 'Task not found' });

  const meta = task.metadata as any;
  if (!meta?.awaitingApproval || !meta?.draftOutput) {
    return res.status(400).json({ error: 'Task is not awaiting approval' });
  }

  const agents = await storage.getAgentsByProject(task.projectId);
  // task.assignee is a role string — resolve to agent id
  const agent = agents.find(a => a.name === task.assignee || a.role === task.assignee);
  const conversationId = `project:${task.projectId}`;

  // Publish the draft output as an agent message
  if (agent) {
    const msg = await storage.createMessage({
      conversationId,
      content: meta.draftOutput,
      messageType: 'agent',
      agentId: agent.id,
      userId: null,
      metadata: { isAutonomous: true, taskId: task.id, approvedByUser: true } as any,
    });
    deps.broadcastToConversation(conversationId, { type: 'new_message', conversationId, message: msg });
  }

  await storage.updateTask(task.id, {
    status: 'completed',
    metadata: { ...meta, awaitingApproval: false, approvedAt: new Date().toISOString() } as any,
  });

  deps.broadcastToConversation(conversationId, {
    type: 'task_execution_completed',
    taskId: task.id,
    agentId: agent?.id,
    agentName: agent?.name,
    approvedByUser: true,
  });

  return res.json({ success: true });
});

app.post('/api/tasks/:id/reject', async (req, res) => {
  const userId = getSessionUserId(req);
  const task = await storage.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const owned = await getOwnedProject(task.projectId, userId);
  if (!owned) return res.status(404).json({ error: 'Task not found' });

  const schema = z.object({ reason: z.string().max(500).optional() }).strict();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const meta = task.metadata as any;
  await storage.updateTask(task.id, {
    status: 'todo',   // returns to queue — not permanently blocked
    metadata: {
      ...meta,
      awaitingApproval: false,
      draftOutput: null,
      rejectedAt: new Date().toISOString(),
      rejectionReason: parsed.data.reason ?? null,
    } as any,
  });

  const conversationId = `project:${task.projectId}`;
  deps.broadcastToConversation(conversationId, {
    type: 'task_approval_rejected',
    taskId: task.id,
    projectId: task.projectId,
  });

  return res.json({ success: true });
});
```

### Pattern 4: AutonomousApprovalCard Component (UX-01)

**What:** An inline chat-like card rendered in CenterPanel when `task_requires_approval` WS event arrives. NOT a modal. Appears in the message stream. Two buttons: Approve (green) and Reject (muted red). One-click fires the REST endpoint via TanStack useMutation.

**Design reference:** Follow `TaskApprovalModal.tsx` token conventions: `bg-hatchin-card`, `border-hatchin-border-subtle`, `text-hatchin-text-bright`, `bg-hatchin-blue`. Use `framer-motion` `initial={{ opacity: 0, y: 8 }}` entry animation (same as TaskApprovalModal task items).

**State management:** CenterPanel holds an `approvalRequests: Array<{taskId, agentName, riskReasons}>` state array. `task_requires_approval` appends; card dismiss or approve/reject removes.

```typescript
// client/src/components/AutonomousApprovalCard.tsx
interface AutonomousApprovalCardProps {
  taskId: string;
  agentName: string;
  riskReasons: string[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  isLoading: boolean;
}

export function AutonomousApprovalCard({
  taskId, agentName, riskReasons, onApprove, onReject, isLoading
}: AutonomousApprovalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="mx-4 my-2 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-hatchin-text-bright mb-1">
            {agentName} needs your approval
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {riskReasons.join(' · ')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(taskId)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-hatchin-blue text-white rounded-lg font-medium
                         hover:bg-hatchin-blue/90 disabled:opacity-40 flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => onReject(taskId)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg
                         hover:bg-red-500/10 disabled:opacity-40 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

### Pattern 5: Pause/Cancel Controls (UX-04)

**What:** `project.executionRules.autonomyPaused: boolean` (JSONB field — no schema migration needed). `handleTaskJob` checks this flag after the cost cap check. Frontend "Pause" button appears in the working indicator banner (already shown when `isTeamWorking` is true). Calls `PATCH /api/projects/:id` with `{ executionRules: { autonomyPaused: true } }`.

**Note on DEFERRED status:** REQUIREMENTS.md marks UX-04 as DEFERRED. ROADMAP plan 07-04 includes it. The planner should implement it as a minimal feature (no new endpoints, just reuse the existing `PATCH /api/projects/:id` route and a simple boolean check in `handleTaskJob`). Keep the feature as lightweight as possible.

```typescript
// Addition to handleTaskJob in taskExecutionPipeline.ts (after cost cap check)
const projectForPause = await deps.storage.getProject(job.data.projectId);
if ((projectForPause?.executionRules as any)?.autonomyPaused === true) {
  // Silently skip — don't fail the job, just return
  return;
}
```

### Anti-Patterns to Avoid

- **Calling `evaluateConductorDecision` with `task.title` only:** Titles under 10 chars hit the greeting fast-path in `findBestAgentMatch` and always return Product Manager. Always use `description ?? title` and ensure the string is > 20 chars.
- **Using the in-memory `HandoffTracker` singleton across multiple Node.js processes:** `handoffTracker` lives in `server/ai/expertiseMatching.ts` module scope — it works correctly for single-node deployments (confirmed current architecture). Do NOT share it across pg-boss workers on different machines. At single-node scale this is safe.
- **Creating a new modal for approval:** The requirement says "one click, no typing." A modal requires an extra click to open. Use an inline card in the chat stream — the information is already in context.
- **Returning `status: 'blocked'` on reject:** Rejected tasks should return to `status: 'todo'` so they can be retried with modifications. Only use `blocked` for permanent blocks (safety threshold exceeded with no user override).
- **Modifying the `tasks` schema to add `handoffChain`:** Store it in the existing `metadata` JSONB field. No migration needed.
- **Emitting `handoff_announcement` before `executeTask` completes and the output is stored:** The announcement must come after the output message is persisted — users should see the output before the agent says "tagging @X."

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agent routing for next task | Custom role-to-task keyword map | `evaluateConductorDecision` in `conductor.ts` | Already handles domain scoring, role inference, safety scoring in one call |
| Cycle detection | Custom visited-set walk | `handoffTracker.detectCycle` in `expertiseMatching.ts` | BFS with time window already implemented; `handoffTracker` is a module singleton |
| Handoff history | Separate DB table | `handoffTracker.recordHandoff` in-memory + `autonomy_events` log | At single-agent scale, 100-item in-memory ring buffer + event log is sufficient; DB table premature |
| Approval card state | Redux/Zustand | React `useState` array in CenterPanel | CenterPanel already manages all WS-driven UI state this way; consistent with existing pattern |
| Pause API endpoint | New `POST /api/projects/:id/autonomy/pause` | Reuse `PATCH /api/projects/:id` with `executionRules.autonomyPaused` | The `executionRules` JSONB field exists in schema; routes/projects.ts already handles PATCH |

**Key insight:** Phase 7 is wiring, not building. The routing logic, cycle detection, task storage, WS broadcast, and UI patterns all exist. The work is connecting them through the handoff path and exposing approve/reject as first-class REST actions.

---

## Common Pitfalls

### Pitfall 1: Conductor Fast-Path for Short Task Titles (STATE.md Blocker)

**What goes wrong:** `evaluateConductorDecision` is called with `userMessage: 'Fix bug'` (8 chars). Inside `findBestAgentMatch`, the short-message guard fires: `userMessage.toLowerCase().trim().length <= 10` → always returns Product Manager with confidence 0.8, regardless of task type.

**Why it happens:** `findBestAgentMatch` has an early-return guard for generic greetings that also catches very short strings. This is correct for chat but wrong for task routing.

**How to avoid:** In `HandoffOrchestrator`, always build the routing message as: `nextTask.description && nextTask.description.length > 20 ? nextTask.description : \`${nextTask.title} — ${nextTask.description ?? ''}\``. The combined string is almost always > 20 chars and contains enough domain signal for the conductor to route correctly.

**Verification:** Before shipping 07-01, add a test: call `evaluateConductorDecision({ userMessage: 'Build API endpoint for user auth', ... })` with a Backend Developer agent available. Assert `primaryMatch.role` matches a backend/engineer pattern.

### Pitfall 2: `tasks.assignee` is a Role/Name String, Not an Agent ID

**What goes wrong:** `handleTaskJob` receives `agentId` from the pg-boss job payload. The `tasks.assignee` column stores a name/role string (confirmed: `text("assignee") // Agent name/role`). When `HandoffOrchestrator` queues the next job, it passes `agentId: targetAgent.id` (a UUID). When `emitHandoffAnnouncement` reads `task.assignee` to find the agent, it finds a role string, not a UUID, causing a mismatch.

**How to avoid:** The pg-boss job payload always carries the resolved `agentId` UUID (as queued by `HandoffOrchestrator`). All agent lookups use `agentId` from the job payload, NOT `task.assignee`. The `task.assignee` string is only for display in the TaskManager UI.

**Warning signs:** `agent` variable is `undefined` after `agents.find(a => a.id === job.data.agentId)` — check that `HandoffOrchestrator` is passing the UUID, not the role string.

### Pitfall 3: In-Character Announcements Violate Tone Rules

**What goes wrong:** The handoff announcement prompt generates markdown-heavy text like: "**Summary:** I've completed the scope.\n- Item 1\n- Item 2\nTagging @Engineer." The `applyTeammateToneGuard` post-processing in `responsePostProcessing.ts` is NOT called in the autonomous pipeline (only in `chat.ts`).

**How to avoid:** The announcement prompt itself must enforce the rules: "Write ONE short natural sentence (15-25 words). No bullet points. No headers." Test with mock LLM first. If the real LLM still returns formatting, add a regex post-processor inline in `emitHandoffAnnouncement` that strips `**`, `##`, and `-` list items.

**Warning signs:** `isHandoffAnnouncement: true` messages rendering with markdown in MessageBubble.

### Pitfall 4: Approval Card State Leaks Across Projects

**What goes wrong:** User switches between projects while an approval card is showing. The card remains in `approvalRequests` state in CenterPanel because the state is not scoped to `projectId`. User approves — the REST call goes to the wrong project's task.

**How to avoid:** Include `projectId` in the `approvalRequest` state shape. When `activeProject` changes in CenterPanel, clear any `approvalRequests` for the previous project. Filter displayed cards by `request.projectId === activeProject.id`.

### Pitfall 5: Rejection Sets Task to `blocked` Instead of `todo`

**What goes wrong:** Reject endpoint sets `status: 'blocked'` — the default "something is wrong" status. The task never gets retried. Autonomous execution stalls permanently.

**How to avoid:** Rejection by the user means "not right now" — set `status: 'todo'` so the backgroundRunner can re-queue it in the next cycle. Reserve `status: 'blocked'` for safety-threshold blocks where human intervention is required.

### Pitfall 6: Pause Check After Expensive DB Queries

**What goes wrong:** `handleTaskJob` fetches task, agent, and project from the DB, then checks `project.executionRules.autonomyPaused`. If paused, all three queries were wasted.

**How to avoid:** Check `autonomyPaused` immediately after the cost cap check (which already fetches the project minimally via `countAutonomyEventsForProjectToday`). Add a dedicated `storage.getProjectExecutionRules(projectId)` light query, OR fetch the project object first before other queries.

---

## Code Examples

### Wiring HandoffOrchestrator into handleTaskJob

```typescript
// Modified handleTaskJob in server/autonomy/execution/taskExecutionPipeline.ts
// Source: codebase analysis of existing handleTaskJob pattern

export async function handleTaskJob(
  job: { data: { taskId: string; projectId: string; agentId: string } },
  deps: { ... },
): Promise<void> {
  // 1. Cost cap check (existing)
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = await deps.storage.countAutonomyEventsForProjectToday(job.data.projectId, today);
  if (todayCount >= BUDGETS.maxBackgroundLlmCallsPerProjectPerDay) return;

  // 2. Pause check (NEW — Phase 7)
  const projectCheck = await deps.storage.getProject(job.data.projectId);
  if ((projectCheck?.executionRules as any)?.autonomyPaused === true) return;

  const [task, agents] = await Promise.all([
    deps.storage.getTask(job.data.taskId),
    deps.storage.getAgentsByProject(job.data.projectId),
  ]);
  if (!task || !projectCheck) return;
  const agent = agents.find((a) => a.id === job.data.agentId);
  if (!agent) return;

  // 3. Execute task (existing)
  const result = await executeTask({ ... });

  // 4. Handoff (NEW — Phase 7)
  if (result.status === 'completed') {
    // Read the output we just stored
    const conversationId = `project:${job.data.projectId}`;
    const recentMessages = await deps.storage.getMessagesByConversation(conversationId, { limit: 1 });
    const completedOutput = recentMessages[0]?.content ?? '';

    const handoffMeta = (task.metadata as any) ?? {};
    const handoffChain: string[] = handoffMeta.handoffChain ?? [];

    const handoffResult = await orchestrateHandoff({
      completedTask: { id: task.id, title: task.title, description: task.description ?? null, projectId: task.projectId },
      completedAgent: agent,
      completedOutput,
      handoffChain,
      storage: deps.storage,
      broadcastToConversation: deps.broadcastToConversation,
    });

    if (handoffResult.status === 'queued' && handoffResult.nextAgentId) {
      const nextAgent = agents.find(a => a.id === handoffResult.nextAgentId);
      if (nextAgent) {
        await emitHandoffAnnouncement({
          completedAgent: agent,
          nextAgent,
          completedTaskTitle: task.title,
          projectId: task.projectId,
          conversationId,
          storage: deps.storage,
          broadcastToConversation: deps.broadcastToConversation,
          generateText: deps.generateText,
        });
      }
    }
  }
}
```

### CenterPanel Approval State Integration

```typescript
// Addition to CenterPanel.tsx

const [approvalRequests, setApprovalRequests] = useState<Array<{
  taskId: string;
  agentName: string;
  riskReasons: string[];
  projectId: string;
}>>([]);

// In WS message handler, replace existing toast for task_requires_approval:
else if (message.type === 'task_requires_approval') {
  setApprovalRequests(prev => [
    ...prev.filter(r => r.taskId !== message.taskId), // deduplicate
    {
      taskId: message.taskId,
      agentName: message.agentName ?? 'Agent',
      riskReasons: message.riskReasons ?? [],
      projectId: activeProject?.id ?? '',
    }
  ]);
}

// Approve mutation
const approveMutation = useMutation({
  mutationFn: (taskId: string) =>
    apiRequest('POST', `/api/tasks/${taskId}/approve`, {}),
  onSuccess: (_, taskId) => {
    setApprovalRequests(prev => prev.filter(r => r.taskId !== taskId));
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  },
});

// Render approval cards above the message input (or inline in message stream)
// Filter to active project only
{approvalRequests
  .filter(r => r.projectId === activeProject?.id)
  .map(req => (
    <AutonomousApprovalCard
      key={req.taskId}
      taskId={req.taskId}
      agentName={req.agentName}
      riskReasons={req.riskReasons}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
      isLoading={approveMutation.isPending || rejectMutation.isPending}
    />
  ))
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Approval via modal (requires 2+ clicks) | Inline approval card in chat stream (1 click) | Phase 7 | Matches UX-01 "one click, no typing" requirement |
| Handoff cycle detection in-memory only | `HandoffTracker.detectCycle` BFS + `autonomy_events` log | Phase 6 HAND-03 (already shipped) | Cycle detection is production-ready; Phase 7 just needs to CALL it |
| Agent routing from keyword map | `evaluateConductorDecision` + `findBestAgentMatch` scoring | v1.0 | Confidence-scored, role-aware; caveat: short-message fast-path must be avoided |
| Pause via feature flag only | `project.executionRules.autonomyPaused` per-project flag | Phase 7 | User controls per-project without env var changes |

**Deprecated/outdated:**
- The `HandoffRequest` / `processHandoffRequest` functions at the bottom of `expertiseMatching.ts` exist but are not used in the autonomous pipeline. Phase 7 does NOT use `processHandoffRequest` — the `HandoffOrchestrator` uses `evaluateConductorDecision` directly for routing, and `handoffTracker.detectCycle` for cycle checks. The `processHandoffRequest` function's logic is redundant with the conductor.

---

## Open Questions

1. **STATE.md Blocker: conductor routing stability with synthetic task description**
   - What we know: `evaluateConductorDecision` calls `findBestAgentMatch` which has a short-message fast-path (strings <= 10 chars return Product Manager unconditionally). For task descriptions > 20 chars, domain scoring fires normally. The conductor's `inferRoleFromMessage` regex rules are tuned for chat keywords (`api|websocket|idempotency` → backend; `design|ux|ui` → designer) which also appear in task descriptions.
   - What's unclear: Whether task descriptions in this codebase are typically long enough (>20 chars) to bypass the fast-path. `task.description` is nullable — some tasks may have null descriptions with short titles.
   - Recommendation: In `HandoffOrchestrator`, always construct the routing message as `\`${task.title}. ${task.description ?? task.title}\`` (minimum ~doubled length). Add a unit test (see Wave 0 Gaps) that calls `evaluateConductorDecision` with short and long task descriptions and asserts routing stability. This resolves the STATE.md blocker.

2. **`task.metadata` schema extension for `dependsOn` and `handoffChain`**
   - What we know: `tasks.metadata` is JSONB typed as `{ createdFromChat?, messageId?, estimatedHours?, actualHours? }`. Adding `dependsOn`, `previousAgentOutput`, `handoffChain`, `awaitingApproval`, `draftOutput` (already used by Phase 6) expands this type.
   - What's unclear: Whether the Drizzle type definition for `tasks.metadata` needs explicit update or if `as any` cast is acceptable for Phase 7.
   - Recommendation: Extend the Drizzle `metadata` type in `shared/schema.ts` to include the new fields as optional. This is a type-only change (no migration). Run `npm run typecheck` to verify no downstream breaks. The planner should include this as a Wave 0 task.

3. **Where to render approval cards: inline in message stream vs. pinned above input**
   - What we know: The WS `task_requires_approval` event arrives independently from message events. Rendering inline in the message array requires inserting a synthetic "approval" item into the messages array state, which is currently typed as `Message[]`.
   - What's unclear: Whether inserting a synthetic non-Message item into the message array creates TypeScript complexity.
   - Recommendation: Render approval cards as a separate array rendered ABOVE the message input (pinned to bottom of chat, above the compose box), not inline in the message stream. This avoids type complexity and ensures cards are always visible regardless of scroll position. The existing `isTeamWorking` banner uses the same pattern (rendered above the input).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | tsx script execution (existing project pattern) |
| Config file | none — scripts run via `tsx scripts/test-*.ts` |
| Quick run command | `tsx scripts/test-handoff-routing.ts` |
| Full suite command | `npm run gate:safety && npm run test:integrity && npm run test:dto` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAND-01 | `evaluateConductorDecision` with "Build API endpoint for user auth" routes to backend agent | unit | `tsx scripts/test-handoff-routing.ts` | Wave 0 |
| HAND-01 | `evaluateConductorDecision` with "Design onboarding flow wireframes" routes to designer | unit | `tsx scripts/test-handoff-routing.ts` | Wave 0 |
| HAND-01 | `HandoffOrchestrator` queues pg-boss job for dependent task on completion | integration | `tsx scripts/test-handoff-pipeline.ts` | Wave 0 |
| HAND-02 | Handoff announcement message has `isHandoffAnnouncement: true` in metadata, no markdown headers | unit | `tsx scripts/test-handoff-pipeline.ts` | Wave 0 |
| HAND-03 | `handoffTracker.detectCycle` returns `hasCycle: true` for A→B→A pattern | unit | `tsx scripts/test-handoff-routing.ts` | Wave 0 (extends existing tracker) |
| HAND-03 | `orchestrateHandoff` returns `{ status: 'cycle_detected' }` and does NOT queue job | unit | `tsx scripts/test-handoff-routing.ts` | Wave 0 |
| HAND-04 | `executeTask` prompt includes `previousAgentOutput` when `task.metadata.previousAgentOutput` is set | unit | `tsx scripts/test-handoff-pipeline.ts` | Wave 0 |
| UX-01 | `POST /api/tasks/:id/approve` sets `status: 'completed'`, creates message, broadcasts WS event | integration | `tsx scripts/test-approval-endpoints.ts` | Wave 0 |
| UX-01 | `POST /api/tasks/:id/reject` sets `status: 'todo'`, clears `awaitingApproval` | integration | `tsx scripts/test-approval-endpoints.ts` | Wave 0 |
| UX-04 | `handleTaskJob` returns early when `project.executionRules.autonomyPaused === true` | unit | `tsx scripts/test-handoff-pipeline.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `tsx scripts/test-handoff-routing.ts` (pure function tests, fast)
- **Per wave merge:** `npm run gate:safety && npm run test:integrity && tsx scripts/test-handoff-routing.ts && tsx scripts/test-approval-endpoints.ts`
- **Phase gate:** Full suite above green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/test-handoff-routing.ts` — covers HAND-01 (routing stability), HAND-03 (cycle detection) — pure function tests, no DB required
- [ ] `scripts/test-handoff-pipeline.ts` — covers HAND-01 (queue), HAND-02 (announcement), HAND-04 (context pass-through), UX-04 (pause check) — uses mock LLM provider
- [ ] `scripts/test-approval-endpoints.ts` — covers UX-01 approve + reject — requires `STORAGE_MODE=memory` test harness
- [ ] Extend `shared/schema.ts` task `metadata` type to include `awaitingApproval`, `draftOutput`, `previousAgentOutput`, `handoffChain`, `dependsOn` — type-only, no migration

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `server/ai/expertiseMatching.ts` — confirmed `HandoffTracker.detectCycle` BFS implementation, `handoffTracker` module-level singleton, `findBestAgentMatch` short-message fast-path guard
- Direct codebase inspection: `server/ai/conductor.ts` — confirmed `evaluateConductorDecision` signature, routing logic, `inferRoleFromMessage` regex rules
- Direct codebase inspection: `server/autonomy/execution/taskExecutionPipeline.ts` — confirmed `executeTask` and `handleTaskJob` implementation from Phase 6; `status: 'pending_approval'` path confirmed
- Direct codebase inspection: `server/routes/tasks.ts` — confirmed task approval endpoint pattern; confirmed `tasks.assignee` stores role/name string not UUID
- Direct codebase inspection: `shared/schema.ts` — confirmed `tasks.assignee` is `text` (role/name string); `tasks.metadata` JSONB typed fields; `projects.executionRules` JSONB with `autonomyEnabled` and `taskGraph` fields
- Direct codebase inspection: `client/src/components/CenterPanel.tsx` lines 1097-1115 — confirmed existing `task_requires_approval` handler dispatches toast; confirmed `isTeamWorking` banner pattern for approval card placement
- Direct codebase inspection: `client/src/components/TaskApprovalModal.tsx` — confirmed Hatchin design token conventions (hatchin-card, hatchin-border-subtle, hatchin-blue, framer-motion pattern)
- Direct codebase inspection: `.planning/REQUIREMENTS.md` — confirmed UX-01 marked COMPLETE (toast), UX-04 marked DEFERRED; HAND-03 marked COMPLETE
- Direct codebase inspection: `.planning/STATE.md` — confirmed blocker: "verify conductor evaluateConductorDecision produces stable routing when called with synthetic task description as userMessage"

### Secondary (MEDIUM confidence)

- Direct codebase inspection: `server/autonomy/config/policies.ts` — `MAX_HANDOFF_HOPS` does not currently exist; safe to add
- Direct codebase inspection: `server/ai/returnBriefing.ts` — confirmed pattern for storing messages with `isAutonomous: true` metadata; used as reference for handoff announcement storage pattern

### Tertiary (LOW confidence)

- None — all findings are from direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all libraries confirmed installed
- Architecture: HIGH — all integration points derived from direct codebase inspection; no training assumptions
- Pitfalls: HIGH — all derived from actual code paths (short-message fast-path line confirmed in expertiseMatching.ts; assignee type confirmed in schema.ts)
- Test strategy: MEDIUM — test file patterns follow existing scripts convention; exact test content is Wave 0 gaps

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable codebase; conductor and schema unlikely to change)
