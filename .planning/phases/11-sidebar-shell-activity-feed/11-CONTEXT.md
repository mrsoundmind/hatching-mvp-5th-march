# Phase 11: Sidebar Shell + Activity Feed - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the right sidebar into a 3-tab shell (Activity, Brain & Docs, Approvals), build a live autonomy event feed with stats card and filters, add agent "working" avatar animation, and design empty states. This is the gating foundation — every subsequent v1.3 phase plugs components into these tabs. Mobile sidebar gets tab support via Sheet drawer.

**Requirements:** SIDE-01, SIDE-02, SIDE-03, SIDE-04, FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, AGNT-01

</domain>

<decisions>
## Implementation Decisions

### Activity Feed — Information Density & Layout
- **GitHub-style notification center** — not Slack (too noisy) or commit log (too technical). Each feed item shows: agent avatar (32px), one-line event description, relative timestamp ("2m ago"), color-coded left border by event category
- Event categories with colors: task events (hatchin-green), handoff events (hatchin-blue), review events (hatchin-orange), approval events (amber), system events (gray)
- Show only outcome-level events — "Coda completed: API endpoint scaffolding" not "Coda started thinking... Coda called LLM... Coda finished generating..."
- Expandable detail on click — shows risk score, peer review outcome, handoff context if applicable
- Max 200 events in memory, oldest dropped. Initial load from `GET /api/autonomy/events` (last 50), then append via CustomEvent bridge from CenterPanel

### Tab Switching & State Preservation (SIDE-02)
- **CSS-hide pattern**: All 3 tab panels render simultaneously. Active tab gets `display: block`, inactive get `display: none` + `aria-hidden="true"`. Never conditionally unmount tabs
- Existing brain editing state in `useRightSidebarState` stays intact — Brain & Docs tab wraps the current brain editing JSX as-is in Phase 11, then Phase 14 redesigns it
- Tab bar sits at top of RightSidebar, above all content. Uses Framer Motion `layoutId="sidebar-tab"` spring indicator (same pattern as existing overview/tasks toggle)
- `activeTab` state added to `useRightSidebarState` reducer, persisted to localStorage. Default: `'activity'`
- Tab order: Activity | Brain & Docs | Approvals

### Stats Card — What Numbers Matter (FEED-02)
- **"Today" scope** — resets at midnight local time. Shows: tasks completed today, handoffs today, cost spent today (formatted as "$0.12")
- Cost visible to all users. Free tier users see "$0.00" (autonomy disabled). This creates aspiration — they see what Pro unlocks
- Compact horizontal layout: 3 stat pills in a row. Icon + number + label. No charts, no graphs — just clean numbers
- Data source: new `GET /api/autonomy/stats?projectId=X&period=today` endpoint that aggregates from `autonomy_events` table

### Mobile Sidebar Experience (SIDE-04)
- **Tabs inside Sheet, no swipe gesture** — swipe-between-tabs adds complexity with diminishing returns on mobile. The Sheet drawer opens, tabs render at top as normal tap targets, content scrolls below
- Sheet width stays at current Shadcn default. Tab bar is horizontally compact (icon + short label)
- Keep it simple — mobile is secondary for this user base. If swipe becomes important later, it's a Phase 15 polish item

### Agent Working Avatar (AGNT-01)
- Add `"working"` to `AvatarState` union type in BaseAvatar.tsx
- Animation: slow-rotating dashed ring around avatar (CSS `@keyframes agent-working-ring` — 3s rotation, 2px dashed border in hatchin-blue/60) + subtle pulsing glow matching `ai-thinking-ring` pattern
- Triggered by `background_execution_started` WS event, cleared by `background_execution_completed` or `task_execution_completed`
- `useAutonomyFeed` hook exposes `workingAgents: Set<string>` — LeftSidebar and ProjectTree read this to set avatar state

### Feed Aggregation (FEED-04)
- Backend aggregates at API layer: `GET /api/autonomy/events` returns grouped summaries. If 5 tasks were assigned in a handoff chain, return 1 event: "5 tasks assigned across 3 agents" with expandable detail
- Aggregation key: `traceId` — events sharing a trace are grouped into one feed item
- Real-time WS events arrive ungrouped. Frontend groups by traceId in `useAutonomyFeed` hook with 3-second debounce window before rendering

### Filter Chips (FEED-03)
- Horizontal scrollable chip bar below stats card: "All" (default), "Tasks", "Handoffs", "Reviews", "Approvals"
- Agent filter: dropdown that lists project agents with avatars. Single-select
- Time filter: "Today", "Last 7 days", "All time" — 3 options, not a date picker
- Filters apply client-side to the in-memory event list (200 items max). No re-fetch needed
- Active filters show as filled chips, inactive as outlined

### Empty States (FEED-05)
- Activity tab empty state: Illustration area (64px icon), title "Your team is ready", description "When your Hatches start working autonomously, you'll see their progress here. Try asking one to work on something in the background."
- Approvals tab empty state: "All clear!" + "No pending approvals. When a Hatch needs your sign-off on something risky, it'll show up here."
- Reusable `EmptyState` component: `icon`, `title`, `description`, `action?` (optional CTA button) props

### Badge Counts (SIDE-03)
- Activity tab badge: count of unread events since last time user viewed Activity tab. Stored in React state (not persisted). Clears when tab is selected
- Approvals tab badge: count of pending approvals (approval_status = 'pending'). Always visible, always accurate. Red dot, not number, when count > 0
- Badge renders as absolute-positioned circle on tab icon. Uses `hatchin-orange` for activity, `red-500` for approvals

### Claude's Discretion
- Exact animation timing and easing for tab transitions
- Feed item hover states and micro-interactions
- Loading skeleton design for initial feed fetch
- Error state when autonomy events API fails
- Exact empty state icon choices
- Stats card loading shimmer pattern

</decisions>

<specifics>
## Specific Ideas

- Feed should feel alive — when events come in, they slide in from top with a subtle entrance animation (opacity + translateY, 0.18s, same as existing message animations)
- Stats card should feel like a dashboard widget — compact, informative, not heavy. Think Linear's sidebar stats, not a Grafana panel
- Tab indicator should use the existing spring animation pattern (`stiffness: 400, damping: 30`) already proven in RightSidebar's overview/tasks toggle
- Empty states should feel encouraging, not sterile. The tone should match Hatchin's brand — warm, human, "your team is here for you"

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sidebar structure & requirements
- `.planning/REQUIREMENTS.md` — SIDE-01 through SIDE-04, FEED-01 through FEED-05, AGNT-01 definitions
- `.planning/ROADMAP.md` §Phase 11 — Success criteria (5 items), dependency map, requirement list
- `.planning/v1.3-autonomy-visibility-sidebar-revamp.md` — Architecture decisions, key files, backend data already available

### Prior architectural decisions
- `.planning/STATE.md` §Decisions — CSS tab hiding rationale, typed CustomEvent registry, feed aggregation at API layer, TOAST risk note for Phase 14
- `.planning/research/ARCHITECTURE.md` — CustomEvent bridge pattern, wrap-then-decompose strategy, useAutonomyFeed hook design, 5 backend gaps
- `.planning/research/PITFALLS.md` — TOAST cliff, CustomEvent type safety, feed flooding mitigation, tab state loss prevention

### Existing code patterns
- `client/src/components/RightSidebar.tsx` — Current 850-line sidebar (view modes, brain editing, tab toggle pattern at lines 507-532)
- `client/src/hooks/useRightSidebarState.ts` — Reducer + localStorage pattern, expandedSections state, auto-save
- `client/src/components/CenterPanel.tsx` — CustomEvent dispatch pattern (lines 612, 658, 837, 1104, 1128, 1145, 1199, 1227)
- `client/src/components/avatars/BaseAvatar.tsx` — AvatarState type, Framer Motion variants, ThinkingBubble, AvatarWrapper
- `server/routes/autonomy.ts` — Existing endpoints (conductor, safety, deliberations, learning)
- `server/autonomy/events/eventLogger.ts` — Event types, storage strategy, deduplication
- `server/autonomy/config/policies.ts` — Safety gates, budgets, tier limits, getTierBudgets()
- `shared/dto/wsSchemas.ts` — WS event type definitions (background_execution_*, task_requires_approval, handoff_*)
- `client/src/index.css` — Existing @keyframes (brain-glow-pulse, ai-thinking-ring, shimmer, online-pulse)
- `tailwind.config.ts` — Custom colors (hatchin-blue, hatchin-green, hatchin-orange, hatchin-surface-*)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Tab indicator animation**: RightSidebar.tsx lines 517-522 — `layoutId="tab-indicator"` with spring physics. Reuse for 3-tab bar
- **CustomEvent dispatch**: CenterPanel.tsx already dispatches 8+ event types via `window.dispatchEvent(new CustomEvent(...))`. Add autonomy event dispatches to same pattern
- **Approval flow**: CenterPanel.tsx lines 1943-1963 — approve/reject mutations. Extract into shared hook for both inline cards + sidebar Approvals tab (Phase 13)
- **Brain editing state**: `useRightSidebarState.ts` — full reducer with localStorage. Extend with `activeTab` action
- **Animation keyframes**: `index.css` has `ai-thinking-ring`, `brain-glow-pulse`, `shimmer` — reuse for agent working state and loading skeletons
- **Avatar state system**: BaseAvatar.tsx `AvatarState` union + `avatarVariants` object — extend with "working" state

### Established Patterns
- **Data fetching**: TanStack Query with `queryKey` arrays — use for `/api/autonomy/events` and `/api/autonomy/stats`
- **Real-time updates**: CustomEvent bridge from CenterPanel → other components. NOT raw WebSocket listeners in child components
- **Mobile drawers**: Sheet component from Shadcn in `home.tsx` — RightSidebar already renders inside Sheet on mobile
- **Framer Motion entry**: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}` with 0.18s duration — standard for all new elements
- **CSS classes**: `premium-column-bg`, `premium-card`, `hide-scrollbar` — use for consistent sidebar styling

### Integration Points
- **RightSidebar.tsx**: Wrap existing content in tab shell. Brain editing becomes "Brain & Docs" tab content. Add Activity and Approvals as new tab panels
- **CenterPanel.tsx**: Add CustomEvent dispatches for `background_execution_started`, `background_execution_completed`, `task_execution_completed`, `handoff_chain_completed` WS events
- **home.tsx**: No changes needed — RightSidebar already passed as single component to both desktop layout and mobile Sheet
- **BaseAvatar.tsx**: Add "working" to AvatarState, add variant, export from same file
- **LeftSidebar.tsx + ProjectTree.tsx**: Read `workingAgents` from useAutonomyFeed to set avatar working state
- **server/routes/autonomy.ts**: Add `GET /api/autonomy/events?projectId=X&limit=50&eventType=...` and `GET /api/autonomy/stats?projectId=X&period=today`

</code_context>

<deferred>
## Deferred Ideas

- **Swipe-between-tabs gesture on mobile** — Noted for Phase 15 polish if user feedback demands it
- **Notification sound for high-priority events** — Out of scope, could be Phase 15 or v1.4
- **Event search/full-text filter** — Tracked as ADVN-02 in v1.4+ requirements
- **Keyboard shortcuts for tab switching** — Could be Phase 15 polish

</deferred>

---

*Phase: 11-sidebar-shell-activity-feed*
*Context gathered: 2026-03-24*
