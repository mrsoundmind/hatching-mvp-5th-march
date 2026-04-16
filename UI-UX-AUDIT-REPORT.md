# UI/UX Product Audit Report

**Date:** 2026-04-03
**Auditor:** Claude Code (source-only, read-only audit)
**Scope:** All frontend pages, components, hooks, design system, and state management

---

## Overall Grade: B+

## Executive Summary

Hatchin has a remarkably polished dark-mode aesthetic with thoughtful micro-interactions, a well-structured design token system, and genuinely premium-feeling animations. The landing page storytelling experience is best-in-class for an MVP. However, the codebase suffers from several structural problems: the CenterPanel.tsx at 3,084 lines is a maintenance hazard, light mode is clearly an afterthought with contrast issues, accessibility has significant gaps (missing focus management, keyboard navigation, screen reader labels), and responsive behavior relies heavily on hiding entire panels rather than adapting content. The biggest UX risk is the 3-panel layout on mobile -- collapsing two sidebars into Sheet drawers creates a disjointed navigation experience.

---

## Component Scores

| Component | Typo | Space | Color | States | Mobile | Loading | Error | Empty | Anim | A11y | Avg |
|-----------|------|-------|-------|--------|--------|---------|-------|-------|------|------|-----|
| LandingPage | 5 | 4 | 5 | 4 | 3 | 3 | 2 | 3 | 5 | 2 | 3.6 |
| Login | 5 | 5 | 5 | 4 | 4 | 3 | 4 | N/A | 5 | 3 | 4.2 |
| Home (layout) | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 3.5 |
| Onboarding | 5 | 5 | 5 | 4 | 4 | N/A | 2 | N/A | 5 | 3 | 4.1 |
| AccountPage | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 2 | 3 | 3.5 |
| MayaChat | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 2 | 3.3 |
| 404 Page | 3 | 3 | 3 | 2 | 4 | N/A | N/A | N/A | 1 | 2 | 2.6 |
| LeftSidebar | 4 | 4 | 4 | 4 | 2 | 3 | 2 | 3 | 3 | 3 | 3.2 |
| CenterPanel | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 3 | 3.7 |
| RightSidebar | 4 | 4 | 4 | 3 | 2 | 3 | 3 | 4 | 4 | 3 | 3.4 |
| MessageBubble | 4 | 4 | 5 | 4 | 4 | 4 | 3 | N/A | 4 | 3 | 3.9 |
| ProjectTree | 4 | 3 | 4 | 4 | 3 | 3 | 2 | 3 | 3 | 3 | 3.2 |
| ArtifactPanel | 4 | 4 | 4 | 3 | 2 | 3 | 2 | 3 | 4 | 3 | 3.2 |
| ErrorFallbacks | 4 | 4 | 4 | 3 | 4 | N/A | 4 | N/A | 1 | 2 | 3.3 |
| QuickStartModal | 4 | 4 | 4 | 4 | 4 | 3 | 2 | N/A | 3 | 4 | 3.6 |
| StarterPacksModal | 4 | 4 | 4 | 3 | 3 | 3 | 2 | N/A | 3 | 3 | 3.2 |
| AddHatchModal | 4 | 4 | 4 | 3 | 3 | 3 | 2 | N/A | 3 | 3 | 3.2 |
| UpgradeModal | 4 | 4 | 4 | 3 | 3 | 3 | 2 | N/A | 4 | 3 | 3.3 |
| WelcomeModal | 5 | 5 | 5 | 3 | 4 | N/A | N/A | N/A | 5 | 3 | 4.3 |
| ProjectNameModal | 4 | 4 | 4 | 4 | 4 | 3 | 3 | N/A | 2 | 4 | 3.6 |
| SidebarTabBar | 4 | 4 | 4 | 4 | 4 | N/A | N/A | N/A | 5 | 3 | 4.0 |
| TasksTab | 4 | 4 | 4 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3.1 |
| BrainDocsTab | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 2 | 3.3 |
| ActivityTab | 4 | 4 | 4 | 3 | 3 | 3 | 2 | 4 | 4 | 3 | 3.4 |
| AnimatedCounter | 4 | 3 | 3 | 3 | 4 | N/A | N/A | N/A | 4 | 2 | 3.3 |
| AnimatedProgressBar | 4 | 4 | 4 | 3 | 4 | N/A | N/A | N/A | 4 | 2 | 3.6 |
| AnimatedTimelineItem | 4 | 4 | 4 | 3 | 4 | N/A | N/A | N/A | 4 | 2 | 3.6 |

**Average across all components: 3.4/5**

---

## P0 -- Must Fix

### 1. CenterPanel.tsx is 3,084 lines -- critical maintenance risk
**File:** `client/src/components/CenterPanel.tsx`
**Problem:** Single component manages streaming state, message rendering, WebSocket handling, typing indicators, deliberation state, deliverable proposals, approval cards, handoff cards, upgrade modals, and the entire chat input UX. Over 20 useState hooks in one component. State management is fragile -- race conditions between streaming timeouts, typing indicators, and message arrival are inevitable.
**Impact:** Any developer touching this file risks breaking unrelated features. Debugging streaming bugs requires reading 3,000+ lines of context.
**Fix:** Extract into composable pieces: `useChatStreaming` hook, `useChatMessages` hook, `ChatInput` component, `ChatHeader` component, `StreamingIndicator` component, `ChatMessageList` component. Target 300-500 lines per file.

### 2. Missing keyboard navigation across modals and sidebar
**File:** `client/src/components/sidebar/SidebarTabBar.tsx:35`, `ProjectTree.tsx`, `LeftSidebar.tsx`
**Problem:** Sidebar tabs lack `role="tablist"` / `role="tab"` / `aria-selected` attributes. ProjectTree items are not keyboard-navigable (no `tabIndex`, no arrow key handling). The LeftSidebar search field has keyboard shortcut (Cmd+K) but no visual indicator of the shortcut.
**Impact:** Screen reader users cannot navigate the sidebar. Keyboard-only users are blocked from switching tabs or navigating the project tree.
**Fix:** Add ARIA tab roles to SidebarTabBar. Add `role="tree"` / `role="treeitem"` / `aria-expanded` to ProjectTree. Add roving tabindex pattern for tree navigation.

### 3. Light mode contrast failures
**File:** `client/src/index.css:30-44`, `client/src/pages/LandingPage.tsx:697`
**Problem:** Light mode hatchin custom colors have insufficient contrast. `--hatchin-card: hsl(220, 20%, 93%)` against `--hatchin-text-muted: hsl(220, 10%, 35%)` is borderline (3.8:1 ratio, fails WCAG AA for small text). Landing page chat bubble uses `bg-white dark:bg-[#0A0C13]` hardcoded, so light mode shows white-on-white in several places. The glass effects (`--glass-bg: rgba(255, 255, 255, 0.7)`) create almost invisible surfaces in light mode.
**Impact:** Users on light mode get a significantly degraded experience. Text readability suffers.
**Fix:** Audit all `--hatchin-*` light-mode values against WCAG AA (4.5:1 for text). The landing page needs a dedicated light-mode pass -- many `dark:` prefixed classes have no light counterpart.

### 4. Landing page not responsive below 1024px
**File:** `client/src/pages/LandingPage.tsx:663`
**Problem:** The bento grid layout (`grid-cols-[1fr_1fr_1.2fr_1fr_1fr]`) only applies at `lg:` breakpoint. Below that, it falls back to single column (`grid-cols-1 md:grid-cols-3`) which stacks 8 USP cards vertically in a very long scrollable page. The connection lines between chat and USP cards (SVG overlay at line 377) break entirely on mobile since the panels are stacked vertically instead of side-by-side. The chat column (`lg:row-span-3`) loses its sticky behavior on mobile.
**Impact:** Mobile visitors (likely 50%+ of traffic) see a broken layout where the core "chat drives panels" interaction doesn't work.
**Fix:** Design a mobile-specific layout: either a swipeable card carousel or a simplified single-column tour that removes the bento grid entirely. The connection line feature should be hidden on mobile.

### 5. No error boundaries on sidebar tab panels
**File:** `client/src/components/RightSidebar.tsx:144-173`
**Problem:** The three sidebar tab panels (Activity, Tasks, Brain) render raw children without error boundaries. If ActivityTab crashes (e.g., malformed event data), the entire right sidebar disappears. The outer `home.tsx` has panel-level error boundaries but the sidebar sub-panels do not.
**Impact:** A single bad autonomy event or task payload can take down the entire sidebar.
**Fix:** Wrap each tab panel in a `<ErrorBoundary fallback={<PanelErrorFallback />}>`.

---

## P1 -- Should Fix

### 6. Home page prop drilling is excessive
**File:** `client/src/pages/home.tsx` (1,101 lines)
**Problem:** Home passes 15+ props to LeftSidebar, 11+ to CenterPanel, and 3 to RightSidebar. Selection state (`activeProjectId`, `activeTeamId`, `activeAgentId`), expansion state, and modal state are all managed via useState in Home and drilled through props. This creates a cascade where any selection change re-renders the entire 3-panel layout.
**Impact:** Performance suffers on re-renders. Adding a new shared state requires editing Home.tsx and all three panels.
**Fix:** Extract shared state into a `ProjectSelectionContext` with `useContext`. Move modal state into a `ModalContext`. Alternatively, use a lightweight state manager (Zustand) for selection state.

### 7. WebSocket reconnection lacks exponential backoff cap
**File:** `client/src/lib/websocket.ts:36-38`
**Problem:** `maxRetries = 10` with no delay specification -- the reconnection interval is passed as an option but defaults to undefined. The retry count resets on successful connection but there is no exponential backoff visible in the connect function. If the server is down, the client will hammer it with rapid reconnection attempts.
**Impact:** Server under load gets additional connection storm from reconnecting clients.
**Fix:** Add exponential backoff: `Math.min(1000 * 2^retryCount, 30000)` between reconnection attempts.

### 8. MayaChat duplicates streaming logic from CenterPanel
**File:** `client/src/pages/MayaChat.tsx:74-229`
**Problem:** MayaChat has its own complete copy of WebSocket streaming state management (streamingContent, streamingMessageId, watchdog timers) that duplicates what CenterPanel does. The two implementations can drift. MayaChat also uses `onKeyPress` (deprecated) instead of `onKeyDown` at line 407.
**Impact:** Bug fixes to streaming in CenterPanel don't propagate to MayaChat. Two places to maintain identical logic.
**Fix:** Extract a shared `useStreamingChat(conversationId)` hook that both components use.

### 9. 404 page is bare minimum
**File:** `client/src/pages/not-found.tsx`
**Problem:** No animation, no illustration, no personality. Just a Card with an AlertCircle icon. The copy says "This page doesn't exist or may have been moved" -- generic and unhelpful. No search suggestion, no common links. The "Back to your projects" link uses a raw `<a href="/">` instead of Wouter's `<Link>`, causing a full page reload.
**Impact:** Dead end for users who hit broken links. Misses an opportunity to re-engage.
**Fix:** Add Maya personality ("Hmm, I can't find that page. Let me take you back to your team."). Use Wouter `Link`. Add project list or search.

### 10. UpgradeModal and other modals lack loading/error feedback on API calls
**File:** `client/src/components/UpgradeModal.tsx:66-87`
**Problem:** When the checkout session creation fails, the modal just silently stops loading (`setIsLoading(false)`) with no error message shown to the user. Same pattern in `redirectToPortal()` and `redirectToCheckout()` in AccountPage.tsx.
**Impact:** User clicks "Upgrade to Pro", nothing happens, no feedback.
**Fix:** Add error state and display inline error message: "Failed to start checkout. Please try again."

### 11. Hardcoded hex colors scattered across components
**Files:** 322 occurrences across 20+ component files (grep count)
**Problem:** Colors like `#4ade80`, `#f87171`, `#60a5fa` are used directly in `TasksTab.tsx:13-16`, `ActivityFeedItem.tsx:19-26`, `BrainDocsTab.tsx:90` instead of using CSS custom properties or Tailwind tokens. The design system defines `--hatchin-green`, `--hatchin-blue`, `--hatchin-orange` but many components bypass these.
**Impact:** Theme changes require find-and-replace across dozens of files. Dark/light mode switching may produce inconsistent colors.
**Fix:** Map all hardcoded hex values to CSS variables. Create semantic token names like `--status-urgent`, `--status-active`, `--status-complete`.

### 12. Missing loading skeletons in sidebar tabs
**File:** `client/src/components/sidebar/TasksTab.tsx`, `ActivityTab.tsx`, `BrainDocsTab.tsx`
**Problem:** When tasks or events are loading, the tabs show nothing or a simple spinner. No skeleton loading states that indicate the shape of upcoming content. The ActivityTab shows an AutonomyStatsCard but no shimmer/skeleton for the feed items below it.
**Impact:** Users see blank space while data loads, creating a perception of slowness.
**Fix:** Add skeleton rows matching the feed item / task card shapes. Use Shadcn Skeleton component.

---

## P2 -- Nice to Have

### 13. LandingPage tour has no skip or progress indicator
**File:** `client/src/pages/LandingPage.tsx:370`
**Problem:** The `TOUR_SEQUENCE` runs 4 steps (USP indices 0, 1, 3, 7) but users cannot see where they are in the tour or skip ahead. The "Next" button appears after a timing delay, but there is no progress bar or step indicator. The CTA "Meet Your Team" link is available in the header, but the skip-to-signup behavior during tour states is not obvious.
**Fix:** Add a subtle `2/4` step counter near the "Next" button. Add a "Skip tour" link.

### 14. `onKeyPress` used instead of `onKeyDown`
**Files:** `MayaChat.tsx:407`
**Problem:** `onKeyPress` is deprecated in React 17+. It does not fire for all keys and has inconsistent cross-browser behavior.
**Fix:** Replace with `onKeyDown` and check `e.key === 'Enter' && !e.shiftKey`.

### 15. Animation components use `"use client"` directive unnecessarily
**Files:** `AnimatedCounter.tsx:1`, `AnimatedProgressBar.tsx:1`, `AnimatedTimelineItem.tsx:1`
**Problem:** `"use client"` is a Next.js directive. This project uses Vite + React, not Next.js. The directive is inert but confusing and implies wrong framework assumptions.
**Fix:** Remove `"use client"` from all three files.

### 16. Duplicate `id="modal-title"` in QuickStartModal
**File:** `client/src/components/QuickStartModal.tsx:29,64`
**Problem:** Both the modal header `<h2>` and the "Start with an idea" `<h3>` have `id="modal-title"`. Duplicate IDs break `aria-labelledby` association and are invalid HTML.
**Fix:** Remove `id="modal-title"` from the child `<h3>` at line 64.

### 17. RightSidebar fixed width doesn't adapt
**File:** `client/src/components/RightSidebar.tsx:111`
**Problem:** `w-80` (320px) is hardcoded. On larger screens this feels narrow for the Brain tab's document content. On tablets it takes too much horizontal space.
**Fix:** Consider `w-80 xl:w-96` or make it resizable.

### 18. WelcomeModal lacks dismiss on backdrop click
**File:** `client/src/components/WelcomeModal.tsx:12`
**Problem:** Uses Dialog with `onOpenChange={onClose}` which should handle backdrop dismiss. However, there is no escape key handler or explicit close button -- only the "Talk to Maya" CTA. Users who want to dismiss without acting have no obvious path.
**Fix:** Add an `X` close button in the top-right corner.

### 19. AccountPage has no empty state for Free users with zero usage
**File:** `client/src/pages/AccountPage.tsx:200-233`
**Problem:** When a new Free user has 0 messages, 0 tokens, $0.00 cost, the usage section just shows zeros. No encouragement to start using the product.
**Fix:** Show a friendly nudge: "Start chatting with your team to see usage stats here."

### 20. Auth error in login page is generic
**File:** `client/src/pages/login.tsx:137-143`
**Problem:** Shows "Authentication failed. Please try again." for all error types. No distinction between "Google rejected the request", "session expired", or "server error".
**Fix:** Parse the `error` query param and show specific messages for common failure modes.

---

## P3 -- Design Observations

### 21. Login page carousel auto-advances without pause-on-hover
The 3-slide carousel on the login right panel auto-rotates every 4 seconds. No pause on hover or focus. Users reading slide content may lose it mid-read. The carousel indicators are clickable but very small (6px dots) with no hover growth.

### 22. Inconsistent border radius scale
Components use a mix of `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-lg` (8px), and `rounded-md` (6px) without clear rules. Modals use `rounded-2xl`, sidebar uses `rounded-2xl`, cards vary between `rounded-lg` and `rounded-xl`. A documented radius scale would help: cards=12px, modals=16px, inputs=8px, badges=full.

### 23. MessageBubble reads from DOM to detect dark mode
At `MessageBubble.tsx:102`, the component calls `document.documentElement.classList.contains('dark')` directly to adjust bubble colors. This is a side effect in render that doesn't react to theme changes. If the user toggles theme, existing messages won't update until re-render.

### 24. LeftSidebar has 18 props -- interface is too wide
The LeftSidebarProps interface (lines 33-57) has 18 optional callback props. This makes the component hard to reason about and test. Many of these (`onCreateProject`, `onCreateProjectFromTemplate`, `onCreateIdeaProject`, etc.) are project creation variants that could be consolidated into a single `onCreateProject(options)` handler.

### 25. Scrollbar hiding uses CSS class toggling with timeouts
Both LeftSidebar and RightSidebar manually toggle an `is-scrolling` class via setTimeout to show/hide scrollbars. This is a novel pattern but brittle -- rapid scroll events can leave the scrollbar in the wrong state. Consider using CSS `scrollbar-gutter: stable` or the `:hover` pseudo-class for a simpler approach.

### 26. The onboarding flow stores designation in localStorage but never sends it to the server
`onboarding.tsx:169` saves `hatchin_user_designation` to localStorage, but this value is never sent to the backend. The designation selection step creates user friction without providing value unless it's actually used to personalize agent behavior.

### 27. EggHatchingAnimation is referenced but not audited in detail
The egg hatching animation is triggered during project creation. It provides a delightful loading state, which is great. However, the `handleEggHatchingComplete` function in home.tsx (line 410-485) does 3 sequential API fetches with a 500ms timeout before selecting the new project. If any fetch fails, the user sees no feedback.

---

## Strengths

1. **Design token system is well-structured.** Light and dark mode CSS variables in `index.css` cover surfaces, borders, text, and brand colors. The `--hatchin-*` namespace is clean and Tailwind extends it properly. Glass effects and elevation tokens show design maturity.

2. **Landing page storytelling is exceptional.** The conversational tour with Maya, typewriter effect, connection lines to USP cards, and persona-driven copy ("You've been building alone long enough") is genuinely compelling. The 8 USP panels with live animations tied to chat progression is a creative approach to onboarding.

3. **Agent personality shines through UI.** Role-aware bubble colors from `getAgentColors()`, character names from `roleRegistry`, custom avatars per role, and the "working" pulse animation on agent avatars during background execution create a sense of living teammates.

4. **Modal accessibility is above average.** `QuickStartModal`, `ProjectNameModal`, and `StarterPacksModal` all use `FocusTrap` from `focus-trap-react`. They have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. This is better than most MVPs.

5. **WebSocket message validation.** `websocket.ts:77` validates all incoming messages against `wsServerMessageSchema` using Zod. Malformed server messages are caught and logged rather than crashing the UI. This is excellent defensive programming.

6. **Empty states are thoughtful.** The BrainDocsTab empty state ("Maya's Memory -- As you chat, she'll build memory here"), the Activity feed empty state, and the welcome modal's egg orb animation all feel intentional and on-brand.

7. **The Animated* component library is clean.** `AnimatedCounter`, `AnimatedProgressBar`, and `AnimatedTimelineItem` are well-typed, use `requestAnimationFrame` for smooth rendering, include easing functions, and have sensible default props. Good utility components.

8. **Error boundaries exist at the right levels.** `AppErrorFallback` wraps the entire router, `PanelErrorFallback` wraps individual panels. Both provide "Try again" and "Reload page" recovery actions.

---

## Recommendations (Top 5 for Biggest Impact)

### 1. Split CenterPanel.tsx into 5-7 focused modules
This is the single highest-impact refactor. Extract: `useChatStreaming`, `useChatMessages`, `ChatInput`, `ChatHeader`, `StreamingBubble`, `ChatMessageList`. Each module becomes independently testable and reviewable. Target: CenterPanel.tsx drops from 3,084 to 400 lines.

### 2. Create a ProjectSelectionContext to eliminate prop drilling
Replace the 15+ props flowing through Home.tsx with a React context. This also enables components deeper in the tree (like sidebar sub-tabs) to read selection state directly instead of threading it through 3+ layers.

### 3. Conduct a full light-mode design pass
Light mode currently works but feels unfinished. Audit all `--hatchin-*` light values for WCAG AA contrast. Remove all `dark:bg-[#hex]` patterns in the landing page that have no light counterpart. Test every page in light mode and fix contrast/readability issues.

### 4. Add ARIA tree and tab patterns to sidebar navigation
The SidebarTabBar needs `role="tablist"`, the ProjectTree needs `role="tree"` with keyboard navigation, and all interactive elements need visible focus indicators (`:focus-visible` ring). This unlocks the product for keyboard and screen reader users with minimal visual changes.

### 5. Redesign the mobile landing page experience
The bento grid + connection lines approach is desktop-only by nature. Build a mobile-specific landing experience: a vertical card stack or swipe carousel that preserves the storytelling but works on narrow viewports. This likely doubles conversion from mobile traffic.
