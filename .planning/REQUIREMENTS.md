# Requirements: Hatchin MVP

**Defined:** 2026-03-17
**Core Value:** A user should feel like they're talking to real colleagues — not a chatbot.

## v1 Requirements

Requirements for the v1.0 milestone. Each maps to roadmap phases.

### User Journey Fixes

- [ ] **UX-01**: User can create a project via the modal and land in the new project immediately
- [ ] **UX-02**: User sees the landing page at `/` when not logged in, and is redirected to the app when logged in
- [ ] **UX-03**: User can click a project in the sidebar to expand it (others collapse)
- [ ] **UX-04**: User can click a team in the sidebar to expand its agents (others collapse)
- [ ] **UX-05**: User can type in the chat input while the AI is responding (input never blocked)
- [ ] **UX-06**: Agent chat bubble colors are consistent when navigating between projects and teams

### AI Presence & Avatars

- [ ] **AV-01**: Each agent avatar shows a unique idle micro-animation (brow/mouth movement per personality)
- [ ] **AV-02**: Thinking state shows a thought bubble instead of head tilt
- [ ] **AV-03**: Avatars render in MessageBubble, ProjectTree, RightSidebar, and CenterPanel
- [ ] **AV-04**: Avatar animations are subtle — no full-body floating

### Data Reliability

- [ ] **DATA-01**: Agent personality evolution is persisted to the database (survives server restart)
- [ ] **DATA-02**: Message creation uses an idempotency key to prevent duplicates on retry
- [ ] **DATA-03**: Long conversations use cursor-based pagination (not all-at-once load)
- [ ] **DATA-04**: Server asserts `STORAGE_MODE=db` on startup in production (prevents silent data loss)

### Architecture

- [ ] **ARCH-01**: `routes.ts` split into `server/routes/projects.ts`, `teams.ts`, `agents.ts`, `messages.ts`, `chat.ts`
- [ ] **ARCH-02**: `agentRole` is stored in message metadata on creation and backfilled at read time for old messages

## v2 Requirements

Deferred to a future release.

### Analytics & Growth

- **ANLX-01**: User can see a dashboard of team activity (messages, tasks, response times)
- **ANLX-02**: Admin can view usage metrics across all projects
- **ANLX-03**: User can export conversation history

### Agent Marketplace

- **MKT-01**: User can browse public agent templates
- **MKT-02**: User can publish their agent configuration as a template
- **MKT-03**: User can import an agent template into their project

### Integrations

- **INT-01**: User can connect a GitHub repo and agents can reference it
- **INT-02**: User can connect Linear and tasks sync bidirectionally
- **INT-03**: User receives Slack notifications for agent messages

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, validate before native |
| Real-time video | Massive infra, not core to value |
| Custom LLM fine-tuning | Need 10K+ training examples minimum |
| Multi-tenant billing | Pre product-market fit |
| Audio input (Whisper) | Nice-to-have, not core flow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 1 | Pending |
| UX-02 | Phase 1 | Pending |
| UX-03 | Phase 1 | Pending |
| UX-04 | Phase 1 | Pending |
| UX-05 | Phase 1 | Pending |
| UX-06 | Phase 1 | Pending |
| AV-01 | Phase 2 | Pending |
| AV-02 | Phase 2 | Pending |
| AV-03 | Phase 2 | Pending |
| AV-04 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| ARCH-01 | Phase 4 | Pending |
| ARCH-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
