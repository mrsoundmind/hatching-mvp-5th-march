---
phase: 12-handoff-visualization
plan: "01"
subsystem: frontend/chat
tags: [handoff-visualization, deliberation, websocket, framer-motion, chat-ui]
dependency_graph:
  requires:
    - 11-01 (autonomyEvents.ts + dispatchAutonomyEvent infrastructure)
    - 11-03 (ActivityFeed sidebar ready to receive HANDOFF_ANNOUNCED events)
  provides:
    - HandoffCard component (visual handoff replacement for plain text)
    - DeliberationCard component (collapsible coordination indicator)
    - CenterPanel wiring: isHandoffAnnouncement branch, HANDOFF_ANNOUNCED dispatch, conductor_decision handler
    - synthesis_completed WS passthrough in wsSchemas.ts
  affects:
    - client/src/components/CenterPanel.tsx
    - shared/dto/wsSchemas.ts
tech_stack:
  added: []
  patterns:
    - Framer Motion motion.div with initial/animate/exit for chat cards
    - AnimatePresence for deliberation card mount/unmount
    - CustomEvent dispatch bridge (CenterPanel → sidebar ActivityFeed)
    - 30-second auto-resolve timeout for deliberation state
key_files:
  created:
    - client/src/components/chat/HandoffCard.tsx
    - client/src/components/chat/DeliberationCard.tsx
  modified:
    - client/src/components/CenterPanel.tsx
    - shared/dto/wsSchemas.ts
decisions:
  - HandoffCard renders in the message loop when metadata.isHandoffAnnouncement===true, replacing MessageBubble for that message
  - DeliberationCard uses its own AnimatePresence block before AutonomousApprovalCard, not inside the message map loop
  - Auto-resolve deliberation via 30s timeout — clears itself even if no synthesis_completed arrives
  - dispatchAutonomyEvent for HANDOFF_ANNOUNCED fires in new_message handler (not render), ensuring sidebar receives exactly one event per handoff
metrics:
  duration: "~10min"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 4
---

# Phase 12 Plan 01: Chat Handoff Cards + Deliberation Indicator Summary

**One-liner:** HandoffCard and DeliberationCard components with full CenterPanel wiring — handoff announcement messages now render as visual from/to agent avatar cards, and multi-agent coordination shows a collapsible deliberation indicator in chat.

## What Was Built

### Task 1: HandoffCard and DeliberationCard components
Created `client/src/components/chat/` directory with two new components:

**HandoffCard.tsx** — Visual replacement for plain-text handoff announcement messages. Shows from-agent avatar + name, `ArrowRight` icon, to-agent avatar + name, task title below, and relative timestamp at top-right. Uses `var(--hatchin-blue)` border/background to match handoff category color from ActivityFeedItem. Framer Motion `motion.div` with `initial={{ opacity: 0, y: 6 }}` pattern from AutonomousApprovalCard.

**DeliberationCard.tsx** — Collapsible coordination indicator for multi-agent deliberation. Header row shows a `Users` icon (ongoing) or green `Check` icon (resolved), status text, and `ChevronDown` toggle. Expandable section (via `AnimatePresence` + `motion.div`) shows round count and optional synthesis summary. `useState<boolean>(false)` for `isExpanded`. `onDismiss` callback shown when resolved.

### Task 2: CenterPanel wiring + wsSchemas passthrough

**Imports added:** `HandoffCard`, `DeliberationCard`, `dispatchAutonomyEvent`, `AUTONOMY_EVENTS`, `HandoffAnnouncedPayload`

**Deliberation state added:**
```typescript
const [deliberationState, setDeliberationState] = useState<{...} | null>(null);
const deliberationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**new_message handler:** When `metadata.isHandoffAnnouncement === true`, fires `dispatchAutonomyEvent<HandoffAnnouncedPayload>(AUTONOMY_EVENTS.HANDOFF_ANNOUNCED, {...})` so the sidebar ActivityFeed receives live updates.

**conductor_decision handler:** When `reviewRequired` or `reviewerCount >= 1`, sets `deliberationState` to `'ongoing'` and starts 30-second auto-resolve timer.

**synthesis_completed handler:** Clears timeout, marks deliberation `'resolved'` with optional synthesis summary.

**Message render loop:** Added `isHandoff` branch — handoff announcement messages return `<HandoffCard>` instead of `<MessageBubble>`. `toAgent` resolved from `activeProjectAgents` using `metadata.nextAgentId`.

**Deliberation render:** `<AnimatePresence>` with `<DeliberationCard>` inserted just before the AutonomousApprovalCard block.

**wsSchemas.ts:** Added `synthesis_completed` to the passthrough union.

**Cleanup:** `deliberationTimeoutRef` cleared in the unmount `useEffect` cleanup.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run typecheck` passes (only pre-existing sparkles.tsx errors, no new errors)
- HandoffCard.tsx exports `HandoffCard`, uses `AgentAvatar` + `ArrowRight` + `motion.div`
- DeliberationCard.tsx exports `DeliberationCard`, uses `AnimatePresence`, `useState` for `isExpanded`, `Users` icon
- CenterPanel message loop branches on `isHandoffAnnouncement` and renders `<HandoffCard>`
- CenterPanel dispatches `HANDOFF_ANNOUNCED` CustomEvent in `new_message` handler
- CenterPanel shows `<DeliberationCard>` during `conductor_decision` with `reviewRequired`
- Deliberation auto-resolves via 30-second setTimeout
- `synthesis_completed` in wsSchemas.ts passthrough

## Self-Check: PASSED

Files exist:
- client/src/components/chat/HandoffCard.tsx: FOUND
- client/src/components/chat/DeliberationCard.tsx: FOUND

Commits:
- d1ad2ca: feat(12-01): create HandoffCard and DeliberationCard components
- a0e0bd5: feat(12-01): wire HandoffCard and DeliberationCard into CenterPanel
