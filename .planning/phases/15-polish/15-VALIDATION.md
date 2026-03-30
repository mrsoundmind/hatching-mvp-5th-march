---
phase: 15
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright MCP (browser visual verification) + TypeScript typecheck |
| **Config file** | `tsconfig.json` (typecheck), Playwright MCP (visual) |
| **Quick run command** | `npx tsc --noEmit --pretty` |
| **Full suite command** | `npm run typecheck` + Playwright screenshot verification |
| **Estimated runtime** | ~15 seconds (typecheck) + ~30 seconds per visual check |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit --pretty` + take Playwright screenshot
- **After every plan wave:** Full visual audit of all modified components via Playwright
- **Before `/gsd:verify-work`:** Full suite must be green + all components visually verified
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | PLSH-01 | visual + typecheck | `npx tsc --noEmit` + Playwright screenshot | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- TypeScript strict mode already configured
- Playwright MCP available for browser automation
- Dev server (`npm run dev`) provides live preview

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual premium quality | PLSH-01 | Subjective visual assessment | Compare before/after screenshots for each component; verify consistent card styles, spacing, animations |
| Mobile touch targets | PLSH-01 | Physical interaction testing | Use Playwright to resize to mobile viewport (375px), verify 44px minimum tap targets |
| Animation smoothness | PLSH-01 | Performance perception | Navigate through tabs, observe animation transitions are smooth (no jank) |
| Dark/light mode consistency | PLSH-01 | Visual comparison | Toggle theme, verify all polished components look correct in both modes |

---

## Validation Sign-Off

- [ ] All tasks have visual verify via Playwright screenshots
- [ ] Sampling continuity: every component change has before/after screenshot
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
