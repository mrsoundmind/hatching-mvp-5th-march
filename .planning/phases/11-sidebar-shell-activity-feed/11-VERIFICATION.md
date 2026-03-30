---
phase: 11-sidebar-shell-activity-feed
verified: 2026-03-25T08:00:00Z
status: human_needed
score: 9/10 must-haves verified
human_verification:
  - test: "Verify real-time feed updates appear without page refresh"
    expected: "Triggering a background task causes a new feed item to appear in the Activity tab within 3 seconds"
    why_human: "Requires a live autonomy pipeline execution to fire the CustomEvent bridge; cannot verify with static grep"
  - test: "Verify tab switching preserves scroll position and draft state"
    expected: "Scrolling down in Brain & Docs tab, switching to Activity and back, returns to same scroll position"
    why_human: "CSS display:none scroll preservation is a runtime behavior that requires a browser"
  - test: "Verify agent avatar shows rotating dashed ring during background execution"
    expected: "When a Hatch is assigned a background task, its avatar in ProjectTree shows a 3s rotating dashed ring"
    why_human: "CSS animation on a conditionally-set prop requires browser rendering to confirm"
  - test: "Verify filter chips filter the feed correctly"
    expected: "Clicking 'Handoffs' chip shows only handoff events; clicking 'Today' time chip hides older events"
    why_human: "Client-side filter state is correct in code but requires real events to test filtering behavior"
  - test: "Verify SIDE-04 swipe gesture (partial implementation)"
    expected: "On mobile, the Sheet drawer tabs respond to swipe gestures between tabs OR confirm tap-only is acceptable"
    why_human: "The requirement text specifies 'swipe-between-tabs gesture' but only tap targets are implemented; needs product decision or mobile testing to confirm scope"
---

# Phase 11: Sidebar Shell + Activity Feed Verification Report

**Phase Goal:** Users can see real-time autonomy activity in a tabbed right sidebar — the gating architectural foundation for the entire milestone
**Verified:** 2026-03-25T08:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Typed CustomEvent constants exist in a single registry file — no string literals for event names elsewhere | VERIFIED | `client/src/lib/autonomyEvents.ts` exports `AUTONOMY_EVENTS` with 8 constants, `AutonomyEventName` type, and `dispatchAutonomyEvent` helper |
| 2 | useAutonomyFeed fetches historical events from GET /api/autonomy/events and appends real-time events via CustomEvent bridge | VERIFIED | Hook uses `useQuery` with key `['/api/autonomy/events', ...]` and 4 `useSidebarEvent` listeners (TASK_COMPLETED, TASK_EXECUTING, HANDOFF_ANNOUNCED, APPROVAL_REQUIRED) |
| 3 | useAutonomyFeed groups events by traceId with 3-second debounce before rendering | VERIFIED | `DEBOUNCE_MS = 3000`, `pendingBatch` ref, `flushBatch` groups by `traceId` using a `Map<string, FeedEvent[]>` |
| 4 | GET /api/autonomy/stats returns tasks completed, handoffs, and cost spent for today scope | VERIFIED | `server/routes/autonomy.ts` line 712: endpoint validated with Zod, returns `{tasksCompleted, handoffs, costToday}` |
| 5 | User sees three tabs: Activity, Brain & Docs, Approvals | VERIFIED | `SidebarTabBar.tsx` renders 3 tabs with spring `layoutId="sidebar-tab"` indicator; RightSidebar imports and renders it |
| 6 | Clicking a tab switches content without losing scroll position or draft state | VERIFIED (automated) | CSS `style={{ display: activeTab === 'X' ? 'flex' : 'none' }}` with `aria-hidden` — no conditional unmounting. Runtime behavior needs human confirmation |
| 7 | Active tab persists via localStorage | VERIFIED | `useRightSidebarState` reducer handles `SET_ACTIVE_TAB`, persists via `savePreferences` call, rehydrates in `LOAD_PREFERENCES` case |
| 8 | Activity tab shows unread badge in hatchin-orange; Approvals shows red dot for pending approvals | VERIFIED | `SidebarTabBar.tsx` lines 52-59: orange badge when `unreadActivityCount > 0`, red `animate-pulse` dot when `hasPendingApprovals` |
| 9 | ActivityTab is mounted in RightSidebar Activity panel with stats card, filters, and feed | VERIFIED | `RightSidebar.tsx` imports `ActivityTab` and renders it in the Activity panel; `ActivityTab` composes `AutonomyStatsCard`, `FeedFilters`, `ActivityFeedItem` |
| 10 | Agent avatars show rotating dashed ring when executing background work | VERIFIED (automated) | `BaseAvatar.tsx` extends `AvatarState` with `"working"`, renders dashed ring at `state === "working"`. `ProjectTree.tsx` sets `state={workingAgents.has(agent.id) ? "working" : "idle"}`. CSS keyframe `agent-working-ring` added to `index.css` |

**Score:** 9/10 truths verified (1 pending human confirmation for SIDE-04 swipe gesture scope)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/lib/autonomyEvents.ts` | Typed CustomEvent name constants and dispatcher helper | VERIFIED | Exports `AUTONOMY_EVENTS` (8 constants), `AutonomyEventName` type, `dispatchAutonomyEvent`, and 8 payload interfaces |
| `client/src/hooks/useSidebarEvent.ts` | Typed useEffect wrapper for CustomEvent listening with cleanup | VERIFIED | Uses `useCallback` + `useEffect` with `window.removeEventListener` cleanup |
| `client/src/hooks/useAutonomyFeed.ts` | Combined REST + real-time feed hook with filtering and stats | VERIFIED | Full implementation: REST via `useQuery`, 4 real-time listeners, traceId debounce, 5-option filtering, unread count |
| `client/src/hooks/useAgentWorkingState.ts` | Set of executing agent IDs | VERIFIED | Tracks `Set<string>` updated by `AUTONOMY_EVENTS.AGENT_WORKING_STATE` CustomEvents |
| `client/src/components/sidebar/SidebarTabBar.tsx` | 3-tab bar with spring indicator and badge counts | VERIFIED | Framer Motion `layoutId="sidebar-tab"`, spring `stiffness: 400, damping: 30`, orange/red badge support |
| `client/src/components/ui/EmptyState.tsx` | Reusable empty state with icon, title, description, optional CTA | VERIFIED | Exports `EmptyState` with `icon: LucideIcon`, title, description, optional action |
| `client/src/components/sidebar/ActivityTab.tsx` | Complete Activity tab container | VERIFIED | Composes AutonomyStatsCard, FeedFilters, ActivityFeedItem, EmptyState; wired via `useAutonomyFeed` |
| `client/src/components/sidebar/ActivityFeedItem.tsx` | Single feed event row with color border, avatar, label, timestamp, expandable detail | VERIFIED | Framer Motion entrance animation, category color mapping (green/blue/orange/amber/gray), `formatRelativeTime`, expandable detail |
| `client/src/components/sidebar/AutonomyStatsCard.tsx` | Stats card with 3 stat pills | VERIFIED | Shows tasksCompleted, handoffs, costToday; shimmer loading skeleton |
| `client/src/components/sidebar/FeedFilters.tsx` | Filter chip bar with event type, agent, and time filters | VERIFIED | 5 event type chips + 3 time chips + agent `<select>` dropdown |
| `client/src/components/avatars/BaseAvatar.tsx` | Extended AvatarState with "working" state | VERIFIED | `AvatarState` union includes `"working"`, renders dashed ring overlay with `agent-working-ring` animation |
| `client/src/components/RightSidebar.tsx` | 3-tab CSS-hidden shell wrapping existing brain content | VERIFIED | CSS `display:none/flex` pattern, `aria-hidden`, `layoutId="brain-tab-indicator"` for nested tabs |
| `client/src/hooks/useRightSidebarState.ts` | Extended reducer with activeTab state persisted to localStorage | VERIFIED | `SET_ACTIVE_TAB` action, `activeTab` default `'activity'`, `savePreferences` call |
| `server/routes/autonomy.ts` | GET /api/autonomy/events and GET /api/autonomy/stats | VERIFIED | Both endpoints exist with Zod validation, ownership checks, projectId scoping |
| `server/autonomy/events/eventLogger.ts` | `readAutonomyEventsByProject` function | VERIFIED | Exported function at line 297 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useAutonomyFeed.ts` | `/api/autonomy/events` | `useQuery` | WIRED | `queryKey: ['/api/autonomy/events', ...]`, `enabled: !!projectId` |
| `useAutonomyFeed.ts` | `useSidebarEvent.ts` | import + 4 calls | WIRED | 4 `useSidebarEvent` calls for TASK_COMPLETED, TASK_EXECUTING, HANDOFF_ANNOUNCED, APPROVAL_REQUIRED |
| `useSidebarEvent.ts` | `autonomyEvents.ts` | `import type { AutonomyEventName }` | WIRED | Line 9: `import type { AutonomyEventName } from '@/lib/autonomyEvents'` |
| `RightSidebar.tsx` | `SidebarTabBar.tsx` | import + render | WIRED | Lines 10, 335: imported and rendered with `activeTab`, `onTabChange`, badge props |
| `RightSidebar.tsx` | `useRightSidebarState.ts` | `state.activeTab` | WIRED | `activeTab` destructured from `state`, used in 3 CSS-hide checks |
| `RightSidebar.tsx` | `ActivityTab.tsx` | import + render in Activity panel | WIRED | Lines 11, 348: `<ActivityTab projectId={activeProject?.id} agents={...} />` |
| `ActivityTab.tsx` | `useAutonomyFeed.ts` | `useAutonomyFeed` hook | WIRED | Line 1: `import { useAutonomyFeed }`, called with `projectId` |
| `LeftSidebar.tsx` / `ProjectTree.tsx` | `useAgentWorkingState.ts` | hook import | WIRED | `ProjectTree.tsx` line 9+56: imports and calls hook; LeftSidebar delegates avatar rendering to ProjectTree (per decision in 03-SUMMARY) |
| `BaseAvatar.tsx` | `index.css` | `agent-working-ring` keyframe | WIRED | `index.css` line 567: `@keyframes agent-working-ring { ... rotate(360deg) }` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SIDE-01 | Plan 02 | Tabbed right sidebar with Activity, Brain & Docs, Approvals | SATISFIED | SidebarTabBar renders 3 tabs; RightSidebar restructured with CSS-hidden panels |
| SIDE-02 | Plan 02 | Tab selection persists; inactive tabs retain scroll via CSS-hide | SATISFIED | `activeTab` in localStorage; `display:none` (not unmount) preserves DOM state |
| SIDE-03 | Plan 02, 03 | Activity tab unread badge; Approvals pending badge | SATISFIED | SidebarTabBar orange badge (unread count) and red dot (pending approvals) wired |
| SIDE-04 | Plan 02 | Mobile Sheet drawer with swipe-between-tabs gesture | PARTIAL | Tabs render inside existing Sheet drawer and work as tap targets. The requirement text specifies "swipe-between-tabs gesture" but no swipe gesture handler exists. Plan 02 deliberately scoped the must_have truth to "normal tap targets" — this is a known scope reduction. |
| FEED-01 | Plans 01, 03 | Real-time feed of autonomy events with agent avatars and timestamps | SATISFIED | ActivityFeedItem renders agent avatar (initials), label, relative timestamp; real-time via CustomEvent bridge |
| FEED-02 | Plans 01, 03 | Stats summary card with tasks completed, handoffs, and cost spent | SATISFIED | AutonomyStatsCard with 3 stat pills; GET /api/autonomy/stats supplies the data |
| FEED-03 | Plan 03 | Filter by event type, agent, or time range | SATISFIED | FeedFilters: 5 event chips + 3 time chips + agent dropdown; filtering applied in `filteredEvents` useMemo |
| FEED-04 | Plans 01, 03 | Rapid events aggregated by traceId | SATISFIED | 3-second debounce batching with traceId grouping in `flushBatch` — multiple events → merged summary "N events across M agents" |
| FEED-05 | Plan 02, 03 | Compelling empty state before any autonomous work | SATISFIED | ActivityTab renders EmptyState with "Your team is ready" copy when `events.length === 0 && !isLoading` |
| AGNT-01 | Plan 03 | Agent avatars show pulsing/rotating "working" animation | SATISFIED | `AvatarState` extended with `"working"`, rotating dashed ring via `agent-working-ring` CSS keyframe, ProjectTree wires `useAgentWorkingState` |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/src/components/ui/sparkles.tsx` | 4-6 | Missing `@tsparticles/*` dependencies causing TS errors | Info | Pre-existing issue documented in 01-SUMMARY; unrelated to Phase 11 work. No impact on phase 11 artifacts. |

No stubs, placeholder returns, or TODO comments found in any Phase 11 artifact.

---

## Human Verification Required

### 1. Real-Time Feed Updates

**Test:** With the app running, trigger a background task execution (tell an agent to "go work on X in the background") then switch to the Activity tab in the right sidebar.
**Expected:** A new feed item appears within 3 seconds without a page refresh. The feed item shows the agent's initials, a description matching the task, and a relative timestamp of "just now".
**Why human:** The CustomEvent bridge from CenterPanel to the sidebar hooks requires a live WebSocket message from the server. Static analysis confirms the wiring is correct but cannot fire the event.

### 2. Tab Scroll Position Preservation

**Test:** Open the Brain & Docs tab, scroll down to the bottom of the brain editing section, switch to the Activity tab, then switch back to Brain & Docs.
**Expected:** The scroll position in Brain & Docs is exactly where it was before switching away.
**Why human:** `display:none` preserving scroll position is a browser behavior. The code pattern is correct (no conditional unmounting) but visual confirmation is needed.

### 3. Agent Working Avatar Ring

**Test:** Start a background task for any agent. Observe the agent's avatar in the project tree (left sidebar) while the task is executing.
**Expected:** The avatar shows a rotating dashed ring (blue-ish, 2px dashed border) continuously spinning at approximately 20 RPM.
**Why human:** CSS animations triggered by a React state change require a browser to render. The code conditionally applies the animation but the working state only fires when a real `AGENT_WORKING_STATE` CustomEvent arrives.

### 4. Feed Filter Chips Behavior

**Test:** In the Activity tab (with some autonomy events present), click each filter chip: Tasks, Handoffs, Reviews, Approvals. Then test the Today / 7 days / All time chips. Then select a specific agent from the dropdown.
**Expected:** Each filter correctly shows only matching events. Combining filters (e.g., "Handoffs" + "Today") narrows results appropriately.
**Why human:** Client-side filtering logic is correct in code but requires real events of each category to verify end-to-end filtering behavior.

### 5. SIDE-04 Swipe Gesture Scope Confirmation

**Test:** On a mobile viewport (or device), open the right sidebar Sheet drawer and attempt to swipe horizontally between the Activity, Brain & Docs, and Approvals tabs.
**Expected:** Either (a) swipe navigation works between tabs, OR (b) confirm with product owner that tap-only is acceptable for v1.3 launch.
**Why human:** The REQUIREMENTS.md text for SIDE-04 specifies "swipe-between-tabs gesture" but the implementation only provides tap targets. The Plan 02 must_have deliberately reduced this scope to "normal tap targets". This is a product scope question — if the swipe gesture is required, it represents an unimplemented portion of SIDE-04.

---

## Gaps Summary

No blocking implementation gaps were found. All 14 artifacts exist, are substantive, and are wired together. The TypeScript compiler is clean on Phase 11 files (the only errors are from a pre-existing `sparkles.tsx` missing-dependency issue documented in the SUMMARY).

One scope question exists for SIDE-04: the REQUIREMENTS.md specifies "swipe-between-tabs gesture" but the Plan's must_have truth and the implementation only deliver tap targets. This is either acceptable (scope was intentionally reduced in planning) or represents a minor remaining work item. It does not block the phase goal or any downstream phase.

The phase goal — "Users can see real-time autonomy activity in a tabbed right sidebar — the gating architectural foundation for the entire milestone" — is achieved. The tab shell is wired, the activity feed components are substantive and composed, the data hooks are complete, and the architecture correctly gates phases 12-15 by providing the tab panels they will plug into.

---

_Verified: 2026-03-25T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
