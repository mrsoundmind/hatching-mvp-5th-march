# Milestones

## v1.1 Autonomous Execution Loop (Shipped: 2026-03-23)

**Phases completed:** 4 phases, 12 plans
**Timeline:** 2026-03-19 → 2026-03-23 (4 days)
**Requirements:** 17/17 satisfied (EXEC-01–04, HAND-01–04, SAFE-01–04, UX-01–05)

**Key accomplishments:**
- Built background task execution pipeline with pg-boss durable job queue — Hatches produce real output autonomously
- Implemented agent-to-agent handoff chain with BFS cycle detection and max-hops guard
- Created three-tier safety system: auto-complete (low risk), peer review (mid risk), user approval (high risk)
- Added progressive trust scoring — agents earn higher autonomy through successful task completions
- Built Maya return briefing — LLM-generated conversational summary when user returns after absence
- Wired tab notifications (flashing title + OS Notification API) and inactivity auto-trigger with per-project opt-in

**Archive:** [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) | [v1.1-MILESTONE-AUDIT.md](milestones/v1.1-MILESTONE-AUDIT.md)

---

## v1.0 Text-Perfect, Human-First (Shipped: 2026-03-19)

**Phases completed:** 5 phases, 13 plans
**Timeline:** 2026-03-05 → 2026-03-19 (14 days)
**Codebase:** ~47,000 LOC TypeScript, 162 files changed

**Key accomplishments:**
- Implemented all 8 conversation quality gaps — domain expertise, emotional signatures, LLM memory, opinion injection, open questions
- Fixed complete user journey — landing page, onboarding, project creation, team accordion, typing indicators, bubble colors
- Built 26 animated SVG character avatars with per-character idle micro-animations and thinking states
- Wired personality evolution to persist adaptedTraits to database — behavior learning survives server restart
- Added production storage guard, message idempotency keys, and cursor-based pagination
- Split 4,347-line routes.ts god file into 6 focused modules (430-line orchestrator remains)

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) | [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---
