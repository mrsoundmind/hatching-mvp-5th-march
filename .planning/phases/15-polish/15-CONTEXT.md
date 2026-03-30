# Phase 15: Polish - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual consistency and premium quality pass over all components created or significantly modified in v1.3 (Phases 11-14). Run every component through Stitch/Magic MCPs to refine existing implementations to premium quality. Also covers avatar working animation enhancement, mobile responsiveness, and Sheet drawer polish. No new features — purely visual refinement.

**Requirements:** PLSH-01

</domain>

<decisions>
## Implementation Decisions

### Polish Scope & Approach
- **Full component redesign** — run ALL v1.3 components through Stitch/Magic MCPs, not just targeted touch-ups
- **Everything v1.3 touched** — scope includes sidebar/ components (17), chat cards (HandoffCard, DeliberationCard, AutonomousApprovalCard), and avatar animations
- **Refine existing implementations** — feed current component code into Stitch/Magic, ask for premium refinements. Preserves functionality, upgrades visuals. Do NOT generate fresh designs from scratch
- **Safety net** — commit checkpoint before polish begins. Per-component commits so individual changes are revertible via git

### Claude's Discretion — Quality Reference
- Claude picks the best visual reference from the existing codebase (landing page, left sidebar, chat) and applies consistent styling across all polished components

### Animation & Micro-interactions
- **Hover states**: Subtle lift + shadow — `translateY(-1px)` + shadow increase on hover, matching existing `premium-card` class pattern
- **Loading states**: Skeleton shimmer using existing `@keyframes shimmer` from `index.css`. Content-shaped placeholders, not spinners
- **Agent working avatar**: Enhance with Magic MCP — current 3s rotating dashed ring to be upgraded to a more polished animation/pulse/particle effect
- **Empty state animations**: Subtle floating/bobbing on empty state icons + soft fade-in for description text. Feels alive without being distracting

### Component Visual Hierarchy
- **Unified card style** — one consistent card treatment (border-radius, shadow, padding, background) for ActivityFeedItem, ApprovalItem, DocumentCard, WorkOutputSection. Different content, same container
- **Section headers**: Small caps + divider line — uppercase small text with subtle horizontal line for clean separation
- **Unified pill/badge style** — same border-radius, padding, font-size for all badges/pills (type badges, status badges, filter chips). Color varies by meaning, shape is consistent
- **Strict 4px spacing grid** — all padding/margin/gap values snap to 4px increments (4, 8, 12, 16, 20, 24) across all sidebar components

### Mobile-specific Polish
- **44px minimum touch targets** — all tappable elements (filter chips, approve/reject buttons, tab targets, delete buttons) get min-height: 44px on mobile per Apple HIG
- **Apple HIG responsive font sizing** — follow Apple mobile responsiveness guidelines. Base text 17px on mobile, captions 15px, with proper dynamic type scaling relative to screen size
- **Sheet drawer enhancements** — add visible grab handle at top + frosted glass backdrop blur. Shadcn Sheet supports both

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.3 milestone & requirements
- `.planning/v1.3-autonomy-visibility-sidebar-revamp.md` — Architecture decisions, key files, component list
- `.planning/REQUIREMENTS.md` §PLSH-01 — Polish requirement definition
- `.planning/ROADMAP.md` §Phase 15 — Success criteria, dependencies

### Prior phase context (design decisions to preserve)
- `.planning/phases/11-sidebar-shell-activity-feed/11-CONTEXT.md` — Color-coded categories, spring animation pattern, empty state tone, feed item layout, stats card design, CSS-hide pattern, badge behavior

### Existing visual patterns
- `client/src/index.css` — Existing @keyframes (brain-glow-pulse, ai-thinking-ring, shimmer, online-pulse)
- `tailwind.config.ts` — Custom colors (hatchin-blue, hatchin-green, hatchin-orange, hatchin-surface-*)
- `client/src/components/ui/` — Shadcn primitives, Sheet component

### Components in scope (all must be polished)
- `client/src/components/sidebar/` — 17 components: SidebarTabBar, ActivityTab, ActivityFeedItem, AutonomyStatsCard, FeedFilters, HandoffChainTimeline, ApprovalItem, ApprovalsTab, ApprovalsEmptyState, TaskPipelineView, BrainDocsTab, DocumentCard, DocumentUploadZone, AutonomySettingsPanel, WorkOutputSection, approvalUtils.ts, handoffChainUtils.ts
- `client/src/components/RightSidebar.tsx` — Tab shell container
- `client/src/components/AutonomousApprovalCard.tsx` — Inline approval UI in chat
- `client/src/components/avatars/` — Agent avatar working state animation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `premium-card` CSS class — existing card treatment with shadow/border. Unify all sidebar cards to use this
- `@keyframes shimmer` in index.css — skeleton loading animation, reuse for all loading states
- `@keyframes ai-thinking-ring` in index.css — base for enhanced avatar working animation
- Framer Motion entry pattern: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}` at 0.18s — standard for all components
- Spring animation: `stiffness: 400, damping: 30` — proven in tab indicator

### Established Patterns
- CSS variables for all colors: `var(--hatchin-blue)`, `var(--hatchin-green)`, `var(--hatchin-orange)`, `var(--hatchin-surface)`, etc.
- Category color coding: task=green, handoff=blue, review=orange, approval=amber, system=gray
- Lucide React icons throughout all components
- Framer Motion for all animations (no raw CSS transitions for interactive elements)

### Integration Points
- `home.tsx` — Sheet drawer wrapper for mobile sidebar (add grab handle + backdrop blur here)
- `client/src/components/sidebar/*.tsx` — 17 files to refine
- `client/src/components/RightSidebar.tsx` — container that wraps tabs
- `client/src/components/avatars/BaseAvatar.tsx` — AvatarState + working animation
- Tailwind responsive breakpoints — `lg:` for desktop, default for mobile

</code_context>

<specifics>
## Specific Ideas

- Apple HIG as the mobile reference — native iOS feel for touch targets, font sizing, and Sheet drawer behavior
- Frosted glass backdrop on Sheet drawer — `backdrop-blur` + semi-transparent background
- Empty states should feel encouraging and alive — gentle floating animation on icons matches Hatchin's "your team is here for you" brand tone
- All cards should feel like they belong to the same design system despite being built across 4 separate phases

</specifics>

<deferred>
## Deferred Ideas

- Swipe-between-tabs gesture on mobile — noted in Phase 11, still deferred
- Notification sound for high-priority events — out of scope
- Keyboard shortcuts for tab switching — out of scope for polish
- Accessibility audit (ARIA, focus rings, color contrast) — not selected for this pass, could be its own future item

</deferred>

---

*Phase: 15-polish*
*Context gathered: 2026-03-29*
