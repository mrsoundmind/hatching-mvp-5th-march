---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Hatches That Deliver
status: in_progress
stopped_at: v2.0 core infrastructure shipped, Phase 15 polish executing
last_updated: "2026-03-30"
last_activity: 2026-03-30 — v2.0 core wiring complete (detection, iteration UI, package streaming), Phase 15 polish in progress
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 0
  completed_plans: 0
  percent: 65
---

# State: Hatchin

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** No one should ever feel alone with their idea, have to start from scratch, or need to know how to prompt AI — just have a conversation and your team takes it from there.
**Current focus:** v2.0 — Hatches That Deliver (core infrastructure shipped, remaining: PDF export, onboarding, chat integration polish)

---

## Current Position

Phase: v2.0 infrastructure + v1.3 Phase 15 (Polish)
Status: v2.0 Phases 16-20 core code shipped. Phase 15 polish executing (6 plans). Remaining: PDF export (Phase 21), zero-friction onboarding (Phase 21).
Last activity: 2026-03-30 — Wired deliverable detection into chat, added ArtifactPanel refine UI, added package execution streaming

Progress: [██████░░░░] 65%

---

## v2.0 Implementation Status

| Feature | Status | Key Files |
|---------|--------|-----------|
| Database schema (3 tables) | **SHIPPED** | migrations/0003, shared/schema.ts |
| API endpoints (12 routes) | **SHIPPED** | server/routes/deliverables.ts |
| LLM generation + iteration | **SHIPPED** | server/ai/deliverableGenerator.ts |
| Cross-agent chains (3 templates) | **SHIPPED** | server/ai/deliverableChainOrchestrator.ts |
| Organic detection (patterns) | **SHIPPED** | server/ai/deliverableDetector.ts |
| Detection wired into chat | **SHIPPED** | server/routes/chat.ts (line ~2735) |
| ArtifactPanel (viewer + version nav) | **SHIPPED** | client/src/components/ArtifactPanel.tsx |
| Refine/iterate UI | **SHIPPED** | ArtifactPanel.tsx (footer) |
| DeliverableChatCard + ProposalCard | **SHIPPED** | client/src/components/DeliverableChatCard.tsx |
| PackageProgress UI | **SHIPPED** | client/src/components/PackageProgress.tsx |
| Package streaming (WS progress) | **SHIPPED** | deliverableChainOrchestrator.ts, deliverables.ts |
| Type registry (15 types) | **SHIPPED** | shared/deliverableTypes.ts |
| WS event schemas (4 events) | **SHIPPED** | shared/dto/wsSchemas.ts |
| PDF export | **NOT STARTED** | — |
| Zero-friction onboarding | **NOT STARTED** | — |

## v1.3 Completion Status

| Phase | Status |
|-------|--------|
| 11 - Sidebar Shell + Activity Feed | **SHIPPED** |
| 12 - Handoff Visualization | **SHIPPED** |
| 13 - Approvals Hub | **SHIPPED** |
| 14 - Brain Redesign | **SHIPPED** |
| 15 - Polish | **IN PROGRESS** (6 plans executing) |

---

## Accumulated Context

### Decisions

Key decisions for v2.0:
- **Use-case-driven development**: Organize around user goals (Product Launch, Marketing Content, Planning & Research), not features
- **Deliverable chains as core differentiator**: Single deliverables = ChatGPT. Coordinated team output across agents = unique value
- **Artifact panel (Claude desktop pattern)**: Non-blocking absolute-position overlay on RightSidebar
- **Text-first deliverables**: Focus on what LLMs produce well (PRDs, specs, plans, copy)
- **Both trigger paths**: Explicit request + organic detection (pattern-based, conservative, never auto-creates)
- **Project packages as unit of value**: "Launch Package" not 12 loose docs
- **Refine via instruction**: ArtifactPanel has inline refine input, calls /api/deliverables/:id/iterate
- **Chain progress streaming**: executeDeliverableChain accepts onProgress callback, broadcasts per-step WS events
- **deliverable_versions as separate table**: Keeps base row small; supports pagination
- **Groq LLM verified**: All deliverable generation works with Groq llama-3.3-70b via OpenAI SDK

### v1.3 Decisions (preserved)

- CSS-hide pattern for tab panels to preserve scroll/draft state
- Separate layoutId namespaces for Framer Motion
- HandoffCard renders in message loop when metadata.isHandoffAnnouncement===true
- Frontend-only expiry derivation for approval state
- Optimistic document deletion with rollback
- BrainDocsTab replaces old brain tab for all contexts

### Remaining Work

- **PDF export (Phase 21)**: Install @react-pdf/renderer, build branded PDF template with TOC and attribution
- **Zero-friction onboarding (Phase 21)**: Auto-suggest package on project creation, template picker, guided first deliverable
- **Chat inline deliverable cards**: Render DeliverableChatCard when deliverable_created events arrive (component exists, not yet wired to message rendering)

---

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 15 polish executing, v2.0 core wiring complete
Next action: Wait for Phase 15 polish agents to complete, then run Phase 15-06 (cross-cutting), typecheck, commit
