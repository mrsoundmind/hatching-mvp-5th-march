# Hatchin MVP

## What This Is

Hatchin is an AI-powered collaborative project execution platform. Users get a team of AI colleagues ("Hatches") — each with distinct roles, personalities, and SVG avatars — that live inside their project. They chat naturally, the AI detects tasks, routes questions to the right specialist, and learns working styles over time. Think Slack + Notion + a real AI team, all in one.

## Core Value

A user should be able to open Hatchin, message their team, and feel like they're talking to real colleagues — not a chatbot.

## Requirements

### Validated

- ✓ Google OAuth login — v1.0
- ✓ Multi-agent LangGraph chat with streaming — v1.0
- ✓ Project / Team / Agent CRUD — v1.0
- ✓ WebSocket real-time messaging — v1.0
- ✓ Task detection from chat — v1.0
- ✓ Safety gates + peer review — v1.0
- ✓ Role-based agent personalities (26 characters) — v1.0
- ✓ Animated SVG avatars per character — v1.0

### Active

- [ ] LandingPage wired into router at `/`
- [ ] Create Project flow works end-to-end (button not broken)
- [ ] Sidebar auto-collapse/expand on project/team click
- [ ] Agent bubble colors consistent across navigation
- [ ] Input never blocked while AI responds
- [ ] Personality evolution persisted to database
- [ ] Message deduplication key
- [ ] Cursor-based pagination for long conversations
- [ ] `STORAGE_MODE=db` production assertion
- [ ] routes.ts modularized (projects, teams, agents, messages, chat)

### Out of Scope

- Mobile app — web-first, mobile later
- Real-time video calls — massive infra, not core value
- Custom LLM fine-tuning — need 10K+ feedback examples first
- Multi-tenant billing — pre product-market fit
- GitHub / Linear integrations — v2+

## Context

**Stack:** React 18 + Wouter + TanStack Query + Tailwind + Framer Motion (frontend) / Express + Drizzle ORM + Neon PostgreSQL + LangGraph + Gemini 2.5-Flash (backend).

**Current branch:** `reconcile-codex` — active feature development, merges into `main`.

**LLM chain:** Gemini 2.5-Flash (primary) → GPT-4o-mini (fallback) → Mock (test).

**Known issues from CLAUDE.md:**
- `routes.ts` is 3,500+ lines (god file — needs modularization)
- `MemStorage` loses data on restart (must never be used in production)
- LandingPage.tsx exists but not wired to router
- No message pagination (all messages load at once)
- Personality evolution stored in-memory (resets on restart)
- No message deduplication key

## Constraints

- **TypeScript strict mode**: All code must pass `npm run typecheck` — no `any` types
- **No raw SQL**: Always use Drizzle ORM in application code
- **Auth required**: All routes except `/auth` must check `req.session.userId`
- **Zod validation**: All API inputs validated with Zod schemas
- **Prompt rules**: No markdown headers, no bullet lists, max 1 question per reply

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph for multi-agent routing | Extensible state machine, supports peer review nodes | ✓ Good |
| Gemini 2.5-Flash as primary LLM | Cost-effective, fast, good quality | ✓ Good |
| Neon PostgreSQL serverless | Scales to zero, easy setup, good for MVP | ✓ Good |
| Drizzle ORM over Prisma | Lighter, type-safe, better migration control | ✓ Good |
| SVG avatars per character (26) | Personality-driven UI, memorable, lightweight | ✓ Good |
| Framer Motion for animations | GPU-accelerated, declarative, integrates with React | ✓ Good |

---
*Last updated: 2026-03-17 after v1.0 milestone initialized*
