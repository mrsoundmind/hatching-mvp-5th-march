# Phase 08: Chat Summary and Tab Notifications - Research

**Researched:** 2026-03-22
**Domain:** Return briefing idempotency, LLM-generated summaries, Browser Notification API, Page Visibility API, document.title badge management
**Confidence:** HIGH

## Summary

Phase 8 delivers two tightly related UX improvements that close the loop on autonomous execution: a Maya return briefing that appears exactly once per absence session, and a flashing browser tab title plus OS-level push notification when work completes in the background.

Significant scaffolding already exists. `server/ai/returnBriefing.ts` generates a templated briefing summary and `server/routes/chat.ts` calls it on every `join_conversation` for project conversations. `client/src/components/CenterPanel.tsx` has a `return_briefing` WS handler (currently shows a toast) and a `visibilitychange` listener that resets the title. The tab badge logic for `background_execution_completed` already sets `document.title` to a static emoji string. The phase upgrades all three to the full spec: LLM-generated Maya voice, per-project absence threshold (15 min), idempotency via server-side `lastBriefedAt`, flashing title toggle, and OS Notification API.

**Primary recommendation:** Treat this as a surgical upgrade of existing code rather than new builds. The chat.ts `join_conversation` hook, the `returnBriefing.ts` module, and the CenterPanel WS handler are the three integration surfaces — everything else reuses established patterns.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Briefing content and tone**
- Outcome headlines only — 1-3 sentences leading with what was accomplished plus what needs attention
- Name agents in the briefing — "Dev finished the auth endpoint, Sam flagged a gap" (feels like a real team update)
- Always brief when work happened, even if nothing needs user action — "Everything's handled — 3 tasks done while you were away"
- LLM-generated in Maya's voice (not templated) — natural, in-character, uses one fast LLM call
- Mention only when tasks await approval — don't duplicate the AutonomousApprovalCard with inline actions
- Appears as a regular Maya chat message (messageType: 'agent') using existing MessageBubble
- Single merged briefing if multiple background runs happened during absence — one message covers everything
- Silent if no autonomous work happened (no "nothing to report" clutter)
- Persists in chat history as a real stored message — scrollable, audit trail
- Action-oriented framing when all work was blocked — "Dev tried the auth endpoint but flagged it for your review"
- Mention key handoffs — "Dev finished auth and handed to Sam for testing — Sam approved it"

**Absence detection**
- Trigger: `join_conversation` WebSocket event (server-side, in chat.ts handler)
- Absence threshold: 15 minutes (user must be away for 15+ min before briefing triggers)
- Per-project tracking — each project has its own "last seen" timestamp
- Server-side DB storage for `lastSeenAt` per user per project — survives page refresh and device switches
- Per-project idempotency — one briefing per project per absence session, switching between agent convos within same project doesn't re-trigger
- Briefing always appears in project-level conversation (`project:{projectId}`) — consistent location, Maya lives there
- No cross-conversation hint needed — tab badge already signals work happened

**Briefing frequency and dedup**
- Once per absence session — no artificial daily cap, each 15+ min absence gets ONE briefing if new work happened
- Delta-only: track `lastBriefedAt` timestamp, only include autonomy events after that time
- First join_conversation gets the briefing — subsequent tabs/devices see it in chat history but don't trigger a new one

**Error handling**
- If LLM fails to generate briefing, fall back to templated message: "While you were away: X tasks completed, Y need review"
- Template fallback is zero-cost and still useful — never silently skip a briefing

**Tab notification style**
- Flashing title toggle — alternates between "(3) Work complete | Hatchin" and "Hatchin" every 1-2s (Slack/Gmail pattern)
- Show count of completed + pending tasks in the title — "(3) Work complete | Hatchin"
- Stops flashing when tab regains focus (existing visibilitychange listener handles this)

**OS browser notifications**
- Yes, use Notification API for OS-level push notifications
- Permission requested on first background_execution_started event — contextual: "We'll work in the background. Want to be notified when done?"
- Title: project name (e.g., "My Startup")
- Body: short outcome summary — "3 tasks completed, 1 needs review"
- Click action: focus tab + navigate to project conversation
- Only fire on completion (background_execution_completed), not on start
- One notification per completion batch, not per task

### Claude's Discretion
- Exact flashing interval (1-2s range)
- Notification icon choice (Hatchin logo or project emoji)
- Template fallback wording
- How to aggregate handoff chains into briefing text (keep concise)
- Dev-mode shortcut for testing (e.g., reduced absence threshold)

### Deferred Ideas (OUT OF SCOPE)
- Email digest of autonomous work (NOTF-01 — v1.2)
- Push notification for high-risk approval (NOTF-02 — v1.2)
- User notification preferences (NOTF-03 — v1.2)
- Favicon badge manipulation — fragile across browsers, not needed with flashing title + OS notification
- Custom notification sounds — OS default is sufficient for v1.1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-03 | Maya delivers a chat summary briefing when user returns after autonomous work completed | Existing `returnBriefing.ts` stub + `join_conversation` hook in chat.ts need upgrade to: LLM voice, 15-min threshold, per-project `lastSeenAt`/`lastBriefedAt` DB tracking, store as real message via `storage.createMessage()` |
| UX-05 | Browser tab title flashes / shows badge when autonomous work completes while tab is inactive | Existing static `document.title` setter (CenterPanel line 1104) needs upgrade to: flashing toggle with setInterval, task count, stop-on-focus; add Notification API permission request on `background_execution_started`, fire OS notification on `background_execution_completed` |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Notification API | Browser native | OS-level push notifications when tab is backgrounded | Zero-dependency, supported in all modern desktop browsers; no server infrastructure needed |
| Page Visibility API | Browser native | Detect tab focus/blur to start/stop flashing title | Already wired in CenterPanel lines 401-408; `document.hidden` and `visibilitychange` event |
| `document.title` | Browser native | Tab title badge with count | Already used in CenterPanel lines 1096-1106; zero-dependency |
| `generateChatWithRuntimeFallback` | Internal `server/llm/providerResolver.ts` | LLM call for Maya briefing text | Established pattern used by `taskExecutionPipeline.ts` via injected `generateText` |
| Drizzle ORM | 0.39.1 | Add `lastSeenAt` / `lastBriefedAt` columns to projects or a new user_project_presence table | Already used for all DB access in this codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `storage.createMessage()` | Internal | Store Maya briefing as real chat message | Same pattern used by `emitHandoffAnnouncement.ts` for autonomous messages |
| `broadcastToConversation()` | Internal `chat.ts` | Push briefing message to WS clients | Same pattern used for all server-to-client message delivery |
| `logAutonomyEvent()` | Internal `eventLogger.ts` | Audit trail for briefing delivery | Same pattern used throughout autonomy pipeline |
| `storage.getAgentsByProject()` + `isSpecialAgent` filter | Internal | Resolve Maya's agentId for briefing message authorship | Maya always exists per project (`is_special_agent: true`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Notification API | Service Worker push | Service Worker push requires HTTPS + separate SW file + backend push server; Notification API works from any foreground JS context — sufficient for this use case since tab is still open (just backgrounded) |
| Drizzle schema column on `projects` | Separate `user_project_presence` table | Separate table is cleaner for multi-user future but adds migration complexity; adding two columns to an existing table (`last_seen_at`, `last_briefed_at` as JSONB keyed by userId) is simpler and sufficient for single-user product |
| `setInterval` for flashing | CSS animation on tab | CSS cannot control `document.title`; `setInterval` is the only option |

### Installation

No new npm packages required. All functionality uses browser-native APIs and existing internal modules.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
server/
└── ai/
    └── returnBriefing.ts        # UPGRADE: LLM-generated Maya voice, idempotency logic
shared/
└── schema.ts                    # ADD: lastSeenAt / lastBriefedAt columns (or JSONB on projects)
server/
└── storage.ts                   # ADD: getUserLastSeenAt(), setUserLastSeenAt(), setUserLastBriefedAt(), getUserLastBriefedAt() to IStorage
server/
└── routes/
    └── chat.ts                  # UPGRADE: join_conversation hook uses 15-min threshold + DB timestamps
client/src/components/
└── CenterPanel.tsx              # UPGRADE: flashing title, Notification API permission + fire
```

### Pattern 1: LLM-Generated Briefing with Injected `generateText`

**What:** `returnBriefing.ts` is upgraded to accept a `generateText` dependency (same as `taskExecutionPipeline.ts` and `handoffAnnouncement.ts`). It queries autonomy events since `lastBriefedAt`, builds a data summary, sends one LLM prompt in Maya's voice, falls back to a template if LLM throws.

**When to use:** On every `join_conversation` for `project:*` conversations where user was absent 15+ min and new autonomy events exist since `lastBriefedAt`.

**Example (existing pattern from handoffAnnouncement.ts):**
```typescript
// Source: server/autonomy/handoff/handoffAnnouncement.ts
export interface HandoffAnnouncementInput {
  generateText: (prompt: string, system: string) => Promise<string>;
  // ...
}
export async function emitHandoffAnnouncement(input: HandoffAnnouncementInput): Promise<void> {
  let announcement = await input.generateText(prompt, system);
  // fallback not shown but pattern: try/catch → templated string
  const msg = await input.storage.createMessage({ ... });
  input.broadcastToConversation(input.conversationId, { type: 'new_message', message: msg });
}
```

The upgraded `returnBriefing.ts` follows this exact pattern: inject `generateText`, store result as real message, broadcast as `new_message`.

### Pattern 2: Per-Project Absence Tracking in DB

**What:** Two server-side timestamps per (userId, projectId) pair. `lastSeenAt` is updated on every `join_conversation`. `lastBriefedAt` is updated after briefing is successfully stored. Briefing only fires when `now - lastSeenAt > 15 min` AND `autonomy events exist after lastBriefedAt`.

**Storage shape:** Add a JSONB column `user_presence` to `projects` (already has `executionRules` JSONB as precedent) OR add two nullable timestamp columns. Simplest: two columns on `projects` are per-project but not per-user — single-user product, so `project.lastSeenAt` and `project.lastBriefedAt` is sufficient.

**Alternative (cleaner):** A `user_project_presence` table with `(user_id, project_id, last_seen_at, last_briefed_at)`. This is more correct for future multi-user but requires a new migration and new storage methods.

**Recommendation:** Single-user product. Add `lastSeenAt` and `lastBriefedAt` as `timestamp` columns to the `projects` table. Two columns, one migration, minimal surface area.

```typescript
// Drizzle addition to shared/schema.ts projects table
lastSeenAt: timestamp("last_seen_at"),           // updated on join_conversation
lastBriefedAt: timestamp("last_briefed_at"),     // updated after briefing message stored
```

### Pattern 3: Flashing Tab Title (Slack/Gmail Pattern)

**What:** On `background_execution_completed`, if `document.hidden`, start a `setInterval` that toggles between notification text and `'Hatchin'`. On `visibilitychange` when tab regains focus, `clearInterval` and reset to `'Hatchin'`.

**When to use:** Only when tab is backgrounded (`document.hidden === true`) and work completed.

**Example:**
```typescript
// Source: CenterPanel.tsx (upgrade of existing lines 1100-1106)
let flashInterval: ReturnType<typeof setInterval> | null = null;

function startFlashingTitle(count: number, label: string) {
  if (flashInterval) clearInterval(flashInterval);
  const notifText = `(${count}) ${label} | Hatchin`;
  let toggle = true;
  flashInterval = setInterval(() => {
    document.title = toggle ? notifText : 'Hatchin';
    toggle = !toggle;
  }, 1500); // 1.5s — midpoint of 1-2s discretion range
}

function stopFlashingTitle() {
  if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
  document.title = 'Hatchin';
}
```

The existing `visibilitychange` handler at CenterPanel line 402 already calls `document.title = 'Hatchin'` on focus — upgrade it to also call `stopFlashingTitle()`.

### Pattern 4: Notification API — Permission-Then-Fire

**What:** Browser `Notification` API (no npm package). Request permission once when `background_execution_started` fires for the first time. Fire notification on `background_execution_completed`. Click handler focuses window and navigates to project conversation.

**Confidence:** HIGH — Notification API is baseline browser API, supported in Chrome, Firefox, Edge, Safari 15.4+ on desktop. Mobile browsers have varying support but this is a desktop-first product.

```typescript
// Source: MDN Notification API (browser native)
// Permission request — contextual on first background_execution_started
if (Notification.permission === 'default') {
  Notification.requestPermission(); // returns Promise<'granted'|'denied'|'default'>
}

// Fire on background_execution_completed
function fireCompletionNotification(projectName: string, summary: string) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(projectName, {
    body: summary,
    icon: '/favicon.ico', // or project emoji rendered to canvas — defer to discretion
  });
  n.onclick = () => {
    window.focus();
    // navigate to project conversation if not already there
  };
}
```

### Anti-Patterns to Avoid

- **Re-triggering briefing on every `join_conversation`:** Current code in `chat.ts` lines 556-582 uses a hardcoded 2-hour window computed at request time (`Date.now() - 2h`). This means every reconnect within 2 hours triggers a new briefing check. Fix: use DB `lastBriefedAt` — only brief if new events exist after that timestamp.
- **Briefing as toast only:** Current `return_briefing` CenterPanel handler (line 1144) shows a toast. The spec requires storing as a real Maya chat message via `storage.createMessage()` so it persists in history. The WS event that delivers it should be `new_message` (same as any agent message), not a special `return_briefing` event. The server does the store; client just renders the message normally.
- **Notification API on every completion event:** One notification per completion batch. Guard with a per-session flag (e.g. `lastNotificationFiredAt`) so rapid successive completion events don't spam.
- **Flashing title without a ref/cleanup:** The `setInterval` must be stored in a `useRef` (not useState) to avoid stale closures and ensure cleanup on unmount. Missing cleanup causes the title to keep flashing after the component unmounts.
- **Querying `autonomy_events` with raw SQL:** Use the existing `countAutonomyEventsForProjectToday` pattern as a model — but note it uses raw pool.query (not Drizzle). For the briefing, the query needs events by `project_id` and `timestamp > lastBriefedAt`, filtered to task-relevant event types (`task_completed`, `task_failed`, `proposal_approved`). Follow the same raw pool pattern as `eventLogger.ts` for consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OS-level notifications | Custom WebSocket push server or backend email | Browser `Notification` API | Tab is still open; no server infra needed; zero dependencies |
| Tab visibility detection | Polling `document.hasFocus()` on a timer | Page Visibility API `visibilitychange` + `document.hidden` | Already wired in CenterPanel; browser-native, battery-friendly |
| LLM briefing fallback | Complex retry logic | try/catch → templated string | Consistent with error-handling pattern already used throughout autonomy pipeline |
| Idempotency token | UUID-based dedup table | DB timestamp columns (`lastBriefedAt`) | Simpler: compare timestamps, no extra table |

**Key insight:** The notification and visibility features are standard browser APIs with no npm equivalent. The idempotency pattern is timestamp comparison, not cryptographic tokens.

---

## Common Pitfalls

### Pitfall 1: Briefing Fires on Every Reconnect

**What goes wrong:** Current `chat.ts` implementation computes a rolling 2-hour window from `Date.now()` on every WS join. Result: every reconnect within 2 hours re-triggers the briefing check, potentially sending duplicate briefings to the same client session.

**Why it happens:** No `lastBriefedAt` tracking — only `lastSeenAt` threshold exists and it's computed ephemerally.

**How to avoid:** Store `lastBriefedAt` in DB per project. After storing the briefing message, update `lastBriefedAt`. On subsequent `join_conversation`, only brief if new autonomy events exist after `lastBriefedAt`.

**Warning signs:** Maya sends two identical briefing messages in the same session.

### Pitfall 2: Briefing Shows in Wrong Conversation

**What goes wrong:** The briefing message is stored and broadcast to `agent:*` or `team:*` conversation instead of `project:*`.

**Why it happens:** The `join_conversation` hook in chat.ts already guards with `if (conversationId.startsWith('project:'))` (line 556), but the briefing message storage and broadcast must also target `project:{projectId}` explicitly — not the conversationId of the triggering WS join if it's an agent conversation.

**How to avoid:** Always target `project:{projectId}` for briefing storage and broadcast, regardless of which conversation triggered the join event. The spec is explicit: "Briefing always appears in project-level conversation."

**Warning signs:** Briefing appears in individual agent chats, or only appears if user opens project-level chat first.

### Pitfall 3: Maya Agent Not Found for Message Authorship

**What goes wrong:** `storage.createMessage({ agentId: mayaId, ... })` fails or stores with null agentId because Maya was not found.

**Why it happens:** Maya is the special agent with `is_special_agent: true`, but `storage.getAgentsByProject()` returns all agents — Maya must be filtered from that list.

**How to avoid:** In the briefing module: `const agents = await storage.getAgentsByProject(projectId); const maya = agents.find(a => a.isSpecialAgent);` — if not found, still store the message with `agentId: null` as graceful degradation.

**Warning signs:** Briefing messages appear as system messages or with no avatar.

### Pitfall 4: `Notification` API Throws in Non-Secure Context

**What goes wrong:** `new Notification(...)` throws or is undefined in `http://` dev environments.

**Why it happens:** `Notification` API requires a secure context (HTTPS or localhost). Dev on `localhost` is fine; accessing via IP (e.g. 192.168.x.x) is not.

**How to avoid:** Always guard: `if (!('Notification' in window)) return;`. Localhost is treated as secure context so standard dev workflow is unaffected.

**Warning signs:** Console error "Notification is not defined" or permission request never appears.

### Pitfall 5: setInterval Ref Leaking Across Project Navigation

**What goes wrong:** User navigates to a different project while title is flashing; the interval from the old project keeps running and `document.title` keeps updating after component remount.

**Why it happens:** `setInterval` stored in a module-level variable or `useState` (not `useRef`) — the cleanup in `useEffect` return doesn't run correctly.

**How to avoid:** Store the interval ID in a `useRef<ReturnType<typeof setInterval> | null>`. Clear it in `useEffect` cleanup AND in the `visibilitychange` handler.

**Warning signs:** Tab title continues flashing after navigating to a different project, or flashing stops too early.

### Pitfall 6: Autonomy Events Query Missing Relevant Event Types

**What goes wrong:** Briefing says "nothing happened" even though agents did work, because the autonomy_events query filters only `task_completed` but handoff events are stored as `task_assigned` or `autonomous_task_execution`.

**Why it happens:** The event type taxonomy in `eventTypes.ts` has many event types; task completion is `task_completed`, but blocked tasks emit `task_failed`, and execution begins with `autonomous_task_execution`.

**How to avoid:** Query for the union of: `['task_completed', 'task_failed', 'proposal_approved', 'autonomous_task_execution']`. Map these to briefing narrative: `task_completed` = "X tasks done", `task_failed` = "Y flagged for review", `proposal_approved` = "Z tasks approved".

---

## Code Examples

### Existing returnBriefing.ts (current stub — shows what needs replacing)

```typescript
// Source: server/ai/returnBriefing.ts (current implementation)
export async function generateReturnBriefing(input: BriefingInput): Promise<BriefingSummary> {
  // Current: template string only, no LLM, no idempotency, hardcoded 2-hour window passed in from caller
  const summary = `While you were away, the team ${parts.join(' and ')}.`;
  return { hasBriefing: true, summary, ... };
}
```

The upgraded version must:
1. Accept `generateText` as an injected dependency (same as `taskExecutionPipeline.ts`)
2. Query `autonomy_events` for events after `lastBriefedAt` (not after computed `lastSeenAt`)
3. Build data context (agent names, task titles, counts) from events + `getAgentsByProject()`
4. Call LLM with Maya voice prompt
5. Fall back to template string on LLM failure
6. Store result as real message via `storage.createMessage()`
7. Return `{ hasBriefing, messageId }` — caller broadcasts as `new_message`

### Existing join_conversation hook (current — shows insertion point)

```typescript
// Source: server/routes/chat.ts line 556-582 (current)
if (conversationId.startsWith('project:')) {
  try {
    const lastSeen = new Date(Date.now() - 2 * 60 * 60 * 1000); // hardcoded 2h — REPLACE
    const briefing = await generateReturnBriefing({ projectId, userId, lastSeenAt: lastSeen, storage });
    if (briefing.hasBriefing) {
      ws.send(JSON.stringify({ type: 'return_briefing', ... })); // REPLACE with new_message broadcast
    }
  } catch { /* non-critical */ }
}
```

Upgrade: read `project.lastSeenAt` from DB, check `now - lastSeenAt > 15min`, call upgraded `generateReturnBriefing`, then update `project.lastSeenAt` and `project.lastBriefedAt`.

### Existing tab badge handler (current — shows what needs upgrading)

```typescript
// Source: client/src/components/CenterPanel.tsx lines 1100-1106
else if (message.type === 'background_execution_completed' || message.type === 'task_execution_completed') {
  setIsTeamWorking(false);
  setTeamWorkingTaskCount(0);
  if (document.hidden) {
    document.title = '\u2705 Work complete | Hatchin'; // static — UPGRADE to flashing
  }
}
```

Upgrade: replace static setter with `startFlashingTitle(count, 'Work complete')` where `count` comes from `message.completedCount ?? message.taskCount ?? 1`.

### Existing return_briefing WS handler (current — shows what needs replacing)

```typescript
// Source: client/src/components/CenterPanel.tsx lines 1144-1153
else if (message.type === 'return_briefing') {
  if (message.summary) {
    toast({ title: 'Welcome back!', description: message.summary, duration: 10000 });
  }
}
```

Upgrade: Remove this handler entirely. The server now broadcasts the briefing as a `new_message` event with `messageType: 'agent'`. The existing `new_message` handler in CenterPanel already renders agent messages — no client-side change needed for rendering. Optionally keep a lightweight handler just to invalidate task queries.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Favicon badge (`.ico` swap) | Flashing `document.title` | Deferred in CONTEXT.md | Title flash is cross-browser reliable; favicon swap is fragile especially on Safari |
| Template briefing string | LLM-generated Maya voice | Phase 08 | More natural, in-character; falls back to template on LLM failure |
| Briefing delivered as toast | Briefing stored as real Maya chat message | Phase 08 | Persists in history, appears in scrollable timeline, feels like real teammate update |
| 2-hour absence window (hardcoded at call site) | 15-minute DB-backed threshold | Phase 08 | More sensitive to shorter absence sessions; survives page reload |

**Deprecated/outdated:**
- `return_briefing` WS event type: after this phase, the server sends briefings as `new_message` events (same as any agent message). The `return_briefing` event type in `wsSchemas.ts` can be removed or left as a no-op for backward compatibility during transition.
- Toast-based briefing: replaced by persistent chat message.

---

## Open Questions

1. **Schema approach for lastSeenAt / lastBriefedAt**
   - What we know: `projects` table already has JSONB fields (`executionRules`, `brain`, `coreDirection`). Adding two `timestamp` columns is a clean migration.
   - What's unclear: Whether `npm run db:push` (Drizzle push) will handle adding nullable timestamp columns to an existing production table without data loss — it should, but any migration touching production data warrants a test run against a staging DB first.
   - Recommendation: Add as nullable `timestamp` columns on `projects` table. Run `npm run db:push`. Verify with `npm run typecheck` after schema change.

2. **Autonomy events query pattern**
   - What we know: The existing `countAutonomyEventsForProjectToday` uses raw `pool.query()` (not Drizzle). The briefing needs a filtered query: events by `project_id` AND `timestamp > lastBriefedAt` AND `event_type IN (...)`.
   - What's unclear: Whether to add this as a new `IStorage` method (keeping the raw SQL in `storage.ts`) or inline it in `returnBriefing.ts` using the same `getDbPool` pattern from `eventLogger.ts`.
   - Recommendation: Add a new `IStorage` method `getAutonomyEventsSince(projectId: string, since: Date): Promise<AutonomyEvent[]>` — keeps raw SQL contained in storage layer, both `MemStorage` and `DatabaseStorage` must implement it.

3. **Notification icon**
   - What we know: Options are `/favicon.ico`, project emoji rendered to canvas (complex), or Hatchin logo. Claude's discretion.
   - Recommendation: Use `/favicon.ico` as icon path. Simple, reliable, zero-dependency. Project emoji could be added later.

---

## Validation Architecture

No explicit `nyquist_validation` key in `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | TypeScript compile check (primary); manual browser test (secondary) |
| Config file | `tsconfig.json` |
| Quick run command | `npm run typecheck` |
| Full suite command | `npm run qa:full` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-03 | Maya return briefing fires after 15+ min absence with autonomous work | Integration (manual) | `npm run typecheck` | Partial — `returnBriefing.ts` exists, needs upgrade |
| UX-03 | Briefing stored as real message in `project:{projectId}` conversation | Unit | `npm run typecheck` (type safety) | ❌ Wave 0 |
| UX-03 | Second `join_conversation` within same session does NOT re-trigger briefing | Integration (manual) | Manual browser verification | ❌ Wave 0 |
| UX-03 | LLM failure falls back to template, never skips briefing | Unit | `npm run test:tone` (existing script pattern) | ❌ Wave 0 |
| UX-05 | Tab title flashes when work completes with hidden tab | Manual browser | Manual: minimize tab, trigger completion | ❌ Wave 0 |
| UX-05 | Tab title stops flashing when tab regains focus | Manual browser | Manual: refocus tab after flash starts | ❌ Wave 0 |
| UX-05 | OS notification fires on `background_execution_completed` with granted permission | Manual browser | Manual: grant permission, trigger completion | ❌ Wave 0 |
| UX-05 | No notification fires if `Notification.permission !== 'granted'` | Unit | `npm run typecheck` (guard present) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run typecheck`
- **Per wave merge:** `npm run qa:full`
- **Phase gate:** Full suite green + manual browser smoke test of briefing and tab flash before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/test-return-briefing.ts` — unit test for briefing idempotency guard (no LLM call; mocked storage returning events after lastBriefedAt)
- [ ] `scripts/test-tab-notification.ts` — not applicable (browser-only); document manual test steps instead
- [ ] Drizzle schema migration: `npm run db:push` after adding `lastSeenAt`/`lastBriefedAt` columns

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `server/ai/returnBriefing.ts` — current stub implementation
- Direct code inspection of `server/routes/chat.ts` lines 504-582 — join_conversation handler
- Direct code inspection of `client/src/components/CenterPanel.tsx` lines 395-409, 1090-1153 — existing tab badge and return_briefing handler
- Direct code inspection of `server/autonomy/handoff/handoffAnnouncement.ts` — established pattern for LLM-generated agent messages
- Direct code inspection of `server/autonomy/events/eventTypes.ts` — all autonomy event type names
- Direct code inspection of `shared/schema.ts` — current projects table columns (no lastSeenAt yet)
- Direct code inspection of `server/storage.ts` — IStorage interface, existing autonomy event methods
- Direct code inspection of `shared/dto/wsSchemas.ts` — existing `return_briefing` WS event schema

### Secondary (MEDIUM confidence)

- MDN Web Docs — Browser Notification API: requires secure context, `Notification.permission` states, `requestPermission()` returns Promise, `onclick` on notification instance; consistent with codebase's browser target
- MDN Web Docs — Page Visibility API: `document.hidden`, `visibilitychange` event; already used correctly in CenterPanel

### Tertiary (LOW confidence)

- None — all findings verified against existing codebase or browser-native APIs with well-established behavior.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are either existing internal modules or browser-native APIs; no new npm packages needed
- Architecture: HIGH — patterns lifted directly from existing codebase (handoffAnnouncement.ts, taskExecutionPipeline.ts, existing CenterPanel handlers)
- Pitfalls: HIGH — identified from direct code inspection of current stub implementation gaps vs. spec requirements

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable browser APIs; internal code patterns change only with intentional refactors)
