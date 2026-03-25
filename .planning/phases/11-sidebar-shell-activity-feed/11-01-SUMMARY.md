---
phase: 11-sidebar-shell-activity-feed
plan: 01
subsystem: ui, api
tags: [react-hooks, custom-events, tanstack-query, zod, autonomy, activity-feed]

# Dependency graph
requires:
  - phase: 09-inactivity-triggers
    provides: Autonomy event logging infrastructure and eventLogger module
provides:
  - Typed CustomEvent registry (AUTONOMY_EVENTS constants + payload interfaces)
  - useSidebarEvent hook for typed CustomEvent listening with cleanup
  - useAutonomyFeed hook combining REST + real-time events with traceId grouping and filtering
  - useAgentWorkingState hook tracking executing agent IDs
  - GET /api/autonomy/events with projectId scoping and traceId aggregation
  - GET /api/autonomy/stats with period-based aggregation
  - readAutonomyEventsByProject DB-optimized query function
affects: [11-02, 11-03, 12-handoff-viz, 13-approvals-hub]

# Tech tracking
tech-stack:
  added: []
  patterns: [typed-custom-event-registry, sidebar-event-hook-pattern, rest-plus-realtime-feed, debounced-trace-grouping]

key-files:
  created:
    - client/src/lib/autonomyEvents.ts
    - client/src/hooks/useSidebarEvent.ts
    - client/src/hooks/useAutonomyFeed.ts
    - client/src/hooks/useAgentWorkingState.ts
  modified:
    - server/routes/autonomy.ts
    - server/autonomy/events/eventLogger.ts

key-decisions:
  - "DB-level project filtering in readAutonomyEventsByProject for efficiency, with in-memory fallback"
  - "Cast eventType to string for stats aggregation to handle event types not yet in AutonomyEventType union"
  - "workingAgents passed through useAutonomyFeed via useAgentWorkingState composition per CONTEXT.md locked interface"

patterns-established:
  - "Typed CustomEvent registry: all autonomy event names as constants in autonomyEvents.ts, never string literals elsewhere"
  - "useSidebarEvent hook: every sidebar component uses this instead of raw addEventListener"
  - "REST + real-time feed pattern: TanStack useQuery for history, CustomEvent for live append, debounced traceId grouping"

requirements-completed: [FEED-01, FEED-02, FEED-04]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 11 Plan 01: Data Foundation Summary

**Typed CustomEvent registry, autonomy feed hooks with traceId-grouped 3s debounce, and project-scoped backend endpoints for events and stats**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T06:57:32Z
- **Completed:** 2026-03-25T07:01:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Typed CustomEvent registry with 8 event constants, 8 payload interfaces, and dispatcher function prevents string literal duplication
- useAutonomyFeed hook provides complete data contract for ActivityTab: historical REST load, real-time CustomEvent append, traceId grouping with 3-second debounce, category/agent/time filtering, and unread count management
- Backend endpoints serve project-scoped autonomy data with Zod validation, traceId aggregation, and period-based stats

## Task Commits

Each task was committed atomically:

1. **Task 1: Create typed CustomEvent registry and useSidebarEvent hook** - `c0097fd` (feat)
2. **Task 2: Create useAutonomyFeed and useAgentWorkingState hooks + backend endpoints** - `c9e79cf` (feat)

## Files Created/Modified
- `client/src/lib/autonomyEvents.ts` - Typed event name constants, payload interfaces, dispatcher function
- `client/src/hooks/useSidebarEvent.ts` - Typed useEffect wrapper for CustomEvent listening with cleanup
- `client/src/hooks/useAutonomyFeed.ts` - Combined REST + real-time feed hook with filtering and stats
- `client/src/hooks/useAgentWorkingState.ts` - Set of executing agent IDs via CustomEvent
- `server/routes/autonomy.ts` - Enhanced GET /api/autonomy/events, added GET /api/autonomy/stats
- `server/autonomy/events/eventLogger.ts` - Added readAutonomyEventsByProject with DB-level filtering

## Decisions Made
- Used DB-level project filtering (SQL WHERE) in readAutonomyEventsByProject for efficiency instead of loading all events and filtering in memory
- Cast eventType to string for stats aggregation comparisons since AutonomyEventType union doesn't include all event types used by the frontend (e.g., handoff_announced)
- Composed useAgentWorkingState inside useAutonomyFeed to satisfy the CONTEXT.md locked interface (workingAgents in return object) while keeping the hook independently usable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2367 type comparison error for handoff_announced**
- **Found during:** Task 2 (backend stats endpoint)
- **Issue:** AutonomyEventType union type doesn't include 'handoff_announced', causing TypeScript comparison error
- **Fix:** Cast event.eventType to string before comparison in stats aggregation
- **Files modified:** server/routes/autonomy.ts
- **Verification:** npx tsc --noEmit passes (only pre-existing sparkles.tsx errors remain)
- **Committed in:** c9e79cf (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type casting fix for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All hooks and endpoints are ready for Plans 02 (Sidebar Shell + Tab Components) and 03 (Activity Feed UI)
- useAutonomyFeed provides the complete data contract that ActivityTab and FeedItem components will consume
- useSidebarEvent pattern established for all future sidebar CustomEvent listeners

---
*Phase: 11-sidebar-shell-activity-feed*
*Completed: 2026-03-25*
