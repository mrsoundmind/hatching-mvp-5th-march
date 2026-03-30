---
phase: 7
slug: agent-handoffs-and-approval-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript scripts (scripts/test-*.ts) + npm run typecheck |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run typecheck && npm run test:dto && npm run test:integrity` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run typecheck && npm run test:dto && npm run test:integrity`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | HAND-01, HAND-03 | unit | `npx tsx scripts/test-handoff-orchestrator.ts` | W0 | pending |
| 07-01-02 | 01 | 1 | HAND-04 | typecheck | `npx tsc --noEmit` | N/A | pending |
| 07-02-01 | 02 | 1 | HAND-02 | unit | `npx tsx scripts/test-handoff-messages.ts` | W0 | pending |
| 07-03-01 | 03 | 2 | UX-01 | unit+typecheck | `npx tsx scripts/test-approval-endpoints.ts` | W0 | pending |
| 07-03-02 | 03 | 2 | UX-01 | manual | browser test | N/A | pending |
| 07-04-01 | 04 | 3 | UX-04 | unit | `npx tsx scripts/test-pause-cancel.ts` | W0 | pending |
| 07-04-02 | 04 | 3 | UX-04 | manual | browser test | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-handoff-orchestrator.ts` — stubs for HAND-01 routing + HAND-03 cycle detection integration
- [ ] `scripts/test-handoff-messages.ts` — stubs for HAND-02 in-character handoff announcements
- [ ] `scripts/test-approval-endpoints.ts` — stubs for UX-01 approve/reject endpoints
- [ ] `scripts/test-pause-cancel.ts` — stubs for UX-04 pause/cancel controls

*Existing test infrastructure (typecheck, dto, integrity, gate:safety) covers type safety and safety scoring.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approval card renders with Approve/Reject/Modify buttons | UX-01 | Visual React component | Trigger high-risk task, verify card appears in chat |
| Pause button stops all autonomous execution | UX-04 | Visual + WS state | Click pause, verify no new tasks execute |
| Handoff announcement appears in chat | HAND-02 | Visual WS rendering | Complete a task, verify next agent announces pickup |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
