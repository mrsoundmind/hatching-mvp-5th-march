# Phase 15: Polish - Research

**Researched:** 2026-03-29
**Domain:** React/Tailwind/Framer Motion visual polish — sidebar component refinement, animation enhancement, mobile Sheet drawer upgrade
**Confidence:** HIGH

## Summary

Phase 15 is a **visual refinement pass** over all components created in v1.3 (Phases 11–14). No new features. No API changes. No DB migrations. The task is to make 17 sidebar components + 3 supporting components + avatar working animation feel like one unified premium design system — the same quality bar as the existing left sidebar, landing page, and chat interface.

The codebase already has a complete, well-structured design system: CSS custom properties for all colors, `premium-card` / `glass-card-premium` / `premium-column-bg` classes, Framer Motion entry patterns, existing `@keyframes` for animations. The gap is that components built across 4 separate phases made independent micro-decisions (inconsistent card backgrounds, varying border-radius values, some using inline styles where CSS classes exist, no hover lift on cards, basic empty states with no animation). Phase 15 unifies these.

The user's execution requirement is strict: **one component at a time, Playwright visual verification before moving to the next**. This means the planner MUST produce one task per component group (not bulk changes). Each task must be independently committable and visually verifiable via Playwright screenshot.

**Primary recommendation:** Apply the `premium-card` class pattern uniformly to all sidebar cards, add Framer Motion hover lift (`whileHover={{ y: -1 }}`), upgrade empty state icons with floating animation, enhance the avatar working ring to a glow pulse, and add Sheet drawer grab handle + backdrop blur. Verify each with Playwright before proceeding.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Polish Scope & Approach:**
- Full component redesign — run ALL v1.3 components through Stitch/Magic MCPs, not just targeted touch-ups
- Everything v1.3 touched — scope includes sidebar/ components (17), chat cards (HandoffCard, DeliberationCard, AutonomousApprovalCard), and avatar animations
- Refine existing implementations — feed current component code into Stitch/Magic, ask for premium refinements. Preserves functionality, upgrades visuals. Do NOT generate fresh designs from scratch
- Safety net — commit checkpoint before polish begins. Per-component commits so individual changes are revertible via git

**Animation & Micro-interactions:**
- Hover states: Subtle lift + shadow — `translateY(-1px)` + shadow increase on hover, matching existing `premium-card` class pattern
- Loading states: Skeleton shimmer using existing `@keyframes shimmer` from `index.css`. Content-shaped placeholders, not spinners
- Agent working avatar: Enhance with Magic MCP — current 3s rotating dashed ring to be upgraded to a more polished animation/pulse/particle effect
- Empty state animations: Subtle floating/bobbing on empty state icons + soft fade-in for description text. Feels alive without being distracting

**Component Visual Hierarchy:**
- Unified card style — one consistent card treatment (border-radius, shadow, padding, background) for ActivityFeedItem, ApprovalItem, DocumentCard, WorkOutputSection. Different content, same container
- Section headers: Small caps + divider line — uppercase small text with subtle horizontal line for clean separation
- Unified pill/badge style — same border-radius, padding, font-size for all badges/pills (type badges, status badges, filter chips). Color varies by meaning, shape is consistent
- Strict 4px spacing grid — all padding/margin/gap values snap to 4px increments (4, 8, 12, 16, 20, 24) across all sidebar components

**Mobile-specific Polish:**
- 44px minimum touch targets — all tappable elements (filter chips, approve/reject buttons, tab targets, delete buttons) get min-height: 44px on mobile per Apple HIG
- Apple HIG responsive font sizing — follow Apple mobile responsiveness guidelines. Base text 17px on mobile, captions 15px, with proper dynamic type scaling relative to screen size
- Sheet drawer enhancements — add visible grab handle at top + frosted glass backdrop blur. Shadcn Sheet supports both

### Claude's Discretion — Quality Reference

Claude picks the best visual reference from the existing codebase (landing page, left sidebar, chat) and applies consistent styling across all polished components.

### Deferred Ideas (OUT OF SCOPE)

- Swipe-between-tabs gesture on mobile — noted in Phase 11, still deferred
- Notification sound for high-priority events — out of scope
- Keyboard shortcuts for tab switching — out of scope for polish
- Accessibility audit (ARIA, focus rings, color contrast) — not selected for this pass, could be its own future item
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLSH-01 | All new sidebar components use premium designs generated via Stitch/Magic MCPs matching Hatchin's visual style | Research identifies per-component gaps, the correct CSS/animation patterns to apply, and establishes the visual quality standard |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | 11.13.1 | Hover states, entry animations, empty state floating | Already powering all v1.3 animations |
| Tailwind CSS | 3.4.17 | Spacing, colors, typography | Entire app uses it |
| Lucide React | 0.453.0 | Icons in empty states, badges | Already in all sidebar components |

### Supporting (already in codebase)
| Asset | Location | Purpose |
|-------|----------|---------|
| `premium-card` CSS class | `client/src/index.css` line 600 | Unified card treatment: glass bg, blur, border, shadow |
| `glass-card-premium` CSS class | `client/src/index.css` line 487 | Alternative glass treatment with hover state |
| `@keyframes shimmer` | `client/src/index.css` | Skeleton loading — reuse for all loading states |
| `@keyframes agent-working-ring` | `client/src/index.css` line 567 | Base for enhanced working avatar |
| `@keyframes brain-glow-pulse` | `client/src/index.css` line 531 | Pulse animation for avatar enhancement |
| Framer Motion entry pattern | `AnimatePresence` + `initial/animate` | `{ opacity: 0, y: 8 } → { opacity: 1, y: 0 }` at 0.18s |
| Spring config | SidebarTabBar.tsx | `stiffness: 400, damping: 30` — proven tab indicator |
| CSS variables | `--hatchin-blue`, `--hatchin-green`, `--hatchin-orange`, `--glass-frosted`, `--glass-bg`, etc. | Color tokens — use these everywhere, never raw hex |

**No new npm installs required for Phase 15.**

---

## Architecture Patterns

### Current Component Audit — Gaps Found

After reading all 17 sidebar components + RightSidebar + AutonomousApprovalCard, these are the specific gaps to fix:

#### Card Inconsistency (ActivityFeedItem, ApprovalItem, DocumentCard, WorkOutputSection)
- **Gap**: Each uses different background tokens. ActivityFeedItem uses `hover:bg-[var(--hatchin-surface-hover)]` (CSS var that may not exist). ApprovalItem uses `bg-[var(--hatchin-surface)]`. DocumentCard uses `bg-[var(--hatchin-surface-elevated)]`. WorkOutputSection uses `bg-[var(--hatchin-surface)]`.
- **Fix**: Unify to `premium-card` class (applies `glass-bg`, `backdrop-filter`, `border`, `box-shadow`, `border-radius: 12px`).
- **Hover**: Add `whileHover={{ y: -1, boxShadow: '0 4px 12px var(--glass-shadow)' }}` via Framer Motion on the wrapping `motion.div`.

#### SidebarTabBar — Good, minor gap
- Active tab indicator uses `bg-[var(--glass-frosted-strong)]` — appropriate. Badge counts are correct.
- **Gap**: Tab buttons lack `min-height: 44px` for mobile compliance. Adding `min-h-[44px]` on `lg:min-h-auto` ensures mobile tap targets without affecting desktop.

#### AutonomyStatsCard — Simple, functional but flat
- **Gap**: No background treatment, just border + bg. No entry animation on the stat numbers.
- **Fix**: Apply `premium-card` class to container. Add `motion.span` on the number values with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` on mount.

#### FeedFilters — Functional but basic select element
- **Gap**: The `<select>` for agent filter is a raw HTML element that doesn't match the rest of the design. Filter chips lack 44px mobile touch target.
- **Fix**: Replace `<select>` with Shadcn `Select` component (already used in `AutonomySettingsPanel`). Add `min-h-[44px] lg:min-h-auto` to all chip buttons.

#### HandoffChainTimeline — Entry animation missing per node
- **Gap**: No staggered entry on chain nodes. Connector animation is minimal (just height).
- **Fix**: Wrap each node row in `motion.div` with staggered `delay: index * 0.06`. Enhance connector from plain div to `motion.div` with gradient fill.

#### ApprovalItem — Near complete, approve/reject buttons need touch targets
- **Gap**: Approve/reject buttons have `py-1.5` — not 44px touch targets on mobile.
- **Fix**: `min-h-[44px] lg:min-h-auto` on both buttons. Add `whileHover={{ scale: 1.02 }}` on approve button for emphasis.

#### ApprovalsEmptyState → EmptyState component
- **Gap**: `EmptyState` component icon container is static — no animation. Description text has no fade-in delay.
- **Fix**: Add `motion.div` with `animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}` to the icon container. Add `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}` to description text.

#### TaskPipelineView — Minimal, stage dots could use category colors
- **Gap**: Stage dots use Tailwind arbitrary colors from `approvalUtils.ts`. The pipeline row hover state is missing.
- **Fix**: Add `whileHover={{ backgroundColor: 'var(--hatchin-surface)' }}` on each row. Ensure stage dot colors match design language (green=done, blue=in-progress, amber=review).

#### DocumentCard — Good structure, hover missing
- **Gap**: No hover lift. Delete button is small (32px = w-8 h-8) — needs `min-h-[44px]` on mobile.
- **Fix**: Add `whileHover={{ y: -1 }}` on the motion.div wrapper. Add `min-h-[44px] w-[44px] lg:min-h-auto lg:w-8` to delete button.

#### DocumentUploadZone — Uses inline styles
- **Gap**: `border`, `background`, `minHeight`, `padding`, `transition` all set as inline styles. This bypasses Tailwind and makes dark mode handling less clean.
- **Fix**: Preserve functionality but move styles to Tailwind classes. Use `data-dragging` attribute + CSS to toggle drag state.

#### AutonomySettingsPanel — Solid, section header needs divider line
- **Gap**: Section header uses `uppercase tracking-wider` (correct) but no divider line beneath it. The `flash-save` animation class exists in index.css and is applied correctly — keep.
- **Fix**: Add `after:content-[''] after:block after:mt-1 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[var(--hatchin-border-subtle)] after:to-transparent` to the `h3` element. Apply same divider pattern to WorkOutputSection header.

#### WorkOutputSection — Pre element for output
- **Gap**: Output displays in `<pre>` with monospace font — feels developer-y, not polished. Agent initial avatar is just a letter in a circle.
- **Fix**: Use `prose prose-sm` (already installed via `@tailwindcss/typography`) for output rendering. Replace initial letter with actual `AgentAvatar` component at 24px size.

#### BaseAvatar working state — Dashed ring only
- **Gap**: `agent-working-ring` is a simple 3s rotation of a dashed border. Per CONTEXT.md, needs enhancement to glow pulse/particle effect.
- **Fix**: Add a second pulsing ring behind the rotating ring: `@keyframes avatar-working-pulse` that scales from 1.0 to 1.15 and fades, combined with the existing ring. Adds depth without replacing the rotation.

#### AutonomousApprovalCard — Text references
- **Gap**: `text-hatchin-text-bright` is used without `text-` Tailwind prefix. `bg-hatchin-blue` instead of `bg-[var(--hatchin-blue)]`. These may work but are inconsistent with the rest of the app.
- **Fix**: Normalize to CSS variable pattern: `text-[var(--hatchin-text-bright)]`, `bg-[var(--hatchin-blue)]`.

#### RightSidebar Sheet drawer (home.tsx)
- **Gap**: `SheetContent` has `p-0` but no grab handle bar or frosted glass backdrop.
- **Fix**: Inside SheetContent for the right drawer, add a visible grab handle: `<div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />`. Add `className="backdrop-blur-md bg-[var(--glass-frosted-strong)]"` to override Sheet's default background.

### Recommended Polish Order (component-by-component)

This sequence is optimized for visual impact first (high-visibility components), matching the user's one-at-a-time + Playwright verify workflow:

1. **SidebarTabBar** — Tab bar is always visible; fixes immediately noticeable
2. **EmptyState** (shared) — Affects all 3 tabs when empty; floating icon animation
3. **ActivityFeedItem** — Most-used feed component; unified card treatment
4. **AutonomyStatsCard** — Top of Activity tab; number entry animation
5. **FeedFilters** — Fix raw select → Shadcn Select; mobile chip touch targets
6. **HandoffChainTimeline** — Staggered entry + enhanced connector
7. **ApprovalItem** — Mobile touch targets on approve/reject; hover emphasis
8. **ApprovalsEmptyState** (already uses EmptyState — covered by step 2)
9. **TaskPipelineView** — Stage dot colors + row hover
10. **DocumentCard** — Hover lift + mobile delete button
11. **DocumentUploadZone** — Move inline styles to Tailwind
12. **AutonomySettingsPanel** — Section header divider pattern
13. **WorkOutputSection** — prose rendering + AgentAvatar instead of letter
14. **BrainDocsTab** — Section spacing + dividers between Upload/Docs/Settings/Outputs
15. **BaseAvatar working state** — Enhanced dual-ring animation
16. **AutonomousApprovalCard** — Normalize class references
17. **Sheet drawer (home.tsx)** — Grab handle + backdrop blur

### Framer Motion Patterns (verified in codebase)

```typescript
// Standard entry animation — use on ALL card components
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.18, ease: 'easeOut' }}

// Hover lift — use on ALL interactive cards
whileHover={{ y: -1 }}
transition={{ type: 'spring', stiffness: 400, damping: 25 }}

// Staggered list entry — use in HandoffChainTimeline
transition={{ delay: index * 0.06, duration: 0.18, ease: 'easeOut' }}

// Floating empty state icon
animate={{ y: [0, -4, 0] }}
transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}

// Tab indicator spring (existing, already correct)
transition={{ type: 'spring', stiffness: 400, damping: 30 }}
```

### Section Header Pattern (unified)

```typescript
// Use this pattern for ALL section headers (AutonomySettingsPanel, WorkOutputSection, BrainDocsTab)
<div className="flex items-center gap-2 mb-3">
  <span className="text-[11px] font-semibold text-[var(--hatchin-text-muted)] uppercase tracking-wider">
    {label}
  </span>
  <div className="flex-1 h-px bg-gradient-to-r from-[var(--hatchin-border-subtle)] to-transparent" />
</div>
```

### Unified Badge/Pill Pattern

```typescript
// All badges/pills (type badges in DocumentCard, filter chips in FeedFilters, pipeline dots)
// Shape: same. Color: varies by meaning.
const pillBase = "text-[10px] font-semibold px-2 py-0.5 rounded-full"
// Type colors: task=green, handoff=blue, review=orange, approval=amber, PDF=blue, DOCX=orange, MD=green
```

### Mobile Touch Target Pattern

```typescript
// All tappable elements — filter chips, approve/reject, delete button, tab bar buttons
className="min-h-[44px] lg:min-h-auto"
// NOTE: This only expands on mobile (< lg). Desktop unaffected.
```

### Avatar Working Animation Enhancement

```css
/* Add to index.css alongside existing agent-working-ring */
@keyframes avatar-working-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.18);
    opacity: 0;
  }
}
```

```typescript
// In BaseAvatar.tsx — add pulse ring behind the existing dashed ring
{state === "working" && (
  <>
    {/* Outer pulse ring */}
    <div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        border: '2px solid rgba(108,130,255,0.4)',
        animation: 'avatar-working-pulse 2s ease-out infinite',
      }}
    />
    {/* Inner rotating dashed ring (existing) */}
    <div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        border: '2px dashed rgba(108,130,255,0.6)',
        animation: 'agent-working-ring 3s linear infinite',
        boxShadow: '0 0 8px rgba(108,130,255,0.3)',
      }}
    />
  </>
)}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agent filter dropdown | Custom styled `<select>` | Shadcn `Select` component (already in AutonomySettingsPanel) | Design-system consistency, dark mode support |
| Shimmer loading | Custom CSS | Existing `animate-shimmer` / `@keyframes shimmer` in index.css | Already defined, proven |
| Section dividers | Custom `<hr>` | CSS gradient via Tailwind `before:`/`after:` pseudo-elements | Matches existing `premium-divider` class pattern |
| Card hover effect | CSS transitions | Framer Motion `whileHover` | Already the pattern everywhere else in the app |
| Badge colors | Arbitrary Tailwind colors | CSS custom properties via `bg-[var(--hatchin-green)]` pattern | Theme-aware, dark/light mode safe |

---

## Common Pitfalls

### Pitfall 1: CSS Variable References That Don't Exist
**What goes wrong:** Several components reference `var(--hatchin-surface-hover)` — this variable is NOT defined in `index.css`. It will silently fall back to transparent/inherit.
**Why it happens:** Phase 11-14 components were written assuming the variable existed.
**How to avoid:** Replace `--hatchin-surface-hover` with `--hatchin-surface-elevated` (which IS defined).
**Warning signs:** Cards disappear on hover or have unexpected transparent background.

### Pitfall 2: Mobile height expansion breaking desktop layout
**What goes wrong:** Adding `min-h-[44px]` to tab buttons causes the SidebarTabBar to grow too tall on desktop, pushing content down.
**Why it happens:** The tab bar grid has `py-2` on buttons — adding `min-h-[44px]` on all screens adds ~12px more.
**How to avoid:** Always use `min-h-[44px] lg:min-h-auto` (never bare `min-h-[44px]`).

### Pitfall 3: Framer Motion `layout` prop on items in lists
**What goes wrong:** Adding `layout` to `DocumentCard` causes jarring reflow animations when documents are deleted.
**Why it happens:** `layout` animates position changes, but optimistic deletion + rollback causes double-reflow.
**How to avoid:** `DocumentCard` already has `layout` on its `motion.div` — this is correct for deletion animation. But do NOT add `layoutId` (that causes cross-component conflicts with SidebarTabBar's `layoutId="sidebar-tab"`).

### Pitfall 4: Sheet drawer backdrop-blur breaking z-index
**What goes wrong:** Adding `backdrop-blur-md` to `SheetContent` may cause the blur to render behind the Sheet overlay, making the overlay opaque instead of frosted.
**Why it happens:** `backdrop-filter` requires the element to be above what it blurs in the stacking context.
**How to avoid:** Apply `backdrop-blur-md` to the SheetContent's inner content div, not the SheetContent wrapper itself. Or use the Sheet `className` prop which Shadcn passes through to the panel element.

### Pitfall 5: `animate-shimmer` class not defined in Tailwind
**What goes wrong:** `ActivityTab.tsx` uses `animate-shimmer` class. This is a custom class that requires the `@keyframes shimmer` to be registered in `tailwind.config.ts` via the `animation` key.
**Why it happens:** The keyframe exists in `index.css` but may not be in `tailwind.config.ts`.
**How to avoid:** Check `tailwind.config.ts` — if `shimmer` animation is missing from the `animation` key, either add it there OR use inline style `style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}` instead.

---

## Code Examples

### Unified Card Component Pattern
```typescript
// Source: existing premium-card class in index.css
// Apply to: ActivityFeedItem, ApprovalItem, DocumentCard container divs
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -1 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  className="premium-card p-3 cursor-pointer"
>
  {/* card contents */}
</motion.div>
```

### Shadcn Select for FeedFilters agent dropdown
```typescript
// Source: AutonomySettingsPanel.tsx — already uses this exact pattern
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={agentFilter ?? ''} onValueChange={(v) => onAgentFilterChange(v || null)}>
  <SelectTrigger className="h-8 text-[11px] rounded-full border-[var(--hatchin-border-subtle)]">
    <SelectValue placeholder="All agents" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="" className="text-xs">All agents</SelectItem>
    {agents.map(agent => (
      <SelectItem key={agent.id} value={agent.id} className="text-xs">{agent.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Sheet Drawer Grab Handle
```typescript
// Source: home.tsx SheetContent — add inside the right drawer
<Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
  <SheetContent side="right" className="p-0 w-[320px] bg-[var(--glass-frosted-strong)] backdrop-blur-xl">
    <SheetTitle className="sr-only">Project Details</SheetTitle>
    {/* Grab handle */}
    <div className="w-10 h-1 bg-[var(--hatchin-border)] rounded-full mx-auto mt-3 mb-0 shrink-0" />
    {/* rest of content */}
  </SheetContent>
</Sheet>
```

### Floating Empty State Icon
```typescript
// Source: EmptyState.tsx — replace static icon container
<motion.div
  className="w-16 h-16 rounded-2xl bg-[var(--hatchin-surface)] flex items-center justify-center mb-4"
  animate={{ y: [0, -4, 0] }}
  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
>
  <Icon className="w-8 h-8 hatchin-text-muted" />
</motion.div>
<motion.h3
  className="text-sm font-semibold hatchin-text mb-1.5"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.15 }}
>
  {title}
</motion.h3>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Phase 11-14 built components independently | Phase 15 unifies all under single card system | Sidebar feels like one product, not 4 separate builds |
| Raw `<select>` for agent filter | Shadcn Select | Matches design system; dark mode safe |
| Static empty state icons | Framer Motion floating animation | Matches Hatchin "alive" brand tone |
| Single rotating dashed ring for working avatar | Dual ring: pulsing outer + rotating inner | Higher visual quality, depth |
| Inline styles in DocumentUploadZone | Tailwind classes with data attributes | Maintainable, consistent with app patterns |
| `--hatchin-surface-hover` (undefined variable) | `--hatchin-surface-elevated` (defined) | Eliminates silent CSS bug |

---

## Open Questions

1. **`animate-shimmer` in Tailwind config**
   - What we know: `@keyframes shimmer` is in `index.css`. `animate-shimmer` is used in `ActivityTab.tsx` and `AutonomyStatsCard.tsx`.
   - What's unclear: Whether Tailwind `animation.shimmer` is registered in `tailwind.config.ts` (it was not visible in the config read). Raw CSS class may work if defined in `@layer utilities`.
   - Recommendation: During implementation, test `animate-shimmer` rendering on the loading skeleton. If broken, add `animation: { shimmer: 'shimmer 1.5s ease-in-out infinite' }` to `tailwind.config.ts`.

2. **Stitch/Magic MCP availability**
   - What we know: CONTEXT.md says run components through Stitch/Magic MCPs for premium refinements.
   - What's unclear: Stitch and Magic are referenced as MCPs in the project but no specific API patterns are documented.
   - Recommendation: The planner should note that Stitch/Magic generate design refinements — the implementation agent feeds component code in and gets refined designs back. This is a creative tool, not a library import.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (via `playwright-mcp` installed at `.playwright-mcp/`) |
| Config file | `.playwright-mcp/` — confirmed present |
| Quick run command | Playwright screenshot via MCP tool |
| Full suite command | Per-component visual verification |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLSH-01 | All sidebar components visually match premium quality | visual | Playwright screenshot per component | ✅ MCP available |

### Sampling Rate
- **Per task commit:** Playwright screenshot of the specific component via MCP browser tool
- **Per wave merge:** Full sidebar visual pass — screenshot all 3 tabs + mobile Sheet
- **Phase gate:** All components visually verified before `/gsd:verify-work`

### Wave 0 Gaps
None — existing Playwright MCP infrastructure covers visual verification. No test files needed. This phase is 100% visual verification, not unit tests.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 17 sidebar components, BaseAvatar.tsx, RightSidebar.tsx, home.tsx, index.css, tailwind.config.ts — canonical source
- `client/src/index.css` — all existing CSS classes and keyframes verified line by line
- `client/src/components/sidebar/*.tsx` — all 17 component files read directly

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — user-locked and Claude's discretion items
- Framer Motion v11 patterns — verified against existing codebase usage (all pattern usages confirmed in SidebarTabBar, ActivityFeedItem, etc.)

---

## Metadata

**Confidence breakdown:**
- Component audit: HIGH — read every file directly
- CSS/animation patterns: HIGH — verified against index.css and existing components
- Mobile touch targets: HIGH — Apple HIG 44px is well-established, confirmed in CONTEXT.md
- Stitch/Magic MCP workflow: MEDIUM — referenced in CONTEXT.md but MCP-specific workflow not documented; implementation agent must run these interactively

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable design system, no fast-moving dependencies)
