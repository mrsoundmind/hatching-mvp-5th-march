# Hatchin MVP — Full Runtime + UI/UX Audit Plan

## Context
Previous audit was **static code analysis only** — agents read code but never ran it. User wants a **real runtime audit**: start the dev server, use the Playwright MCP browser to click every button, test every flow, exercise every feature listed in `HATCHIN-COMPLETE-INVENTORY.md`, and document every bug + UI/UX friction point. Goal: ship with zero bugs.

## Approach
Four phases: (1) Run all automated test suites, (2) Full browser-based user journey testing via Playwright MCP across 8 parallel agents, (3) Compile all findings, (4) Fix everything.

**Dev server**: `npm run dev` on port 5001
**Auth bypass**: `GET /api/auth/dev-login` (creates dev user, sets session, redirects to `/`)
**Reference**: `.planning/HATCHIN-COMPLETE-INVENTORY.md` — every feature to test

---

## Phase 1: Automated Test Suites

Run ALL test commands before browser testing to establish baseline:

```bash
npm run typecheck
npm run build
npm run test:dto
npm run test:integrity
npm run gate:safety
npm run test:voice
npm run test:pushback
npm run test:reasoning
```

Record pass/fail for each. Any failure = fix before proceeding.

---

## Phase 2: Browser Testing — 8 Parallel Agents

Start dev server (`npm run dev`), then launch 8 agents simultaneously. Each agent uses Playwright MCP browser tools to test a specific area. Each agent screenshots every screen and documents bugs + UX friction.

**Coverage cross-check vs HATCHIN-COMPLETE-INVENTORY.md:**
- Pages (7/7): LandingPage→A1, login→A1, onboarding→A1, home→A2+A3, MayaChat→A3, AccountPage→A6, not-found→A6
- Hooks (10/10): useAuth→A1+A6, useRealTimeUpdates→A3, useRightSidebarState→A4, useThreadNavigation→A3, useAutonomyFeed→A4, useUnreadCounts→A2, useAgentWorkingState→A2, useSidebarEvent→A4, use-toast→A2+A4
- Components (30+/30+): All covered across agents 1-8
- Sidebar (11+/11+): All covered by A4
- Backend routes (40+/40+): All covered by A8
- Avatar components (32): Spot-checked by A2 across all 30 roles
- CSS animations (11): Verified by A1 (egg), A2 (working ring), A3 (streaming cursor), A4 (flash-save, shimmer)

### Agent 1 — Landing Page + Login + Onboarding
**Goal**: Test the entire first-time user experience from arrival to first project.

1. Navigate to `http://localhost:5001/` (logged out) → verify LandingPage renders
2. **Landing page audit**:
   - All 8 USP panels render with correct content
   - Responsive: resize to 375px mobile, verify no horizontal scroll
   - All CTAs ("Get Started", "Sign Up") are visible and clickable
   - Footer links work (privacy, terms)
   - Skip-to-signup link visible during tour
   - Dark/light mode toggle works
   - Animations are smooth (parallax, carousel auto-rotate 4s)
   - Screenshot each panel state
3. Click login → verify redirect to `/login`
4. **Login page audit**:
   - Google OAuth button visible and styled
   - Agent card parallax animation works on mouse move
   - Slide carousel auto-rotates every 4s
   - Mobile responsive (375px)
   - Screenshot
5. Navigate to `/api/auth/dev-login` → verify redirect to `/` as logged-in user
6. **Onboarding flow audit** (first-time user):
   - WelcomeModal appears with animated egg
   - "Get Started" → OnboardingSteps (3 steps: chat, hatch, brain)
   - Step animations render (ChatPreview typing, AgentHatch spring, BrainFill)
   - Complete steps → PathSelectionModal (3 choices)
   - Test all 3 paths:
     a. "Start with idea" → ProjectNameModal → validate name input (required, max 100 chars, char counter)
     b. "Use starter pack" → StarterPacksModal (8 templates visible)
     c. "Figure it out" → direct to empty project
   - Screenshot each modal state
7. **UX friction to document**: Load times, confusing copy, unclear CTAs, animation jank

### Agent 2 — Left Sidebar + Project Tree + Navigation
**Goal**: Test all sidebar interactions, project/team/agent CRUD, search, navigation.

1. Dev-login → navigate to app
2. **Create project** via "+" button → verify QuickStartModal appears
3. Create project with idea path → verify Maya welcome message appears in chat
4. Create project with starter pack → verify correct agents/teams are hatched
5. **Project tree audit**:
   - Project expands/collapses (chevron click)
   - Team section shows correct agent count
   - Individual agents show with correct avatars and character names (not role names)
   - Maya is hidden from sidebar (isSpecialAgent filter)
   - Click project → selects project chat
   - Click team → selects team chat
   - Click agent → selects 1-on-1 chat
   - Active selection highlighting works
6. **Search**:
   - Ctrl+K focuses search
   - Typing filters projects/teams/agents
   - Search highlighting works (matches highlighted in blue)
   - Special characters in search don't crash (type `[test]`)
   - Escape clears search
7. **Inline rename** (double-click):
   - Double-click project name → edit mode, Enter saves, Escape cancels
   - Double-click team name → same
   - Double-click agent name → shows characterName in edit, not role
8. **Delete flows**:
   - Delete project → confirmation dialog → undo popup (5s window)
   - Delete team → confirmation
   - Delete agent → confirmation
   - Click undo → entity restored
9. **AddHatchModal**:
   - Click "Add Hatch" → modal opens
   - 30 role dropdown shows all roles with correct character names
   - Select a role → verify agent created with correct personality JSONB
   - Tier gate: If Free user, verify Pro-only roles show upgrade prompt
10. **Agent avatars**: Create agents from at least 5 different roles → verify each avatar SVG renders correctly (no broken/missing avatars)
11. **Agent working state**: If an agent is executing background task → verify pulsing ring animation on avatar in tree
12. **Mobile responsive**: Resize to mobile → hamburger menu → Sheet drawer opens
13. Screenshot every state

### Agent 3 — Chat (CenterPanel) + Streaming + Messages
**Goal**: Test the core chat experience — sending messages, receiving AI responses, streaming, all message types.

1. Dev-login → select a project
2. **Send a message** → verify:
   - Message appears instantly (user bubble, right-aligned)
   - Typing indicator shows
   - Streaming starts (streaming_started → chunks → completed)
   - Agent response renders (left-aligned, markdown formatted)
   - Message has correct agent name + avatar
   - No markdown headers (#) in response (tone guard)
   - No bullet lists in response
   - Response ends naturally (no "Let me know" or "Next step:")
3. **Message input audit**:
   - Auto-resize textarea grows with content
   - Enter sends, Shift+Enter newline
   - Empty message cannot be sent
   - Long message (500+ chars) renders correctly
4. **Chat context switching**:
   - Switch from project chat → team chat → agent 1-on-1
   - Verify conversation ID changes in URL/state
   - Previous messages load correctly
   - "Load earlier messages" button works (pagination)
5. **@mention routing**:
   - Type `@` → autocomplete suggestions appear
   - Select agent → message routes to that agent
   - Verify conductor decision (correct specialist responds)
6. **Streaming edge cases**:
   - Send rapid messages → verify no race conditions
   - WebSocket connection indicator visible
   - If WS disconnects → reconnect banner shows
7. **Special message types** (if triggerable):
   - Task suggestions card
   - Brain update notification
   - Approval card (if high-risk action happens)
   - Handoff card between agents
   - Deliberation card
8. **MayaChat page** (`/maya/:id`):
   - Navigate to `/maya/{projectId}` → verify Maya-specific chat loads
   - Stream watchdog: if LLM hangs >20s, verify auto-reset
   - Coachmark UX on first visit (localStorage `hatchin_maya_visited`)
   - Upload document to brain from Maya chat
9. **EggHatchingAnimation**: When creating a new project with starter pack → verify egg hatch animation plays smoothly (pulsing ring → crack → hatch sequence)
10. **UX friction**: Response time, streaming smoothness, message bubble alignment, avatar quality

### Agent 4 — Right Sidebar (All 3 Tabs)
**Goal**: Test the tabbed right sidebar — Activity, Brain & Docs, Approvals.

1. Dev-login → select a project
2. **Tab bar audit**:
   - 3 tabs visible: Activity, Brain & Docs, Approvals
   - Active tab has animated indicator (Framer Motion)
   - Switching tabs preserves state (CSS-hidden, not unmounted)
   - Badge counts show for unread activity / pending approvals
3. **Activity tab**:
   - Stats card shows (tasks completed, handoffs, cost)
   - Loading skeleton renders while fetching
   - Filter chips work (category filter)
   - Agent dropdown filter works
   - Feed items render with correct icons + timestamps
   - Empty state shows for new project ("No activity yet")
   - Real-time: send a chat message → activity feed updates
4. **Brain & Docs tab**:
   - Autonomy settings panel renders:
     - Toggle switch (autonomous execution on/off)
     - 4-position dial (observe/propose/confirm/autonomous)
     - Inactivity trigger dropdown (30min/1hr/2hr/4hr)
     - Dial descriptions update on selection
     - Settings save (debounced 800ms PATCH) — verify flash-save animation
     - Disabled state when toggle off (opacity + pointer-events-none)
   - Document upload zone:
     - Drag-and-drop area visible
     - Click to upload works
     - Upload PDF → verify it appears as document card with blue badge
     - Upload DOCX → orange badge
     - Upload TXT → muted badge
     - Upload MD → green badge
     - File > 10MB → error message
     - Invalid file type → error message
     - Delete document → card removed (optimistic)
   - Work output section:
     - If autonomy tasks completed → outputs show as collapsible accordion
     - Only one open at a time
5. **Approvals tab**:
   - Empty state shows for no pending approvals
   - Task pipeline view (Queued → Assigned → In Progress → Review → Done)
   - Approval item shows: agent name, task title, risk reasons, approve/reject buttons
   - Approve button click → task approved, card removed
   - Reject button click → task rejected, card removed
   - Expired approval shows "Expired" badge
6. **UX friction**: Visual noise, information density, tab switching smoothness, filter overwhelm

### Agent 5 — Task Manager + AI Task Detection
**Goal**: Test task CRUD, AI task suggestions, task filtering and status management.

1. Dev-login → select a project with some chat history
2. **Task Manager audit** (accessible from right sidebar or dedicated view):
   - Task sections visible: Urgent, In Progress, Backlog, Done
   - Sections collapse/expand
   - Each task shows: title, status badge, assignee, priority
3. **Create task manually** → verify it appears in correct section
4. **AI task detection**:
   - Send message with task-like content: "TODO: build the landing page"
   - Verify `task_suggestions` event fires
   - TaskSuggestionModal appears with suggested tasks
   - Approve selected tasks → tasks created
   - Dismiss → tasks not created
5. **Task status changes**:
   - Move task from Backlog → In Progress
   - Move task to Done
   - Verify status updates persist (refresh page, check still correct)
6. **Subtasks**: If hierarchical tasks exist, verify parent/child display
7. **Task assignee**: Verify agent avatar shows next to assigned tasks
8. **UX friction**: Task creation flow, status change mechanics, visual hierarchy

### Agent 6 — Account Page + Billing + Theme
**Goal**: Test account/billing page, upgrade modal, theme switching.

1. Dev-login → navigate to `/account`
2. **Account page audit**:
   - User name and email displayed
   - "Back to app" link works
   - Plan card shows (Free or Pro)
   - Usage card shows: messages today, monthly tokens, estimated cost
   - Correct formatting (numbers, currency, dates)
3. **Billing actions**:
   - If Free: "Upgrade to Pro" button visible → click → verify checkout redirect (or error if no Stripe keys)
   - If Pro: "Manage Subscription" button visible → click → verify portal redirect
   - Grace period banner shows if applicable
4. **Upgrade modal** (triggered from chat when hitting limits):
   - Free vs Pro comparison table renders
   - "Upgrade" CTA works
5. **Theme switching**:
   - Find theme toggle (dark/light)
   - Switch to light mode → verify ALL components update (no dark remnants)
   - Switch back to dark mode → verify consistency
   - Check contrast ratios in both modes
   - Verify CSS custom properties update (--hatchin-dark, --hatchin-panel, etc.)
6. **Error states**:
   - Navigate to `/nonexistent-page` → 404 page renders correctly
   - Clear cookies → refresh → verify graceful redirect to login
7. **UX friction**: Billing clarity, theme transition smoothness, error messaging

### Agent 7 — Mobile Responsive + Accessibility
**Goal**: Test the entire app at mobile viewport (375px) and check accessibility.

1. Dev-login
2. **Resize viewport to 375px width (iPhone SE)**
3. **Mobile layout audit**:
   - Header bar visible with hamburger + panel toggle
   - Hamburger → LeftSidebar opens as Sheet drawer
   - Panel toggle → RightSidebar opens as Sheet drawer
   - Sheet drawers have swipe-to-dismiss
   - Chat area takes full width
   - Message bubbles don't overflow
   - Chat input is comfortable height (>=44px touch target)
   - No horizontal scroll on any page
4. **Mobile page tests**:
   - Landing page at 375px — all USPs stack vertically
   - Login page at 375px — button is full-width
   - Account page at 375px — cards stack, no overflow
   - Onboarding modals at 375px — fit within viewport
5. **Tablet (768px)**: Quick check that layout adapts
6. **Accessibility checks**:
   - Tab through entire app — focus rings visible on all interactive elements
   - Screen reader: aria-labels on icon-only buttons
   - Message list has `role="log"` and `aria-live="polite"`
   - Modals trap focus (FocusTrap on ProjectNameModal)
   - Escape closes modals
   - Color contrast: text on all backgrounds meets 4.5:1
7. **ProgressTimeline component**: If visible in any view → verify milestones render, percentage bar fills correctly
8. **ErrorBoundary**: Intentionally trigger a React error (e.g., navigate to malformed state) → verify AppErrorFallback / PanelErrorFallback renders gracefully, not a white screen
9. **Theme persistence**: Toggle theme → refresh page → verify theme persists (localStorage)
10. **UX friction**: Touch targets too small, text too small, layout breaks

### Agent 8 — Backend API Smoke Test + WebSocket
**Goal**: Hit every API endpoint via browser and verify correct responses. Test WS events.

1. Dev-login via browser
2. **Health check**: `GET /health` → verify response shape
3. **Project CRUD**:
   - `GET /api/projects` → list projects
   - `POST /api/projects` → create project → verify response has ID
   - `GET /api/projects/:id` → fetch specific project
   - `PATCH /api/projects/:id` → update name, coreDirection, executionRules, teamCulture → verify each succeeds (especially teamCulture which was missing from schema)
   - `DELETE /api/projects/:id` → verify 204
4. **Agent CRUD**:
   - `GET /api/projects/:projectId/agents` → list agents (Maya should be in list but with isSpecialAgent=true)
   - Create agent via AddHatchModal UI
   - Delete agent
5. **Messages**:
   - `GET /api/conversations/:conversationId/messages` → verify pagination (cursor-based)
   - Verify message reactions endpoint works
6. **Billing endpoints** (may fail without Stripe keys — that's OK, verify graceful error):
   - `GET /api/billing/status` → should return even without Stripe
   - `POST /api/billing/checkout` → should return error if no Stripe
7. **Autonomy endpoints**:
   - `GET /api/autonomy/events?projectId=...` → verify returns events array
   - `GET /api/autonomy/settings/:projectId` → verify autonomy settings
8. **WebSocket verification**:
   - Open browser console → check WS connection established
   - Send message → verify streaming events flow (started → chunks → completed)
   - Verify no console errors during normal operation
9. **Team CRUD**:
   - `GET /api/teams` → list teams
   - `GET /api/projects/:projectId/teams` → teams for project
   - `POST /api/teams` → create team → verify response
   - `PATCH /api/teams/:id` → update team name
   - `DELETE /api/teams/:id` → verify deletion
10. **Conversation CRUD**:
    - `GET /api/conversations/:projectId` → list conversations
    - `POST /api/conversations` → create conversation
    - `PUT /api/conversations/:id/archive` → archive conversation
    - `PUT /api/conversations/:id/unarchive` → unarchive
11. **Task CRUD via API**:
    - `POST /api/tasks/extract` → AI extraction (may need LLM key, verify graceful fallback to keyword matching)
    - `PATCH /api/tasks/:id` → update status, priority, assignee
12. **Personality & Training**:
    - `GET /api/personality/:agentId` → verify personality JSONB response
    - `POST /api/training/feedback` → submit feedback → verify Zod validation
13. **Handoff & Speaking Authority** (via console):
    - `GET /api/handoffs/stats` → verify response shape
    - `GET /api/handoffs/history` → verify array response
14. **Brain upload endpoints**:
    - `POST /api/projects/:id/brain/upload` with test file → verify 201
    - `DELETE /api/projects/:id/brain/documents/:docId` → verify deletion
15. **Error handling**:
    - Hit protected endpoint without session → verify 401
    - Send invalid Zod body to POST endpoints → verify 400 with details
    - Request non-existent project → verify 404

---

## Phase 3: Compile All Findings

After all 8 agents complete, compile findings into:

| # | Agent | Category | Severity | Description | Screenshot |
|---|-------|----------|----------|-------------|------------|

**Categories**: BUG (broken), UX_FRICTION (works but painful), UI_ISSUE (visual problem), MISSING (feature not implemented), PERF (slow)

**Severity**: CRITICAL (blocks launch) / HIGH (bad UX) / MEDIUM (should fix) / LOW (nice to have)

---

## Phase 4: Fix Everything

Fix all CRITICAL and HIGH severity issues. Document MEDIUM/LOW for later.

---

## Verification

After all fixes:
```bash
npm run typecheck    # 0 errors
npm run build        # success
npm run test:dto     # PASS
npm run test:integrity  # PASS
npm run gate:safety  # PASS
```

Then re-run key browser tests to confirm fixes.

---

## Key Files
- `.planning/HATCHIN-COMPLETE-INVENTORY.md` — master feature list
- `client/src/App.tsx` — routes
- `client/src/pages/home.tsx` — main app shell
- `client/src/components/CenterPanel.tsx` — chat
- `client/src/components/LeftSidebar.tsx` — navigation
- `client/src/components/RightSidebar.tsx` — sidebar tabs
- `client/src/components/sidebar/` — all sidebar tab components
- `server/index.ts` — server entry
- `server/routes/` — all API routes

---

*Saved: 2026-03-27 | Cross-checked against HATCHIN-COMPLETE-INVENTORY.md (766 lines, 11 parts, 286 TypeScript files)*
