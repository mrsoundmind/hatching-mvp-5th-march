---
phase: 13-approvals-hub-task-pipeline
plan: "01"
subsystem: frontend/sidebar
tags: [approvals, task-pipeline, tdd, sidebar, framer-motion, tanstack-query]
dependency_graph:
  requires:
    - "client/src/components/ui/EmptyState.tsx (Phase 11 component)"
    - "client/src/components/AutonomousApprovalCard.tsx (visual sibling reference)"
    - "vitest.config.ts (test framework config)"
  provides:
    - "client/src/components/sidebar/approvalUtils.ts → isApprovalExpired, APPROVAL_EXPIRY_MS, PIPELINE_STAGES"
    - "client/src/components/sidebar/ApprovalItem.tsx → single approval card with approve/reject mutations"
    - "client/src/components/sidebar/ApprovalsEmptyState.tsx → empty state for approvals tab"
  affects:
    - "Phase 13 Plan 02 (ApprovalsTab container will import these leaf components)"
    - "RightSidebar.tsx hasPendingApprovals wiring (Plan 02 concern)"
tech_stack:
  added: []
  patterns:
    - "TanStack useMutation with queryClient.invalidateQueries for approve/reject"
    - "Frontend-derived expiry — no DB migration needed (30-min window from updatedAt)"
    - "Record<string, unknown> cast for runtime-only metadata fields (awaitingApproval, riskScore, riskReasons)"
    - "motion.div with AnimatePresence exit animation pattern from AutonomousApprovalCard"
key_files:
  created:
    - client/src/components/sidebar/approvalUtils.ts
    - client/src/components/sidebar/ApprovalItem.tsx
    - client/src/components/sidebar/ApprovalsEmptyState.tsx
    - scripts/test-approval-expiry.test.ts
    - scripts/test-task-pipeline-view.test.ts
  modified: []
decisions:
  - "Frontend-only expiry derivation using updatedAt + 30-min constant — avoids DB migration for ephemeral approval state"
  - "Record<string, unknown> cast instead of any — matches research guidance on pitfall 2 (schema type is outdated)"
  - "blocked status intentionally maps to Review display label — documented with comment in PIPELINE_STAGES constant"
metrics:
  duration: "161 seconds"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
  tests_added: 25
  tests_passing: 25
---

# Phase 13 Plan 01: Approval Leaf Components Summary

**One-liner:** Approval expiry pure function + PIPELINE_STAGES constant + ApprovalItem card with TanStack approve/reject mutations + ApprovalsEmptyState using shared EmptyState component.

---

## Objective

Create the foundational leaf components for the Approvals tab: utility functions (expiry, pipeline mapping), the `ApprovalItem` card with one-click approve/reject, and the empty state. These are the building blocks Plan 02 composes into the full `ApprovalsTab` container.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create approval expiry utility + unit tests (TDD) | `1ee03fd` | approvalUtils.ts, test-approval-expiry.test.ts, test-task-pipeline-view.test.ts |
| 2 | Create ApprovalItem and ApprovalsEmptyState components | `4752ec0` | ApprovalItem.tsx, ApprovalsEmptyState.tsx |

---

## What Was Built

### approvalUtils.ts

Three exports:

- **`APPROVAL_EXPIRY_MS`** — `30 * 60 * 1000` (30 minutes). Named constant for easy adjustment.

- **`isApprovalExpired(task)`** — Pure function that classifies an approval as expired. Returns `false` if not an approval task, if already actioned (approvedAt or rejectedAt), or if within the 30-minute window. Returns `true` only when `awaitingApproval === true`, no action taken, and `Date.now() - updatedAt > APPROVAL_EXPIRY_MS`.

- **`PIPELINE_STAGES`** — 5-element readonly array mapping DB status enum to UI labels: `todo` (no assignee) → Queued, `todo` (with assignee) → Assigned, `in_progress` → In Progress, `blocked` → Review, `completed` → Done. The `blocked` → "Review" mapping is the APPR-02 core requirement — the DB has no `review` status, `blocked` is the closest semantic match.

### ApprovalItem.tsx

Renders a single pending approval card following the sidebar `ActivityFeedItem` visual pattern (32px avatar circle, color-coded left border, text hierarchy). Two distinct render states:

- **Active approval**: Approve Task + Reject Task buttons with `aria-label` attributes scoped to the task title. Both use `useMutation` → `POST /api/tasks/:id/approve|reject` → `invalidateQueries`. Disabled with `opacity-50` while either mutation is pending.
- **Expired approval**: "Expired" badge (`aria-label="Approval expired"`) replaces buttons. Framer Motion transition duration set to 0 for expired items (no entrance animation).

Border color: orange (`var(--hatchin-orange)`) when `riskScore >= 0.6`, amber otherwise.

### ApprovalsEmptyState.tsx

Wraps the shared `EmptyState` component with `ShieldCheck` icon and UI-SPEC copy. Wrapped in `<div aria-live="polite">` for screen reader announcements. No CTA button — approvals are system-generated.

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| test-approval-expiry.test.ts | 9 | isApprovalExpired all paths including boundary conditions (exactly 30min, 30min+1ms) |
| test-task-pipeline-view.test.ts | 16 | All 5 PIPELINE_STAGES filters, blocked→Review rename, unique IDs, dot color presence |
| **Total** | **25** | **All passing** |

TDD flow: tests created first (RED — module not found error), then implementation (GREEN — 25/25 pass). No REFACTOR phase needed.

---

## Deviations from Plan

### Pre-existing issue discovered (out of scope)

`client/src/components/ui/sparkles.tsx` has pre-existing TypeScript errors (`@tsparticles/react`, `@tsparticles/engine`, `@tsparticles/slim` packages missing from node_modules). This causes `npm run typecheck` to exit with code 2. These errors are unrelated to Plan 01 changes — new files (approvalUtils.ts, ApprovalItem.tsx, ApprovalsEmptyState.tsx) have zero TypeScript errors. Logged to `deferred-items.md` for tracking.

No other deviations — plan executed exactly as written.

---

## Self-Check

### Files exist
- `client/src/components/sidebar/approvalUtils.ts`: FOUND
- `client/src/components/sidebar/ApprovalItem.tsx`: FOUND
- `client/src/components/sidebar/ApprovalsEmptyState.tsx`: FOUND
- `scripts/test-approval-expiry.test.ts`: FOUND
- `scripts/test-task-pipeline-view.test.ts`: FOUND

### Commits exist
- `1ee03fd` (Task 1): FOUND
- `4752ec0` (Task 2): FOUND

### Tests
- 25/25 passing

## Self-Check: PASSED
