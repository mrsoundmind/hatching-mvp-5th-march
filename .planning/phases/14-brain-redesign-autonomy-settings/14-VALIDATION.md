---
phase: 14
slug: brain-redesign-autonomy-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` — includes `scripts/**/*.test.ts` |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm run typecheck && npx vitest run scripts/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm run typecheck && npx vitest run scripts/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | BRAIN-01 | unit | `npx vitest run scripts/test-document-upload.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | BRAIN-02 | manual — React component | `npm run typecheck` | N/A | ⬜ pending |
| 14-02-01 | 02 | 2 | BRAIN-03 | unit | `npx vitest run scripts/test-autonomy-settings.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | BRAIN-04 | manual — React component | `npm run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-document-upload.test.ts` — unit test for file type validation + size limit logic (pure functions)
- [ ] `scripts/test-autonomy-settings.test.ts` — unit test for autonomy level validation + inactivity trigger range

*Visual component tests are manual-only — React component rendering tests would require `@testing-library/react` which is not currently installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop file upload works | BRAIN-01 | Browser drag events + server upload | Drag a PDF onto Brain tab, verify upload completes |
| Document cards render with type badge | BRAIN-02 | React component rendering | Upload a file, verify card shows filename, badge, date, delete |
| Autonomy dial changes level | BRAIN-03 | UI interaction | Toggle dial positions, verify setting persists |
| Work output viewer expands | BRAIN-04 | React component interaction | Complete a background task, verify expandable card appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
