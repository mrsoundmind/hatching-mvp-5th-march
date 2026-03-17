# Roadmap: Hatchin MVP — v1.0

**Milestone:** v1.0 — Making Hatchin Feel Alive & Production-Ready
**Goal:** Fix the broken user journey, ship the avatar system, harden data reliability, and clean up the architecture so the codebase is maintainable.
**Phases:** 4
**Requirements:** 16 mapped, 16 covered ✓

---

## Phase 1: User Journey & Core UX Fixes

**Goal:** Every core user interaction works correctly end-to-end — creating projects, navigating the sidebar, chatting without friction.

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, ARCH-02

**Success Criteria:**
1. User clicks "Create Project" in modal → project is created and selected immediately
2. Unauthenticated user visiting `/` sees the LandingPage; authenticated user is redirected to `/app`
3. Clicking a project in the sidebar expands it and collapses all others
4. Clicking a team expands its agents; clicking again collapses
5. Textarea in chat is always enabled — user can type while AI is streaming
6. Agent bubble color is the same when revisiting a conversation after switching projects
7. `agentRole` stored in message metadata at creation and backfilled at read time

**Status:** not-started

---

## Phase 2: Avatar System Polish

**Goal:** Every agent has a unique animated SVG avatar that feels alive, emotional, and distinctly Hatchin — not generic.

**Requirements:** AV-01, AV-02, AV-03, AV-04

**Success Criteria:**
1. Each of the 26 characters has a unique idle micro-animation (brow/mouth movement matching their personality)
2. Thinking state renders a thought bubble animation; no head tilt
3. AgentAvatar renders correctly in MessageBubble, ProjectTree, RightSidebar, and CenterPanel header
4. No full-body floating in idle state — motion is contained to the face
5. All avatars share the Hatchin design theme: indigo ring, radial gradient background, 3-layer eyes, nose dots, hair highlight

**Status:** not-started

---

## Phase 3: Data Reliability & Resilience

**Goal:** Data that should persist actually persists. Duplicate messages can't happen. Long conversations don't kill performance.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04

**Success Criteria:**
1. Restarting the server does not reset agent personality learning — personality state survives in PostgreSQL
2. Sending the same message twice (e.g. on network retry) does not create a duplicate message in the DB
3. Conversations with 200+ messages load the first 50, with "load more" pagination
4. Server throws a startup error if `NODE_ENV=production` and `STORAGE_MODE !== 'db'`

**Status:** not-started

---

## Phase 4: Route Architecture Cleanup

**Goal:** Break the 3,500-line `routes.ts` god file into focused modules so the codebase is maintainable.

**Requirements:** ARCH-01

**Success Criteria:**
1. `server/routes/projects.ts` handles all `/api/projects*` routes
2. `server/routes/teams.ts` handles all `/api/teams*` routes
3. `server/routes/agents.ts` handles all `/api/agents*` routes
4. `server/routes/messages.ts` handles all `/api/conversations*` and `/api/messages*` routes
5. `server/routes/chat.ts` handles `/api/hatch/chat` and WebSocket message handlers
6. All existing tests pass — no behavior changes, only file organization
7. `npm run typecheck` passes with zero errors

**Status:** not-started

---

## Definition of Done

- [ ] All 16 v1 requirements verified
- [ ] `npm run typecheck` passes (zero errors)
- [ ] `npm run gate:safety` passes
- [ ] `npm run test:integrity` passes
- [ ] `npm run test:dto` passes
- [ ] Create Project flow tested manually
- [ ] LandingPage accessible at `/` (logged-out)
- [ ] No avatar floating in idle state
- [ ] Personality evolution survives server restart

---
*Roadmap created: 2026-03-17*
*Milestone: v1.0 — Making Hatchin Feel Alive & Production-Ready*
