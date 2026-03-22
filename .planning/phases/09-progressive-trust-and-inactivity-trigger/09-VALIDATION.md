---
phase: 09
slug: progressive-trust-and-inactivity-trigger
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx script tests (npx tsx scripts/test-*.ts) |
| **Config file** | none — scripts use direct imports |
| **Quick run command** | `npx tsx scripts/test-trust-scoring.ts` |
| **Full suite command** | `npx tsx scripts/test-trust-scoring.ts && npx tsx scripts/test-inactivity-trigger.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/test-trust-scoring.ts`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | SAFE-04 | unit | `npx tsx scripts/test-trust-scoring.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | EXEC-04 | unit | `npx tsx scripts/test-inactivity-trigger.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-trust-scoring.ts` — stubs for SAFE-04 (trust persistence round-trip, threshold adjustment)
- [ ] `scripts/test-inactivity-trigger.ts` — stubs for EXEC-04 (inactivity detection, flag gating, cron trigger)

*Existing test infrastructure (tsx scripts pattern) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trust score reduces approval prompts over time | SAFE-04 | End-to-end requires multiple task completions | Complete 10+ tasks via agent, verify safety gate threshold relaxed |
| Inactivity auto-starts queued work | EXEC-04 | Timing-dependent (2-4h threshold) | Set short threshold in dev, go idle, verify task auto-starts |
| Per-project disable stops inactivity trigger | EXEC-04 | Requires project config toggle | Disable flag, verify cron skips project |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
