---
phase: 07-agent-handoffs-and-approval-ui
plan: 03
subsystem: ui
tags: [react, framer-motion, tanstack-query, express, websocket, autonomous-tasks]

# Dependency graph
requires:
  - phase: 07-01
    provides: HandoffOrchestrator with task execution pipeline and awaitingApproval metadata

provides:
  - POST /api/tasks/:id/approve endpoint — publishes draftOutput as agent message, marks task completed
  - POST /api/tasks/:id/reject endpoint — returns task to todo, clears draftOutput, stores rejectionReason
  - AutonomousApprovalCard component — inline one-click Approve/Reject card with framer-motion animations
  - CenterPanel integration — approval cards render above message input on task_requires_approval WS events

affects:
  - 07-04
  - phase 8 (chat summary)
  - TaskManager (task status updates after approve/reject)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - State-driven approval cards replacing toast notifications for persistent, actionable UI
    - useMutation + onSuccess card removal pattern for optimistic UX after approve/reject
    - AnimatePresence wrapping list of keyed cards for staggered mount/unmount animations
    - projectId scoping on approvalRequests state to prevent cross-project card leaks

key-files:
  created:
    - server/routes/tasks.ts (approve/reject endpoints added)
    - client/src/components/AutonomousApprovalCard.tsx
    - scripts/test-approval-endpoints.ts
  modified:
    - client/src/components/CenterPanel.tsx

key-decisions:
  - "Approval card renders above message input (pinned visible area) not as a transient toast — UX-01 requirement for persistent one-click access"
  - "Reject sets status to todo (not blocked) per plan research — task remains retryable without manual unblocking"
  - "approvalRequests scoped by projectId in state — filter both on WS event and on activeProject change to prevent cross-project leaks"
  - "AnimatePresence wraps the card list so each card animates independently on mount and unmount"

patterns-established:
  - "Autonomous task approval: state array of approval requests, filter by projectId, render AutonomousApprovalCard per request"
  - "WS event -> state (not toast) for persistent interactive UI elements"

requirements-completed: [UX-01]

# Metrics
duration: 35min
completed: 2026-03-20
---

# Phase 7 Plan 03: Approve/Reject Endpoints and Approval Card Summary

**One-click autonomous task approval via inline orange card above chat input, backed by /approve and /reject REST endpoints that publish draftOutput as agent messages**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-20T15:44:00Z
- **Completed:** 2026-03-20T16:19:19Z
- **Tasks:** 2 automated + 1 human-verify checkpoint
- **Files modified:** 4

## Accomplishments

- Two new REST endpoints in `tasks.ts`: `POST /api/tasks/:id/approve` and `POST /api/tasks/:id/reject` with ownership verification, input validation, and WS broadcasts
- `AutonomousApprovalCard` component with framer-motion enter/exit animations, Hatchin design tokens (orange border/background), Approve (blue) and Reject (red) buttons
- `CenterPanel` wired: `task_requires_approval` WS event now populates state-based card list instead of firing a toast; `approveMutation` and `rejectMutation` handle API calls and card removal
- 17-assertion integration test suite in `scripts/test-approval-endpoints.ts` covering all 8 specified behaviors

## Task Commits

1. **Task 1: Add approve/reject endpoints to tasks.ts** — `a4df3d7` (feat)
2. **Task 2: Create AutonomousApprovalCard and wire into CenterPanel** — `404b258` (feat)

## Files Created/Modified

- `server/routes/tasks.ts` — Added `POST /api/tasks/:id/approve` and `POST /api/tasks/:id/reject` inside `registerTaskRoutes`
- `client/src/components/AutonomousApprovalCard.tsx` — New component: animated approval card with Approve/Reject buttons
- `client/src/components/CenterPanel.tsx` — Added `approvalRequests` state, `approveMutation`, `rejectMutation`, replaced toast handler with state update, rendered `AnimatePresence` card list above auto-scroll helper
- `scripts/test-approval-endpoints.ts` — 17-assertion integration test for all approve/reject behaviors

## Decisions Made

- Approval card renders in the message thread area above the input, not as a toast — satisfies UX-01 requirement for always-visible one-click action
- Reject returns task to `todo` status (not `blocked`) so it can be retried without manual intervention
- `approvalRequests` array scoped by `projectId` to prevent stale cards from showing when switching projects
- `AnimatePresence` wraps the mapped card list to allow individual card animations on removal

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Approve/reject endpoints are live and tested; CenterPanel shows inline approval cards on WS events
- Ready for 07-04 (progressive trust and further autonomy UI polish)
- TaskManager already listens to `task_requires_approval` window events for highlighting — no changes needed there

---
*Phase: 07-agent-handoffs-and-approval-ui*
*Completed: 2026-03-20*
