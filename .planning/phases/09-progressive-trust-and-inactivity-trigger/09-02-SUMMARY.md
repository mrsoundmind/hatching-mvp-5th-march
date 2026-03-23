---
phase: 09-progressive-trust-and-inactivity-trigger
plan: "02"
subsystem: autonomy/background
tags: [exec-04, inactivity-trigger, schema, background-runner, tests]
dependency_graph:
  requires: [09-01]
  provides: [EXEC-04-complete]
  affects: [server/autonomy/background/backgroundRunner.ts, shared/schema.ts]
tech_stack:
  added: []
  patterns: [per-project feature flag, lastSeenAt activity detection]
key_files:
  created: []
  modified:
    - shared/schema.ts
    - server/autonomy/background/backgroundRunner.ts
    - scripts/test-execution-trigger.ts
decisions:
  - "inactivityAutonomyEnabled defaults to false (opt-in) — undefined and false both disable inactivity triggers"
  - "lastSeenAt used instead of last message timestamp — more accurate because lastSeenAt tracks user presence, not agent message activity"
  - "Inactivity gate placed AFTER shouldExecute check — explicit triggers bypass flag entirely"
metrics:
  duration: "95 seconds"
  completed_date: "2026-03-23"
  tasks_completed: 2
  files_modified: 3
---

# Phase 9 Plan 02: Inactivity Trigger Flag and Behavioral Tests Summary

EXEC-04 inactivity trigger wired with per-project `inactivityAutonomyEnabled` opt-in flag and `lastSeenAt`-based activity detection, validated by 14 behavioral tests.

## What Was Built

Two changes close the EXEC-04 implementation gap identified in the plan:

**1. Schema type update (`shared/schema.ts`)**

Added `inactivityAutonomyEnabled?: boolean` to the `executionRules` JSONB type. No DB migration required — JSONB is schema-less. The field defaults to undefined (disabled).

**2. backgroundRunner gating (`server/autonomy/background/backgroundRunner.ts`)**

Two sub-changes in `runAutonomousExecutionCycle`:

- Replaced the last-message-based activity detection (which could return an agent message timestamp) with `project.lastSeenAt`. This field is set when users open a project via `join_conversation` in chat.ts — it tracks genuine user presence, not agent activity.

- Added an inactivity flag gate after the `shouldExecute` check:
  ```typescript
  if (
    trigger.reason === 'inactivity' &&
    !project.executionRules?.inactivityAutonomyEnabled
  ) {
    devLog(`[BackgroundRunner] Skipping inactivity trigger for project ${project.id} — inactivityAutonomyEnabled is false`);
    continue;
  }
  ```
  Explicit triggers (`reason === 'explicit'`) bypass this gate entirely — users who say "go ahead" always get execution regardless of the flag.

- Added devLog after `queueTaskExecution` for observability: `(trigger: explicit|inactivity)`.

**3. Behavioral tests (`scripts/test-execution-trigger.ts`)**

5 new tests (10–14) added to the existing 9-test suite:

| Test | Scenario | Expected |
|------|----------|----------|
| 10 | 3h inactive, 2 todo tasks, autonomyEnabled=true | shouldExecute=true, reason=inactivity, 1 task only |
| 11 | 30min inactive (under threshold) | shouldExecute=false |
| 12 | 3h inactive, autonomyEnabled=false | shouldExecute=false, reason=none |
| 13 | lastUserActivityAt=null | shouldExecute=false |
| 14 | 3h inactive, 5 todo tasks | tasksToExecute.length===1 (blast radius) |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npm run typecheck` — PASS (no errors)
- `npx tsx scripts/test-execution-trigger.ts` — PASS: all 14 tests passed
- `inactivityAutonomyEnabled` present in both schema and backgroundRunner
- `project.lastSeenAt` used (not `getMessagesByConversation`) for activity detection

## Self-Check

| Item | Status |
|------|--------|
| shared/schema.ts has inactivityAutonomyEnabled | FOUND |
| backgroundRunner.ts has inactivityAutonomyEnabled gate | FOUND |
| backgroundRunner.ts uses project.lastSeenAt | FOUND |
| scripts/test-execution-trigger.ts has 14 tests | FOUND |
| typecheck passes | PASS |

## Self-Check: PASSED
