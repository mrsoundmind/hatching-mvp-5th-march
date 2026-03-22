# Phase 8: Chat Summary and Tab Notifications - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users return to a conversational briefing from Maya and never miss completed work due to an inactive tab. Two deliverables: (1) Maya return briefing with idempotency guard, triggered on join_conversation; (2) Browser tab badge (flashing title + count) and OS-level push notification when autonomous work completes while tab is backgrounded.

</domain>

<decisions>
## Implementation Decisions

### Briefing content & tone
- Outcome headlines only — 1-3 sentences leading with what was accomplished + what needs attention
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

### Absence detection
- Trigger: `join_conversation` WebSocket event (server-side, in chat.ts handler)
- Absence threshold: 15 minutes (user must be away for 15+ min before briefing triggers)
- Per-project tracking — each project has its own "last seen" timestamp
- Server-side DB storage for `lastSeenAt` per user per project — survives page refresh and device switches
- Per-project idempotency — one briefing per project per absence session, switching between agent convos within same project doesn't re-trigger
- Briefing always appears in project-level conversation (`project:{projectId}`) — consistent location, Maya lives there
- No cross-conversation hint needed — tab badge already signals work happened

### Briefing frequency & dedup
- Once per absence session — no artificial daily cap, each 15+ min absence gets ONE briefing if new work happened
- Delta-only: track `lastBriefedAt` timestamp, only include autonomy events after that time
- First join_conversation gets the briefing — subsequent tabs/devices see it in chat history but don't trigger a new one

### Error handling
- If LLM fails to generate briefing, fall back to templated message: "While you were away: X tasks completed, Y need review"
- Template fallback is zero-cost and still useful — never silently skip a briefing

### Tab notification style
- Flashing title toggle — alternates between "(3) Work complete | Hatchin" and "Hatchin" every 1-2s (Slack/Gmail pattern)
- Show count of completed + pending tasks in the title — "(3) Work complete | Hatchin"
- Stops flashing when tab regains focus (existing visibilitychange listener handles this)

### OS browser notifications
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Autonomy pipeline (briefing data source)
- `server/autonomy/events/eventLogger.ts` — Autonomy event logging, event types that briefing aggregates
- `server/autonomy/execution/taskExecutionPipeline.ts` — executeTask + handleTaskJob flow, where completion events originate
- `server/autonomy/handoff/handoffOrchestrator.ts` — Handoff chain data for briefing "Dev handed to Sam" narrative
- `server/autonomy/handoff/handoffAnnouncement.ts` — Existing handoff announcement pattern (avoid duplication)
- `server/autonomy/config/policies.ts` — Budget constants, MAX_HANDOFF_HOPS

### WebSocket & join flow (briefing trigger point)
- `server/routes/chat.ts` §504-540 — join_conversation handler where briefing check will be inserted
- `client/src/components/CenterPanel.tsx` §395-409 — Existing visibilitychange listener and tab title management
- `client/src/components/CenterPanel.tsx` §1090-1107 — Existing background_execution WS handlers with tab badge logic
- `client/src/lib/websocket.ts` — WebSocket connection management

### Requirements
- `.planning/REQUIREMENTS.md` — UX-03 (Maya briefing on return) and UX-05 (browser tab badge)

### Storage
- `server/storage.ts` — IStorage interface, where lastSeenAt/lastBriefedAt methods will be added
- `shared/schema.ts` — Database schema, may need column for lastSeenAt tracking

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `document.title` badge logic already in CenterPanel (lines 1096-1106) — currently static, will be upgraded to flashing
- Page Visibility API listener already wired (lines 401-408) — resets title on return
- `broadcastToConversation()` — existing WS broadcast helper for sending briefing to conversation
- `logAutonomyEvent()` — existing event logger for tracking briefing delivery
- `generateText` dependency injection pattern from taskExecutionPipeline — reusable for briefing LLM call
- Maya special agent always exists per project (`is_special_agent: true`) — can be looked up for briefing message author

### Established Patterns
- WS event handling: CenterPanel switch/case on `message.type` — briefing delivery follows same pattern
- Message storage: `storage.createMessage()` with `messageType: 'agent'` and `agentId` — briefing uses same pattern
- Autonomy event querying: `storage.countAutonomyEventsForProjectToday()` — similar pattern for briefing data aggregation
- Project-scoped conversation: `project:{projectId}` canonical format — briefing target conversation

### Integration Points
- `join_conversation` case in chat.ts (line 504) — insert briefing check after existing connection_confirmed emit
- CenterPanel WS handler — add briefing_delivered event handler for any client-side reactions
- `autonomy_events` table — query source for what happened during absence
- `tasks` table — query for pending approvals to mention in briefing

</code_context>

<specifics>
## Specific Ideas

- Briefing should feel like Maya catching you up as a colleague — "Hey! While you were away, Dev knocked out the auth endpoint and handed it to Sam for review. Sam approved it. One task still needs your input though."
- The flashing tab title pattern should match Slack's behavior — alternating between notification text and app name
- Permission request for OS notifications should be contextual and non-intrusive — tied to the moment background work starts for the first time

</specifics>

<deferred>
## Deferred Ideas

- Email digest of autonomous work (NOTF-01 — v1.2)
- Push notification for high-risk approval (NOTF-02 — v1.2)
- User notification preferences (NOTF-03 — v1.2)
- Favicon badge manipulation — fragile across browsers, not needed with flashing title + OS notification
- Custom notification sounds — OS default is sufficient for v1.1

</deferred>

---

*Phase: 08-chat-summary-and-tab-notifications*
*Context gathered: 2026-03-22*
