---
phase: 6
slug: background-execution-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 6 -- Validation Strategy

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
| 06-01-01 | 01 | 1 | EXEC-01, EXEC-03 | unit | `npx tsx scripts/test-execution-trigger.ts` | W0 | pending |
| 06-01-02 | 01 | 1 | EXEC-01 | typecheck | `npx tsc --noEmit` | N/A | pending |
| 06-02-01 | 02 | 1 | SAFE-02 | unit | `npm run gate:safety` | exists | pending |
| 06-03-01 | 03 | 2 | EXEC-02 | typecheck | `npx tsc --noEmit` | N/A | pending |
| 06-03-02 | 03 | 2 | EXEC-02, EXEC-03, SAFE-01, SAFE-03, UX-02 | integration | `npx tsx scripts/test-execution-pipeline.ts` | W0 | pending |
| 06-04-01 | 04 | 3 | UX-02 | typecheck | `npx tsc --noEmit` | N/A | pending |
| 06-04-02 | 04 | 3 | EXEC-03, UX-02 | unit+typecheck | `npx tsx scripts/test-execution-trigger.ts` | W0 | pending |
| 06-04-03 | 04 | 3 | UX-02 | manual | browser test | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-execution-trigger.ts` -- stubs for EXEC-01 trigger detection + EXEC-03 cost cap enforcement at trigger path (Plan 01 Task 1, Plan 04 Task 2)
- [ ] `scripts/test-execution-pipeline.ts` -- stubs for EXEC-02 task execution, output storage, cost cap enforcement at worker level, and WS event emission (Plan 03 Task 2)

*Existing test infrastructure (typecheck, dto, integrity, gate:safety) covers type safety and safety scoring.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Team is working..." indicator in chat | UX-02 | Visual WebSocket-driven UI | Send trigger message, verify indicator appears in chat panel |
| Approval request surfaces in chat | SAFE-01 | Visual WS event rendering | Create high-risk task, verify approval request shown to user |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
