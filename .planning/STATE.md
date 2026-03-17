# State: Hatchin MVP

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** No one should ever feel alone with their idea, have to start from scratch, or need to know how to prompt AI — just have a conversation and your team takes it from there.
**Current focus:** Phase 1 — Hatch Conversation Quality

---

## Current Position

Phase: 1 — Hatch Conversation Quality
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-17 — Milestone v1.0 initialized with full product vision

---

## Accumulated Context

### Product Vision (critical — inform all decisions)
- Hatchin solves the **prompting barrier** — users talk naturally, Hatches handle the AI complexity underneath
- Target user: anyone with an idea, regardless of technical background
- The bridge: dream → team → execution
- Use cases span all domains: designer gets better at design, founder gets product built, developer thinks through architecture
- "Never alone, never from scratch, never have to prompt" — these three are the north star
- **Current phase focus: text/conversation perfection. No new modalities yet.**
- Future roadmap (not now): image generation, Claude coding integration, voice input

### What's been built (this session)
- 26 SVG avatars redesigned with Hatchin design system (radial gradients, 3-layer eyes, indigo ring)
- Per-character unique idle micro-animations (brow/mouth per personality)
- Thinking bubble added to AvatarWrapper (replaces head tilt)
- `agentRole` added to message metadata in `routes.ts`
- AgentAvatar wired into MessageBubble, ProjectTree, RightSidebar, CenterPanel
- Character names (Alex, Dev, Cleo, etc.) shown instead of role names

### Known broken flows (Phase 2 priority)
- Create Project button does nothing — needs investigation in LeftSidebar/home.tsx call chain
- Sidebar does not auto-collapse on project/team click
- Input blocked while AI responds (fix planned, needs verification)
- Bubble color resets on navigation (fix planned, needs verification)

---

## Blockers / Concerns

None.

---

## Phase History

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| — | Pre-GSD | Complete | Core platform: auth, streaming chat, agents, tasks, WebSocket, LangGraph |
