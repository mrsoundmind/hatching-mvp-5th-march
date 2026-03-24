---
phase: 11
slug: sidebar-shell-activity-feed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if configured) / npm run typecheck + manual |
| **Config file** | vitest.config.ts (exists at root) |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm run typecheck && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm run typecheck && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SIDE-01, SIDE-02 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | SIDE-03 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | SIDE-04 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | FEED-01 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 1 | FEED-02 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-02-03 | 02 | 1 | FEED-03, FEED-04 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-02-04 | 02 | 1 | FEED-05 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 1 | AGNT-01 | typecheck + manual | `npm run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* TypeScript strict mode + Vite build serve as the automated quality gate. No new test framework setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab switching preserves scroll position | SIDE-02 | CSS display:none behavior requires visual confirmation | Switch tabs, scroll down in Activity, switch to Brain & Docs, switch back — scroll position should be preserved |
| Live activity feed updates in real-time | FEED-01 | Requires running autonomy pipeline to generate WS events | Trigger background task execution, verify feed items appear without page refresh |
| Stats card shows correct today's numbers | FEED-02 | Requires autonomy events in DB for current day | Run autonomy tasks, check stats card shows matching counts |
| Filter chips filter correctly | FEED-03 | Client-side filtering needs visual verification | Click filter chips, verify feed items filter by category |
| Feed aggregation groups rapid events | FEED-04 | Requires multiple rapid events from same traceId | Trigger handoff chain, verify grouped feed item instead of N separate items |
| Empty states render correctly | FEED-05 | Visual/copy verification | View Activity tab with no events, verify empty state renders |
| Agent avatar shows working ring | AGNT-01 | CSS animation requires visual confirmation | Start background task, verify pulsing ring on agent avatar in sidebar |
| Mobile sidebar tabs work in Sheet | SIDE-04 | Requires mobile viewport testing | Resize to mobile, open right sidebar Sheet, verify tabs render and switch correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
