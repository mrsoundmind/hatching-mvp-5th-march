# State: Hatchin MVP

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** A user should feel like they're talking to real colleagues — not a chatbot.
**Current focus:** Phase 1 — User Journey & Core UX Fixes

---

## Current Position

Phase: 1 — User Journey & Core UX Fixes
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-17 — Milestone v1.0 initialized

---

## Accumulated Context

### What's been built (this session)
- 26 SVG avatars redesigned with Hatchin design system (radial gradients, 3-layer eyes, nose dots, hair highlights, indigo ring)
- Per-character unique idle micro-animations (brow/mouth matching personality)
- Thinking bubble added to AvatarWrapper (replaces head tilt)
- `agentRole` added to message metadata in `routes.ts`
- Tone guard test fixed (was checking for removed "Next step:" endings)
- AgentAvatar wired into MessageBubble, ProjectTree, RightSidebar, CenterPanel
- Character names (Alex, Dev, Cleo, etc.) now shown instead of role names in all UI

### Pending from this session
- Create Project button does nothing — `onConfirm` wired in ProjectNameModal but need to verify the call chain in LeftSidebar/home.tsx
- Sidebar auto-collapse not yet implemented
- Input blocking while AI responds — fix applied in plan but need to verify in code
- Bubble color inconsistency — fix applied but needs end-to-end verification

---

## Blockers / Concerns

None.

---

## Phase History

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| — | Pre-GSD | Complete | Core platform built: auth, chat, streaming, agents, tasks |
