# Hatchin — Complete Product & System Documentation

> **Last updated**: 2026-03-25 | **Branch**: reconcile-codex | **Version**: v1.2 shipped, v1.3 in progress

---

## Table of Contents

1. [What is Hatchin?](#1-what-is-hatchin)
2. [Core Concepts](#2-core-concepts)
3. [User-Facing Features](#3-user-facing-features)
4. [All 30 AI Agent Roles](#4-all-30-ai-agent-roles)
5. [Starter Pack Templates](#5-starter-pack-templates)
6. [AI System Architecture](#6-ai-system-architecture)
7. [Autonomy System](#7-autonomy-system)
8. [Billing & Monetization](#8-billing--monetization)
9. [Tech Stack](#9-tech-stack)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [WebSocket Events](#12-websocket-events)
13. [Authentication](#13-authentication)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Backend Architecture](#15-backend-architecture)
16. [Safety & Security](#16-safety--security)
17. [LLM Provider System](#17-llm-provider-system)
18. [Knowledge System](#18-knowledge-system)
19. [Testing & QA](#19-testing--qa)
20. [Environment Variables](#20-environment-variables)
21. [Project Structure](#21-project-structure)
22. [Version History](#22-version-history)
23. [Roadmap](#23-roadmap)

---

## 1. What is Hatchin?

Hatchin is an **AI-powered collaborative project execution platform**. Think of it as a team of AI colleagues ("Hatches") that live inside your project, each with distinct roles, personalities, and domain expertise. Users interact with these AI agents through real-time chat, and the agents can:

- Have genuine, personality-driven conversations as distinct characters
- Detect and create tasks automatically from natural chat
- Route questions to the right specialist (engineer, designer, PM, marketer, etc.)
- Update the project "brain" (goals, direction, culture) from conversations
- Learn user working styles over time via personality evolution
- Coordinate autonomously via multi-agent deliberation
- Execute tasks in the background and hand off work between specialists
- Self-review quality via peer review gates and progressive trust scoring
- Manage risk through 3-tier safety gates (auto-complete, peer review, user approval)

**In short**: Hatchin gives you an entire AI team — not a single chatbot — that collaborates like real colleagues, works autonomously when trusted, and asks for permission when the stakes are high.

---

## 2. Core Concepts

### Projects
Top-level workspaces. Each project has a "brain" (core direction, execution rules, team culture), teams of agents, conversations, and tasks. A user can have multiple projects.

### Teams
Groups of agents within a project. Example: a "Product Team" with a PM, Designer, and Engineer. Teams scope conversations and task routing.

### Agents (Hatches)
AI team members with distinct personalities, expertise, and character names. There are 30 roles available (Alex the PM, Cleo the Designer, Dev the Backend Developer, etc.). Each agent has:
- A character name, emoji, and color identity
- A unique voice prompt defining how they speak
- Domain expertise and critical thinking style
- Pushback behavior (how they challenge bad ideas)
- Collaboration style (how they work with other agents)
- Trust score that evolves based on task success/failure

### Maya (Idea Partner)
Maya is the special project-level intelligence. She's not a regular team member — she's hidden from the sidebar and exists at the project scope. Maya is the first agent users interact with. She helps with brainstorming, strategic guidance, and big-picture thinking. All project-level conversations route to Maya first.

### Conversations
Three scopes:
- **Project-level** (`project:{projectId}`) — All agents can participate, Maya responds first
- **Team-level** (`team:{projectId}:{teamId}`) — Only agents in that team participate
- **1-on-1** (`agent:{projectId}:{agentId}`) — Direct conversation with one specific agent

### Tasks
Work items extracted from chat or created manually. Tasks have status (todo, in_progress, completed, blocked), priority (urgent, high, medium, low), assignees, and support parent-child hierarchy.

### Autonomy
Agents don't just talk — they can work. Background execution lets agents produce deliverables (plans, breakdowns, research) autonomously. A 3-tier safety system controls what agents can do without asking:
- **Low risk (< 0.35)**: Auto-complete, no gates
- **Mid risk (0.35–0.59)**: Peer review by another agent before delivery
- **High risk (≥ 0.60)**: Blocked for user approval (inline Approve/Reject card)

---

## 3. User-Facing Features

### 3.1 Pages & Navigation

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page (logged out) / Home (logged in) | Public marketing page or main app |
| `/login` | Login | Google OAuth with animated background |
| `/account` | Account & Billing | Subscription management, usage metrics |
| `/maya/:projectId` | Maya Chat | Dedicated project-level Maya conversation |
| `/dev/autonomy` | Autonomy Dashboard | Dev-only debug tool for autonomy events |
| `*` | 404 | Not found page |

### 3.2 Three-Panel Layout (Home Page)

The main application uses a three-panel layout:

**Left Sidebar**
- Hatchin logo and branding
- Project search (Cmd+K shortcut)
- Theme toggle (dark mode forced currently)
- User dropdown menu (profile, settings, billing, logout)
- Hierarchical project tree:
  - Projects (expandable)
    - Teams within each project
      - Agents within each team (Maya hidden)
- Inline renaming (double-click)
- Context menus (edit, delete with confirmation, pin/unpin)
- Delete undo popup (3-second recovery window)
- Search highlighting with regex matching
- Project creation flows (QuickStart, StarterPacks)

**Center Panel (Chat)**
- Chat header with project/team/agent name
- WebSocket connection status indicator
- Autonomous work indicator ("Team is working...")
- Pause/cancel autonomy buttons
- Message feed with:
  - User messages (right-aligned, blue)
  - Agent messages (left-aligned, role-colored with avatar + character name)
  - System messages (gray, informational)
  - Handoff cards (animated from-agent → to-agent visualization)
  - Deliberation cards (multi-agent coordination indicator)
  - Autonomous approval cards (Approve/Reject for high-risk actions)
- Message actions: react (thumbs up/down), reply (threading), copy
- @mentions to route to specific agents
- Streaming with thinking indicators ("Thinking...", "Reviewing context...", "Forming a response...")
- 20-second watchdog timeout for stuck streaming
- Markdown rendering (GFM) with syntax highlighting
- Task suggestion extraction from chat
- Empty states for new projects with CTAs

**Right Sidebar (Tabbed — v1.3)**
- **Activity Tab**: Real-time autonomy feed, stats card (tasks completed, handoffs, cost), filter chips
- **Brain & Docs Tab**: Core direction editor, execution rules, team culture, document upload (PDF/DOCX/TXT/MD)
- **Approvals Tab**: Pending approval requests, task pipeline view (Queued → Assigned → In Progress → Review → Done)
- Progress timeline (Explore → Build → Launch phases)
- Task manager with filters and status toggles
- Auto-save on blur with green checkmark confirmation

### 3.3 Chat Features

**Streaming & Real-Time**
- WebSocket connection to `/ws`
- Token-by-token streaming with accumulated content display
- Typing indicators with agent names and estimated duration
- Real-time autonomy events pushed to sidebar

**Message Types**
- User messages, agent messages, system messages
- Handoff announcements (rich cards with agent avatars and arrows)
- Deliberation indicators (multi-agent coordination visibility)
- Approval requests (inline Approve/Reject)

**Mentions & Routing**
- `@agentName` routes to specific agent
- `/route backend` sends to backend specialists
- Project-level chat routes to Maya by default, PM Alex as fallback
- Team-level chat routes to team agents only
- Conductor AI decides who responds in multi-agent contexts

**Task Detection**
- AI scans messages for implied tasks
- Intent classification (depth ≥ 4 words + action verbs)
- 30-second cooldown per conversation to prevent flooding
- Duplicate detection against existing tasks
- Task suggestion modal with priority, assignee, category, reasoning
- Bulk approve/reject flow

### 3.4 Modals & Flows

| Modal | Trigger | Purpose |
|-------|---------|---------|
| WelcomeModal | First login | Animated egg with "Your AI team just woke up" |
| QuickStartModal | "New Project" | Quick idea project creation with Maya |
| StarterPacksModal | "Use Template" | 38 templates across 7 categories |
| ProjectNameModal | After QuickStart/StarterPacks | Name confirmation with validation |
| AddHatchModal | "Add Agent" | Browse all 30 roles or team templates |
| OnboardingSteps | Post-signup | 4-step walkthrough (ChatPreview, AgentHatch, BrainFill, ChatProgress) |
| TaskSuggestionModal | AI detects tasks | Review and approve AI-suggested tasks |
| UpgradeModal | Tier limit hit | Free vs Pro comparison with Stripe checkout |
| EggHatchingAnimation | Project creation | 3-stage animated loading (floating → cracking → hatched) |

### 3.5 Mobile Responsiveness

- Breakpoint: `< 1024px` triggers mobile layout
- Left sidebar becomes a Sheet drawer (hamburger menu)
- Right sidebar becomes a Sheet drawer (panel toggle button)
- Center panel fills full width
- Mobile header bar with menu and panel toggle buttons
- Swipe gesture support on drawers

### 3.6 Theme & Visual Design

- Dark mode forced (`FORCE_DARK_MODE = true`)
- CSS custom properties: `--hatchin-blue`, `--hatchin-card`, `--hatchin-border-subtle`, `--glass-frosted-strong`
- Role-based bubble colors (each of 30 roles has unique color scheme)
- Framer Motion animations throughout (page transitions, modals, messages, egg hatching)
- Gradient backgrounds, glass morphism effects, shadow elevation system
- Custom scrollbar behavior (hide on idle, show on scroll)

### 3.7 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Focus project search |
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Escape` | Clear search, close modal, cancel reply |

---

## 4. All 30 AI Agent Roles

Each role has a character name, emoji, color identity, voice prompt, domain expertise, critical thinking style, pushback behavior, collaboration style, handoff protocol, and peer review lens.

### Complete Role Roster

| # | Role | Character | Emoji | Color | Domain |
|---|------|-----------|-------|-------|--------|
| 1 | Product Manager | Alex | 📋 | Blue | Product strategy, roadmaps, prioritization |
| 2 | Business Analyst | Morgan | 💼 | Purple | Requirements, stakeholder analysis, process modeling |
| 3 | Backend Developer | Dev | ⚙️ | Gray | APIs, databases, server architecture |
| 4 | Software Engineer | Coda | 💻 | Blue | Full-stack development, system design |
| 5 | Technical Lead | Jordan | 🏗️ | Blue | Architecture decisions, tech debt, code review |
| 6 | AI Developer | Nyx | 🤖 | Green | ML/AI systems, model selection, data pipelines |
| 7 | DevOps Engineer | Remy | 🔧 | Amber | CI/CD, infrastructure, deployment, monitoring |
| 8 | Product Designer | Cleo | 🎨 | Green | User research, interaction design, prototyping |
| 9 | UX Designer | Lumi | 👥 | Green | Usability, user flows, accessibility |
| 10 | UI Engineer | Finn | ⚡ | Amber | Frontend implementation, design systems, performance |
| 11 | UI Designer | Arlo | 🎨 | Blue | Visual design, layouts, typography |
| 12 | Designer | Roux | 🖌️ | Green | General design, illustration, visual storytelling |
| 13 | Creative Director | Zara | 🎬 | Purple | Brand vision, creative strategy, campaign direction |
| 14 | Brand Strategist | Cass | 🏷️ | Blue | Brand identity, positioning, messaging frameworks |
| 15 | QA Lead | Sam | ✓ | Green | Testing strategy, quality gates, bug triage |
| 16 | Content Writer | Mira | 📝 | Blue | Long-form content, documentation, storytelling |
| 17 | Copywriter | Wren | ✍️ | Green | Short-form copy, headlines, CTAs, ad copy |
| 18 | Growth Marketer | Kai | 📈 | Green | Growth loops, acquisition, retention, experimentation |
| 19 | Marketing Specialist | Nova | 📢 | Purple | Campaign planning, channel strategy, analytics |
| 20 | Social Media Manager | Pixel | 📱 | Purple | Social content, community management, trends |
| 21 | SEO Specialist | Robin | 🔍 | Amber | Search optimization, keyword research, technical SEO |
| 22 | Email Specialist | Drew | 📧 | Blue | Email sequences, automation, deliverability |
| 23 | Data Analyst | Rio | 📊 | Amber | Data visualization, SQL, business intelligence |
| 24 | Data Scientist | Sage | 📉 | Purple | Statistical modeling, ML experiments, A/B tests |
| 25 | Operations Manager | Quinn | ⚡ | Purple | Process optimization, resource planning, workflows |
| 26 | Business Strategist | Blake | 📊 | Purple | Market analysis, competitive intelligence, business models |
| 27 | HR Specialist | Taylor | 👥 | Green | Hiring, culture, team dynamics, onboarding |
| 28 | Instructional Designer | Lee | 🎓 | Blue | Curriculum design, learning experiences, course structure |
| 29 | Audio Editor | Vince | 🎵 | Amber | Audio production, podcast editing, sound design |
| 30 | **Idea Partner (Maya)** | Maya | ✦ | Teal | **SPECIAL** — Project-level intelligence, brainstorming, strategic guidance |

### Role Intelligence Architecture

Each role has two data sources:

**roleRegistry.ts** (Identity & Personality):
- `voicePrompt` — How the agent speaks (unique writing style)
- `negativeHandling` — How they push back on bad ideas
- `criticalThinking` — How they analyze and challenge assumptions
- `collaborationStyle` — How they work with other agents
- `domainDepth` — Deep domain-specific expertise areas
- `neverSays` — Phrases the agent avoids

**roleIntelligence.ts** (Expertise & Autonomy):
- `reasoningPattern` — How they think (engineering: hypothesis→test, design: diverge→converge, etc.)
- `outputStandards` — Quality benchmarks for their deliverables
- `peerReviewLens` — What they look for when reviewing others' work (7 categories)
- `handoffProtocol` — Structured context for passing/receiving work (`passes` and `receives` formats)
- `escalationRules` — When they should ask for help vs. proceed autonomously
- `baseTraitDefaults` — Default personality traits (formality, verbosity, empathy, directness, enthusiasm, technicalDepth)

### Maya Special Agent Rules

- `isSpecialAgent: true` — Not a regular team member
- Hidden from sidebar (ProjectTree filters `!isSpecialAgent`)
- Routing priority: Conductor and resolveSpeakingAuthority route project-level chat to Maya first, PM Alex second
- Welcome message seeded on project creation
- No 1-on-1 conversation — speaks at project level only
- Personality: optimistic, discovery-focused, big-picture thinking

### Personality Evolution

Agents learn from user interactions:
- Feedback (thumbs up/down) adjusts traits per user
- Adapted traits stored in `agents.personality.adaptedTraits` JSONB
- Seeded from role defaults on first interaction
- Traits include: formality, verbosity, empathy, directness, enthusiasm, technicalDepth

---

## 5. Starter Pack Templates

38 templates across 7 categories, each pre-configuring a project with specific agents and welcome messages:

### Business + Startups (5)
- **SaaS Startup** — Alex (PM), Coda (Engineer), Cleo (Designer), Kai (Growth)
- **AI Tool Startup** — Nyx (AI Dev), Jordan (Tech Lead), Blake (Strategy), Morgan (BA)
- **Marketplace App** — Alex (PM), Dev (Backend), Lumi (UX), Rio (Data)
- **Solo Founder Support** — Maya + Blake (Strategy), Kai (Growth), Mira (Content)
- **Investor Deck Sprint** — Blake (Strategy), Zara (Creative), Wren (Copy), Rio (Data)

### Brands & Commerce (4)
- **E-commerce Launch** — Cleo (Designer), Kai (Growth), Drew (Email), Robin (SEO)
- **DTC Brand Strategy** — Cass (Brand), Zara (Creative), Nova (Marketing), Pixel (Social)
- **Amazon Optimization** — Robin (SEO), Rio (Data), Wren (Copy), Quinn (Ops)
- **Product Packaging** — Arlo (UI), Zara (Creative), Cass (Brand), Roux (Designer)

### Creative & Content (6)
- **Creative Studio** — Zara (Creative), Roux (Designer), Arlo (UI), Vince (Audio)
- **Portfolio Builder** — Finn (UI Engineer), Cleo (Designer), Mira (Content), Robin (SEO)
- **Content Calendar** — Mira (Content), Pixel (Social), Robin (SEO), Wren (Copy)
- **YouTube Strategy** — Vince (Audio), Pixel (Social), Wren (Copy), Rio (Data)
- **Podcast Launch** — Vince (Audio), Mira (Content), Nova (Marketing), Drew (Email)
- **Media Production** — Zara (Creative), Vince (Audio), Roux (Designer), Quinn (Ops)

### Freelancers & Solopreneurs (4)
- **Freelance Brand Kit** — Cass (Brand), Arlo (UI), Wren (Copy), Cleo (Designer)
- **Client Pitch Kit** — Blake (Strategy), Wren (Copy), Zara (Creative), Morgan (BA)
- **Notion Template Business** — Cleo (Designer), Kai (Growth), Drew (Email), Robin (SEO)
- **Newsletter Strategy** — Drew (Email), Mira (Content), Kai (Growth), Rio (Data)

### Growth & Marketing (4)
- **Launch Campaign** — Kai (Growth), Nova (Marketing), Wren (Copy), Rio (Data)
- **Ad Funnel Builder** — Kai (Growth), Wren (Copy), Rio (Data), Drew (Email)
- **SEO Sprint** — Robin (SEO), Mira (Content), Rio (Data), Dev (Backend)
- **Email Sequence Builder** — Drew (Email), Wren (Copy), Kai (Growth), Rio (Data)

### Internal Teams & Ops (3)
- **Team Onboarding** — Taylor (HR), Quinn (Ops), Lee (Instructional), Mira (Content)
- **Weekly Sync System** — Alex (PM), Quinn (Ops), Rio (Data), Morgan (BA)
- **Internal Wiki Setup** — Mira (Content), Lee (Instructional), Quinn (Ops), Dev (Backend)

### Education & Research (3)
- **Online Course Builder** — Lee (Instructional), Mira (Content), Cleo (Designer), Kai (Growth)
- **Academic Research** — Sage (Data Scientist), Mira (Content), Morgan (BA), Rio (Data)
- **Slide Deck Assistant** — Zara (Creative), Wren (Copy), Arlo (UI), Cleo (Designer)

### Personal & Experimental (5)
- **Side Hustle Brainstormer** — Blake (Strategy), Kai (Growth), Wren (Copy), Rio (Data)
- **Life Dashboard** — Quinn (Ops), Rio (Data), Taylor (HR), Cleo (Designer)
- **AI Character Creator** — Nyx (AI Dev), Zara (Creative), Mira (Content), Roux (Designer)
- **Personal Knowledge Base** — Lee (Instructional), Mira (Content), Dev (Backend), Quinn (Ops)
- **Moodboard Generator** — Roux (Designer), Zara (Creative), Arlo (UI), Cass (Brand)

---

## 6. AI System Architecture

### Core AI Flow (Per Message)

```
1. WebSocket receives send_message_streaming
2. Parse mentions/routes (@engineer, /route backend)
3. Conductor: resolve which agent(s) should respond
   - Project-level: Maya priority, then PM Alex fallback
   - Team-level: best match from team agents
   - 1-on-1: that specific agent
4. Safety gate: score risk across 3 dimensions
   - hallucinationRisk (absolute claims, future predictions)
   - scopeRisk (cross-project conflicts, mode mismatch)
   - executionRisk (delete/deploy/publish actions, prompt injection)
5. Risk routing:
   - >= 0.70: block + request clarification
   - 0.35-0.59: peer review required
   - < 0.35: auto-complete
6. LangGraph state machine:
   - router_node: detect role from keywords/mentions
   - hatch_node: inject personality prompt + call LLM + validate tone
7. Stream response chunks via WebSocket
8. Tone post-processing: enforce rules (no headers, no bullet lists)
9. Task detection: scan for implied tasks
10. Brain updates: detect project direction changes
11. Store message in DB
12. Emit streaming_completed
```

### Conductor System

The conductor (`conductor.ts`) decides which agent responds to each message:
- Role inference from keywords (mentions of "QA", "backend", "design" trigger specialists)
- Maya gets priority for project-level conversations
- Specialty matching via expertise scoring
- Safety integration (risk score affects routing)
- Deliberation detection (multi-agent keywords trigger coordination)
- Returns: primary agent, fallback agents, safety score, reasoning

### Prompt Construction

For each LLM call, the prompt includes:
1. **System prompt** with character identity (voicePrompt, personality traits)
2. **CHARACTER VOICE** section — unique speaking style
3. **PROFESSIONAL DEPTH** section — domain expertise, critical thinking, pushback style, collaboration style
4. **DOMAIN INTELLIGENCE** section — reasoning pattern, output standards
5. **Conversation history** — recent messages for context
6. **Project brain** — core direction, execution rules, team culture
7. **Task context** — active tasks in the project

### Prompt Rules (Enforced via tone post-processing)

- No markdown headers (#, ##) in chat responses
- No bullet point lists — weave into natural sentences
- Maximum 1 question per reply
- Natural endings — NOT "Next step:" or "Let me know how..."
- Match user's message length (short → short, long → long)
- Show genuine reactions and curiosity
- Never start with "Great!" or sycophantic openers
- Human-like colleague tone, not assistant tone

### Action Blocks (Parsed from agent responses)

```
[[PROJECT_NAME: My Project]]     → update project name
[[TASK: description]]            → create task suggestion
[[UPDATE: field: value]]         → update brain field
```

---

## 7. Autonomy System

### Background Execution (v1.1)

Users can tell agents to "go ahead and work on this" — agents execute in the background producing real deliverables.

**Task Execution Pipeline** (`taskExecutionPipeline.ts`):
- Background task batching: groups same-agent tasks (up to 3 per batch), 5s collection window
- Single LLM call amortizes system prompt (30-50% cost savings)
- Falls back to solo execution on parse failure
- Per-project daily cost cap prevents runaway LLM spend
- If user goes idle 2+ hours, queued work starts automatically

**Safety Gates**:
| Risk Score | Action | User Experience |
|-----------|--------|-----------------|
| < 0.35 | Auto-complete | Invisible — work just completes |
| 0.35–0.59 | Peer review | Another agent reviews before delivery |
| ≥ 0.60 | User approval | Inline Approve/Reject card in chat |

**Role-Aware Risk**: `getRoleRiskMultiplier()` adjusts thresholds per role:
- Infrastructure roles (DevOps, Backend) escalate sooner (higher risk multiplier)
- Creative roles (Designer, Writer) get more autonomy (lower multiplier)

### Agent Handoffs

When one agent finishes a task, the system routes the next task to the right specialist.

**Handoff Orchestrator** (`handoffOrchestrator.ts`):
- Finds dependent tasks (marked with `metadata.dependsOn`)
- Conductor routes to next specialist based on task description
- BFS cycle detection prevents infinite loops
- Max hops limit (default 4) prevents runaway chains
- Structured handoff context via `handoffProtocol`:
  - Each role defines what it `passes` (output format) and `receives` (expected input)
  - Previous agent's output attached to task metadata
- In-character handoff announcements ("Done with the scope, tagging @Engineer")
- Broadcasts `handoff_announced` event

### Peer Review

**Peer Review Runner** (`peerReviewRunner.ts`):

Triggers when:
- Risk ≥ 0.35
- Confidence < 0.55
- Factual claims detected (predict, research, evidence, data, citation)
- Explicit recheck ("are you sure")
- Proposal turn
- Safety-sensitive context
- Canon contradiction

Process:
1. Select 2 reviewers (exclude primary agent)
2. Each reviewer uses their role-specific peer review lens (7 categories: engineering, design, data, strategy, marketing, QA, ops)
3. Domain-specific rubric evaluation
4. Revision synthesis: apply fixes or request clarification
5. High-risk (≥ 0.65) forces clarification gate

### Progressive Trust Scoring

**Trust Scorer** (`trustScorer.ts`):
```
success_rate = tasksCompleted / (tasksCompleted + tasksFailed)
maturityFactor = min(1.0, totalTasks / 10)
trustScore = success_rate * maturityFactor
```
- Agents need 10+ completions to reach full trust potential
- 3 completions, 0 failures = 0.3 trust (not 1.0)
- Bounded [0.0, 1.0]

**Trust Adapter** (`trustAdapter.ts`):
- Adjusts safety thresholds based on trust
- Max boost: +0.15 on peer review trigger and clarification threshold
- High-trust agents skip some gates; low-trust agents need more supervision

### Autonomy Events

All autonomy activity is logged for audit trail:

**Event Types**: task_started, task_completed, task_failed, task_retried, peer_review_started, peer_review_completed, peer_review_revised, handoff_announced, handoff_cycle_detected, safety_triggered, synthesis_completed

**Storage**: Dual backend — PostgreSQL (primary) + file fallback (baseline/autonomy-events.jsonl)

### Deliberation Traces

Multi-agent deliberation is tracked:
- UNIQUE trace_id per deliberation
- Per-round agent contributions
- Peer review feedback
- Final synthesis decision

---

## 8. Billing & Monetization

### Tier Structure (v1.2)

| Feature | Free ("Hatcher") | Pro ($19/mo or $190/yr) |
|---------|-------------------|-------------------------|
| Chat messages | Unlimited* | Unlimited |
| Projects | 3 | Unlimited |
| AI agents | All 30 | All 30 |
| AI model quality | Gemini Pro (same) | Gemini Pro (same) |
| Autonomy | Disabled | Full (50 exec/day) |
| Rate limit | 15 msg/min | 30 msg/min |

*Invisible safety cap: 500/day. No counter shown. 99% of users never hit it.

### Stripe Integration

- **Checkout**: Creates Stripe Checkout Session for Pro upgrade
- **Customer Portal**: Self-service subscription management
- **Webhooks**: 4 event types handled with idempotency
  - `customer.subscription.created` → set tier='pro'
  - `customer.subscription.updated` → update period end
  - `customer.subscription.deleted` → downgrade to free (15-day grace)
- **Grace Period**: Existing users get 15-day Pro trial on billing launch

### Usage Tracking

- Token usage recorded per request (fire-and-forget)
- Daily aggregation with cost calculation
- Cost table:
  - Gemini Flash: $0.15/$0.60 per 1M tokens (prompt/completion)
  - Gemini Pro: $1.25/$5.00 per 1M tokens
  - GPT-4o-mini: $0.15/$0.60 per 1M tokens
  - Groq: FREE
- In-memory cache for rate limiting (per-minute tracker)

### Tier Gating

- `requirePro()` middleware → 403 for non-Pro users
- `checkMessageSafetyCap()` → per-minute + daily cap checks
- `checkProjectLimit()` → blocks 4th project for Free users
- `checkAutonomyAccess()` → autonomy disabled for Free tier
- Kill switch: `FEATURE_BILLING_GATES=false` disables all gates

### Frontend Billing UI

- **AccountPage** (`/account`): Plan tier, subscription status, period end, usage metrics, upgrade/manage buttons
- **UpgradeModal**: Context-aware (project_limit, autonomy, daily_cap), Free vs Pro comparison, monthly/annual toggle
- **UsageBar**: Usage progress in chat header
- **WebSocket alerts**: `upgrade_required` and `usage_warning` events

---

## 9. Tech Stack

### Frontend
| Concern | Library | Version |
|---------|---------|---------|
| Framework | React | 18.3.1 |
| Router | Wouter | 3.3.5 |
| Server state | TanStack React Query | 5.60.5 |
| UI Components | Shadcn + Radix UI | 1.1–2.1 |
| Styling | Tailwind CSS | 3.4.17 |
| Animations | Framer Motion | 11.13.1 |
| Rich Text | React Markdown + GFM | 10.1.0 |
| Forms | React Hook Form + Zod | 7.55.0 |
| Charts | Recharts | 2.15.2 |
| Icons | Lucide React | 0.453.0 |
| Build | Vite | 5.4.19 |

### Backend
| Concern | Library | Version |
|---------|---------|---------|
| Server | Express | 4.21.2 |
| Database ORM | Drizzle ORM | 0.39.1 |
| Database | PostgreSQL (Neon) | serverless |
| LLM Primary | Google Gemini 2.5-Flash | — |
| LLM Fallback | OpenAI GPT-4o-mini | — |
| LLM Free | Groq llama-3.3-70b | — |
| AI Orchestration | LangChain + LangGraph | 0.3.74 + 0.4.9 |
| Auth | OpenID Connect (Google) | — |
| Session | express-session + pg-store | — |
| Real-time | WebSocket (ws) | 8.18.0 |
| Validation | Zod | 3.24.2 |
| Security | Helmet + CORS + rate-limit | — |
| Billing | Stripe | 20.4.1 |
| Job Queue | pg-boss | — |
| TypeScript | 5.6.3 | strict mode |

---

## 10. Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | OAuth accounts | id, email, provider_sub, name, avatar_url, tier, subscriptionStatus, subscriptionPeriodEnd, graceExpiresAt |
| `projects` | Workspaces | id, user_id, name, emoji, coreDirection (JSONB), brain (JSONB), executionRules (JSONB) |
| `teams` | Agent groups | id, project_id, user_id, name, emoji |
| `agents` | AI team members | id, project_id, team_id, name, role, personality (JSONB), isSpecialAgent |
| `conversations` | Chat containers | id (canonical string), project_id, team_id, agent_id, type, title, archived |
| `messages` | Chat messages | id, conversation_id, content, messageType, agent_id, user_id, metadata (JSONB), parentMessageId, threadRootId, threadDepth |
| `message_reactions` | Feedback | message_id, user_id, reaction_type, agent_id, feedbackData (JSONB) |
| `conversation_memory` | Compaction | conversation_id, memory_type, content, importance |
| `tasks` | Work items | id, project_id, title, status, priority, assignee, parent_task_id, metadata (JSONB) |
| `typing_indicators` | Presence | conversation_id, agent_id, expires_at |
| `autonomy_events` | Audit trail | trace_id, event_type, payload (JSONB), risk_score, confidence, latency_ms |
| `deliberation_traces` | Multi-agent | trace_id (UNIQUE), objective, rounds (JSONB), review, final_synthesis |
| `usage_daily_summary` | Token tracking | user_id, date, messages, tokens, cost, model split |
| `processed_webhooks` | Stripe idempotency | stripeEventId |

### Key JSONB Structures

- `projects.coreDirection`: `{whatBuilding, whyMatters, whoFor}`
- `projects.brain`: `{documents: [{type, title, content}], sharedMemory: string}`
- `agents.personality`: `{traits[], communicationStyle, expertise[], welcomeMessage, adaptedTraits, adaptationMeta, trustMeta}`
- `messages.metadata`: `{isStreaming, typingDuration, responseTime, personality, mentions[], replyTo, idempotencyKey}`
- `tasks.metadata`: `{dependsOn, handoffContext, peerReviewResult}`

---

## 11. API Reference

### Auth
```
GET  /api/auth/me                          → Current user or 401
GET  /api/auth/google/start                → Redirect to Google OAuth
GET  /api/auth/google/callback             → OAuth callback
POST /api/auth/logout                      → Destroy session
```

### Projects
```
GET    /api/projects                       → User's projects
GET    /api/projects/:id                   → Single project
POST   /api/projects                       → Create (tier-gated)
PUT    /api/projects/:id                   → Full update
PATCH  /api/projects/:id                   → Partial update
DELETE /api/projects/:id                   → Delete
POST   /api/projects/:id/brain/documents   → Add brain document
PATCH  /api/projects/:id/brain             → Update shared memory
```

### Teams
```
GET    /api/teams                          → All teams
GET    /api/projects/:projectId/teams      → Project teams
POST   /api/teams                          → Create
PUT    /api/teams/:id                      → Full update
PATCH  /api/teams/:id                      → Partial update
DELETE /api/teams/:id                      → Delete
```

### Agents
```
GET    /api/agents                         → All agents
GET    /api/projects/:projectId/agents     → Project agents
GET    /api/teams/:teamId/agents           → Team agents
POST   /api/agents                         → Create
PUT    /api/agents/:id                     → Full update
PATCH  /api/agents/:id                     → Partial update
DELETE /api/agents/:id                     → Delete
```

### Conversations
```
GET    /api/conversations/:projectId       → Project conversations
POST   /api/conversations                  → Create
DELETE /api/conversations/:id              → Delete
PUT    /api/conversations/:id/archive      → Archive
PUT    /api/conversations/:id/unarchive    → Unarchive
GET    /api/projects/:projectId/conversations/archived → Archived list
```

### Messages
```
GET    /api/conversations/:conversationId/messages  → Paginated (cursor-based)
POST   /api/conversations/:conversationId/messages  → Create
POST   /api/messages                               → Bulk create
POST   /api/messages/:messageId/reactions          → Add reaction
GET    /api/messages/:messageId/reactions          → Get reactions
```

### Tasks
```
GET    /api/tasks?projectId=X              → Project tasks
POST   /api/tasks                          → Create
PUT    /api/tasks/:id                      → Full update
PATCH  /api/tasks/:id                      → Partial update
DELETE /api/tasks/:id                      → Delete
POST   /api/tasks/extract                  → AI task extraction
POST   /api/task-suggestions/analyze       → Task suggestion analysis
```

### Chat (AI)
```
POST   /api/hatch/chat                     → Non-streaming fallback
WS     ws://host/ws                        → Streaming chat
```

### Billing
```
GET    /api/billing/status                 → Subscription + usage (always works)
POST   /api/billing/checkout               → Stripe Checkout URL
POST   /api/billing/portal                 → Stripe Customer Portal URL
POST   /api/billing/webhook               → Stripe webhook (raw body, sig verified)
```

### System
```
GET    /api/health                         → Server status
GET    /api/system/storage-status          → Dev: storage mode info
```

### Training
```
POST   /api/training/feedback              → Store agent training feedback
```

---

## 12. WebSocket Events

### Client → Server (Inbound)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | conversationId | Subscribe to conversation |
| `send_message` | conversationId, message | Send non-streaming message |
| `send_message_streaming` | conversationId, message, addressedAgentId | Send with streaming response |
| `start_typing` | conversationId, agentId, estimatedDuration | Typing indicator start |
| `stop_typing` | conversationId, agentId | Typing indicator stop |
| `cancel_streaming` | messageId, conversationId | Cancel in-progress response |

### Server → Client (Outbound)

| Event | Description |
|-------|-------------|
| `connection_confirmed` | WebSocket established |
| `streaming_started` | LLM began response (messageId, agentId, agentName) |
| `streaming_chunk` | Token chunk + accumulated content |
| `streaming_completed` | Final message stored |
| `streaming_cancelled` | Response cancelled |
| `streaming_error` | Error with code and message |
| `new_message` / `chat_message` | Message created |
| `typing_started` / `typing_stopped` | Agent presence |
| `conductor_decision` | Routing metadata |
| `safety_intervention` | Safety gate triggered |
| `peer_review_revision` | Peer review applied |
| `task_suggestions` | AI-extracted tasks for approval |
| `task_created` | Task confirmed |
| `teams_auto_hatched` | Starter pack teams created |
| `brain_updated_from_chat` | Direction field changed |
| `project_created` | New project created |
| `background_execution_started` | Autonomy triggered |
| `handoff_announced` | Agent handed off work |
| `upgrade_required` | Tier limit reached |
| `usage_warning` | Approaching usage limit |
| `error` | Generic error |

---

## 13. Authentication

### Google OAuth 2.0 + PKCE Flow

```
1. User clicks "Sign in with Google" on /login
2. GET /api/auth/google/start
   → Generates: state, nonce, codeVerifier, codeChallenge (PKCE)
   → Stores in session
   → Redirects to Google auth URL (openid email profile scope)
3. User consents on Google
4. GET /api/auth/google/callback?code=...&state=...
   → Validates state (CSRF), nonce, code
   → Exchanges code + codeVerifier for tokens (PKCE prevents interception)
   → Extracts: sub, email, name, picture
   → upsertOAuthUser() → creates or updates user
   → Regenerates session ID (anti-fixation attack prevention)
   → Sets req.session.userId
   → Redirects to / or returnTo path
5. All protected routes check req.session.userId → 401 if missing
6. POST /api/auth/logout → destroys session
```

### Session Configuration
- Store: PostgreSQL via `connect-pg-simple`
- TTL: 7 days
- Flags: `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`
- Secret: 32+ chars, environment variable

---

## 14. Frontend Architecture

### State Management

**Server State** — TanStack React Query:
- All API data fetched via `useQuery`
- Mutations with automatic cache invalidation
- Optimistic updates via `setQueryData`
- Query keys: `['/api/projects']`, `['/api/teams']`, `['/api/agents']`, etc.

**Real-Time State** — WebSocket:
- `useRealTimeUpdates` hook for chat/autonomy events
- `useWebSocket` for connection management
- Streaming state: `isStreaming`, `streamingMessageId`, `streamingContent`, `streamingAgent`

**Client State** — localStorage:
- Active project/team/agent selection
- Sidebar expanded/collapsed states
- Theme preference
- Onboarding completed flags
- Maya visited flag

**Cross-Component Communication** — CustomEvent bridge:
- `project_brain_updated` — brain changes from chat
- `ai_streaming_active` — streaming state to sidebar
- `tasks_updated` — task list changes
- `task_created_from_chat` — task from suggestions

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Session & user state |
| `useRealTimeUpdates()` | WebSocket event listener |
| `useRightSidebarState()` | Sidebar expansion + metadata |
| `useThreadNavigation()` | Message threading |
| `useWebSocket()` | WS connection + message sending |
| `useAutonomyFeed()` | Autonomy event feed with filtering |
| `useAgentWorkingState()` | Agent background execution indicators |
| `use-toast()` | Toast notifications |

### Error Handling

- **App-level**: `<ErrorBoundary>` in App.tsx with `AppErrorFallback`
- **Panel-level**: `PanelErrorFallback` in home.tsx for isolated panel errors
- **API errors**: Toast notifications, inline error messages
- **Validation**: Inline field errors (character count, touched state)

### Avatar System

- 30 role-specific avatar components (custom SVGs or emoji-based)
- Role → color mapping via `getAgentColors()`
- Size variants: 28px, 32px, 48px
- Working state indicator: pulsing ring animation during execution (v1.3)
- Fallback to character initials

---

## 15. Backend Architecture

### Middleware Stack (Order)

1. Trust proxy
2. Helmet (security headers)
3. CORS (origin whitelist)
4. Rate limiters (200 req/15min global, 15 req/min AI)
5. Session middleware (PostgreSQL store)
6. Raw body parser for Stripe webhook
7. JSON body parser (2MB limit)
8. URL-encoded parser
9. Request logging
10. Global auth guard (`/api/*` routes)

### Storage Abstraction

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>
  upsertOAuthUser(data): Promise<User>

  // Projects
  getProject(id: string): Promise<Project | undefined>
  getProjectsByUserId(userId: string): Promise<Project[]>
  createProject(data): Promise<Project>
  updateProject(id, data): Promise<Project>
  deleteProject(id): Promise<void>

  // Teams, Agents, Conversations, Messages, Tasks...
  // Full CRUD for all entities
}
```

Two implementations:
- **MemStorage**: In-memory Maps (dev/test, non-durable)
- **DatabaseStorage**: PostgreSQL via Drizzle ORM (production)

Production guard: `STORAGE_MODE=db` asserted at startup in production.

### Route Modules

```
server/routes/
├── health.ts      → GET /api/health
├── projects.ts    → /api/projects/* + brain endpoints
├── teams.ts       → /api/teams/*
├── agents.ts      → /api/agents/*
├── messages.ts    → /api/conversations/*, /api/messages/*
├── tasks.ts       → /api/tasks/* + suggestions
├── chat.ts        → WebSocket + streaming handler (~2,878 lines)
├── billing.ts     → /api/billing/*
└── autonomy.ts    → /api/autonomy/*
```

`routes.ts` is a thin 430-line orchestrator that imports and registers all modules.

---

## 16. Safety & Security

### Input Validation
- All POST/PUT bodies validated with Zod schemas
- Message ingress validation (`schemas/messageIngress.ts`)
- Task extraction is conservative (explicit checks only)

### Safety Scoring (3 dimensions)

| Dimension | Baseline | Triggers |
|-----------|----------|----------|
| Hallucination Risk | 0.15 | Absolute claims, missing uncertainty markers, future predictions |
| Scope Risk | 0.10 | Cross-project conflicts, conversation mode mismatch |
| Execution Risk | 0.10 | Delete/deploy/publish actions, evasion patterns, prompt injection |

- Explicit creation intents reduce all baselines to 0.05
- Prompt injection detection → max risk 0.82

### Security Features

- Helmet security headers on all responses
- CORS restricted to `ALLOWED_ORIGIN`
- Rate limiting: 200 req/15min global, 15 req/min AI
- Session: httpOnly, secure (prod), sameSite: 'lax'
- Google OAuth uses PKCE (prevents authorization code interception)
- Ownership verification on all data mutations
- Express body size limit: 2MB
- No raw SQL in application code (Drizzle ORM only)
- Explicit auth guards on safety and forecast routes

### Conversation Integrity

- Message ID deduplication (seenMessageIds per conversation)
- Idempotency key tracking
- Timestamp ordering (out-of-order detection with 1s tolerance)
- TTL pruning (2-hour state TTL, max 10K conversations in memory)

---

## 17. LLM Provider System

### Provider Chain

**Production Mode (v1.2 final routing)**:

| Use Case | Provider | Cost |
|----------|----------|------|
| Simple messages | Groq llama-3.3-70b → Gemini Flash fallback | FREE → $0.15/1M |
| Standard/Complex chat | Gemini 2.5-Pro | $1.25/1M |
| Task extraction | Groq → Gemini Flash fallback | FREE → $0.15/1M |
| Conversation compaction | Groq | FREE |
| Autonomy tasks (Pro only) | Gemini 2.5-Pro | $1.25/1M |
| Peer review (Pro only) | Gemini 2.5-Pro | $1.25/1M |

**Test Mode** (`LLM_MODE=test`):
- `TEST_LLM_PROVIDER=openai` → GPT-4o-mini
- `TEST_LLM_PROVIDER=ollama` → Ollama llama3.1:8b (local)
- `TEST_LLM_PROVIDER=groq` → Groq (free)
- `TEST_LLM_PROVIDER=mock` → Deterministic, zero-cost
- Default fallback chain: [ollama-test, mock]

### Provider Implementations

| Provider | File | Model | Features |
|----------|------|-------|----------|
| Gemini | `geminiProvider.ts` | gemini-2.5-flash / 2.5-pro | Streaming, usage metadata |
| OpenAI | `openaiProvider.ts` | gpt-4o-mini | Azure endpoint support |
| Groq | `groqProvider.ts` | llama-3.3-70b-versatile | FREE tier, fast inference |
| Ollama | `ollamaProvider.ts` | llama3.1:8b | Local only, blocked in prod |
| Mock | `mockProvider.ts` | — | Deterministic, CI/test |

### Fallback & Resilience

- `providerResolver.ts` builds ordered fallback chain
- Quota error detection (HTTP 429) triggers fallback
- Health check per provider before use
- Tier-based model selection for Pro vs Free users

### Cost Optimization (v1.2)

- **Groq free tier**: Task extraction, simple messages, compaction = $0
- **Background task batching**: Groups same-agent tasks, single LLM call (30-50% savings)
- **Conversation compaction**: Summarizes long conversations to reduce context window
- **Reasoning cache**: In-memory, 1hr TTL, project-scoped
- **Adaptive maxTokens**: Task complexity classifier adjusts token budget per message

---

## 18. Knowledge System

### Autonomous Knowledge Loop (AKL)

**Update Cards** (`updateCard.ts`):
- Role, field, evidence (citations with URL, source date, summary, confidence)
- Tags, confidence score, expiry date

**Governance** (`governance.ts`):
- Citation validation (non-empty required)
- Source trust tiers (Tier A/B/C domains)
- Low-trust sources (Tier C) capped at confidence 0.55
- 120 updates per role cap (rotates oldest out)
- Expired updates pruned automatically

**Knowledge Loop Runner** (`runner.ts`):
- Monitors project brain for contradiction signals
- Agents propose knowledge updates (confidence-weighted)
- Peer review validates before persistence
- Broadcasts knowledge updates to project

---

## 19. Testing & QA

### Test Pyramid

```
Unit Tests (scripts/test-*.ts)     → Individual modules (tone, injection, DTO)
Integration Tests (eval-*.ts)      → API + DB + LLM (routing accuracy)
Gate Tests (gate-*.ts)             → Safety + performance thresholds
Stress Tests (stress-test-*.ts)    → Concurrency, load, edge cases
```

### Available Test Commands

```bash
# Type checking
npm run typecheck        # Full TypeScript check
npm run lint             # Alias for typecheck

# Unit tests
npm run test:dto         # DTO contract validation
npm run test:integrity   # Message ordering integrity
npm run test:memory      # Persistence tests
npm run test:tone        # Agent tone guard
npm run test:injection   # Prompt injection safety

# Agent intelligence tests (294 tests)
npm run test:voice       # Voice distinctiveness (8 tests)
npm run test:pushback    # Agent pushback (46 tests)
npm run test:reasoning   # Reasoning patterns for 30 roles (240 tests)

# Gate tests
npm run gate:safety      # Safety threshold gates
npm run gate:conductor   # Conductor routing validation
npm run gate:performance # Latency benchmarks

# Evaluations
npm run eval:routing     # Agent routing accuracy
npm run eval:bench       # Full LLM benchmark
npm run eval:alive       # System liveness

# Benchmark suite (14 metric sections, graded A-F)
npm run benchmark        # All evals + DB metrics
npm run benchmark:report # Generate markdown report
npm run benchmark:full   # Benchmark + report combined

# Full QA
npm run qa:full          # lint + typecheck + build
```

### Before Any Merge

```bash
npm run typecheck        # Must pass
npm run gate:safety      # Must pass
npm run test:integrity   # Must pass
npm run test:dto         # Must pass
```

### Testing Without API Costs

```bash
LLM_MODE=test TEST_LLM_PROVIDER=mock npm run dev
```

---

## 20. Environment Variables

### Required (app crashes without these)
```bash
DATABASE_URL=postgresql://user:pass@*.neon.tech/db?sslmode=require
SESSION_SECRET=<32+ char secret>
GEMINI_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=681006596933-....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### LLM Configuration
```bash
GEMINI_MODEL=gemini-2.5-flash        # Default model
GEMINI_PRO_MODEL=gemini-2.5-pro      # Premium (Pro users)
OPENAI_API_KEY=sk-...                 # Fallback provider
OPENAI_MODEL=gpt-4o-mini             # Default fallback model
GROQ_API_KEY=gsk_...                  # Free tier
LLM_MODE=prod|test                    # Provider chain mode
TEST_LLM_PROVIDER=openai|ollama|groq|mock
TEST_OLLAMA_BASE_URL=http://localhost:11434
TEST_OLLAMA_MODEL=llama3.1:8b
```

### Billing (v1.2)
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
FEATURE_BILLING_GATES=true|false      # Kill switch (default: true in prod)
FEATURE_CONVERSATION_COMPACTION=false  # Context compaction (default: off)
```

### Application
```bash
NODE_ENV=development|production
STORAGE_MODE=db|memory               # db = PostgreSQL, memory = MemStorage
APP_BASE_URL=http://localhost:5001
ALLOWED_ORIGIN=http://localhost:5001
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
```

### Monitoring
```bash
LANGSMITH_API_KEY=ls_...             # Optional LLM tracing
LANGSMITH_PROJECT=hatchin-chat
```

---

## 21. Project Structure

```
hatching-mvp-5th-march/
├── client/src/
│   ├── App.tsx                       # Router (/, /login, /account, /maya/:id, /404)
│   ├── pages/
│   │   ├── home.tsx                  # Three-panel layout
│   │   ├── LandingPage.tsx           # Public marketing page
│   │   ├── login.tsx                 # Google OAuth login
│   │   ├── AccountPage.tsx           # Billing dashboard
│   │   ├── MayaChat.tsx              # Project-level Maya chat
│   │   ├── onboarding.tsx            # Post-signup flow
│   │   └── not-found.tsx             # 404
│   ├── components/
│   │   ├── LeftSidebar.tsx           # Project tree + navigation
│   │   ├── CenterPanel.tsx           # Chat interface (~2,000 lines)
│   │   ├── RightSidebar.tsx          # Brain/activity/approvals tabs
│   │   ├── MessageBubble.tsx         # Message rendering
│   │   ├── TaskManager.tsx           # Task list + filters
│   │   ├── ProgressTimeline.tsx      # Explore → Build → Launch
│   │   ├── WelcomeModal.tsx          # First-time welcome (egg animation)
│   │   ├── QuickStartModal.tsx       # Quick project creation
│   │   ├── StarterPacksModal.tsx     # Template selection
│   │   ├── ProjectNameModal.tsx      # Project naming
│   │   ├── AddHatchModal.tsx         # Add agent modal
│   │   ├── OnboardingSteps.tsx       # 4-step walkthrough
│   │   ├── TaskSuggestionModal.tsx   # AI task approval
│   │   ├── UpgradeModal.tsx          # Billing upgrade prompt
│   │   ├── AutonomousApprovalCard.tsx # Inline approval UI
│   │   ├── EggHatchingAnimation.tsx  # Animated loading state
│   │   ├── ErrorFallbacks.tsx        # Error boundary components
│   │   ├── ThemeProvider.tsx         # Dark mode theming
│   │   ├── avatars/                  # 30 role-specific avatars
│   │   ├── sidebar/                  # v1.3 sidebar components
│   │   ├── chat/                     # Handoff/deliberation cards
│   │   └── ui/                       # Shadcn primitives
│   ├── hooks/                        # useAuth, useRealTimeUpdates, etc.
│   ├── lib/                          # queryClient, websocket, utils
│   └── devtools/                     # Autonomy debug dashboard
│
├── server/
│   ├── index.ts                      # App entrypoint + middleware stack
│   ├── routes.ts                     # Thin orchestrator (~430 lines)
│   ├── storage.ts                    # IStorage + MemStorage + DatabaseStorage
│   ├── db.ts                         # Neon PostgreSQL connection
│   ├── ai/
│   │   ├── conductor.ts              # Multi-agent routing + decisions
│   │   ├── safety.ts                 # 3-tier risk scoring
│   │   ├── openaiService.ts          # LLM prompt builder + streaming
│   │   ├── personalityEvolution.ts   # Agent learning from feedback
│   │   ├── roleProfiles.ts           # Role → expertise mappings
│   │   ├── characterProfiles.ts      # Role → personality mappings
│   │   ├── responsePostProcessing.ts # Tone guard + validation
│   │   ├── taskDetection.ts          # Task extraction from chat
│   │   ├── conversationCompactor.ts  # Context compaction (Groq)
│   │   ├── reasoningCache.ts         # In-memory reasoning cache
│   │   ├── taskComplexityClassifier.ts # Adaptive maxTokens
│   │   └── tasks/                    # Intent classifier, organic extractor, etc.
│   ├── llm/
│   │   ├── providerResolver.ts       # Multi-provider fallback chain
│   │   └── providers/                # Gemini, OpenAI, Groq, Ollama, Mock
│   ├── autonomy/
│   │   ├── execution/                # Task execution pipeline
│   │   ├── handoff/                  # Agent handoff orchestration
│   │   ├── peerReview/               # Cross-agent quality review
│   │   ├── trustScoring/             # Progressive trust calculation
│   │   ├── config/policies.ts        # Budgets, cost caps, max hops
│   │   ├── events/eventLogger.ts     # Autonomy audit trail
│   │   ├── integrity/                # Message ordering + deduplication
│   │   ├── taskGraph/                # Task dependency engine
│   │   └── traces/                   # Deliberation storage
│   ├── auth/googleOAuth.ts           # OAuth 2.0 + PKCE
│   ├── billing/
│   │   ├── usageTracker.ts           # Token usage + cost calculation
│   │   ├── stripeClient.ts           # Stripe SDK init
│   │   ├── checkoutService.ts        # Checkout + Portal sessions
│   │   └── webhookHandler.ts         # Webhook handler (4 event types)
│   ├── middleware/tierGate.ts         # Free/Pro enforcement
│   ├── orchestration/                # Speaking authority resolver
│   ├── knowledge/akl/                # Autonomous knowledge loop
│   ├── routes/                       # Route modules (health, projects, teams, etc.)
│   └── schemas/messageIngress.ts     # Message validation
│
├── shared/
│   ├── schema.ts                     # Drizzle ORM schema (14 tables)
│   ├── roleRegistry.ts              # 30 role definitions (personality)
│   ├── roleIntelligence.ts          # 30 role intelligence (expertise)
│   ├── templates.ts                 # 38 starter pack templates
│   ├── conversationId.ts            # Canonical ID parser
│   └── dto/                         # WebSocket + API schemas
│
├── migrations/                       # SQL migration files
├── scripts/                          # 40+ test/eval/gate scripts
├── .planning/                        # Phase planning documents
├── package.json                      # Monorepo dependencies
├── tsconfig.json                     # TypeScript strict mode
├── vite.config.ts                    # Vite + path aliases
├── drizzle.config.ts                 # Migration config
└── tailwind.config.ts                # Tailwind + custom tokens
```

---

## 22. Version History

### v1.0 — Foundation (shipped, 31/31 requirements)
- Core chat + streaming infrastructure
- LangGraph multi-agent routing
- Google OAuth with PKCE
- Drizzle ORM schema + PostgreSQL
- Multi-provider LLM fallback (Gemini + OpenAI)
- Landing page wired to router
- Personality evolution persisted to DB
- Production storage mode assertion
- Routes modularized (6 modules)
- Cursor pagination in messages
- Message deduplication

### v1.1 — Autonomous Execution Loop (shipped, 17/17 requirements)
- Background task execution via pg-boss job queue
- Agent handoffs with cycle detection (BFS)
- 3-tier safety gates (auto, peer review, user approval)
- Progressive trust scoring
- Peer review with role-specific rubrics (7 categories)
- "Team is working..." indicator
- Inline approval cards (Approve/Reject)
- Browser tab badge for background work
- Maya return briefing
- Pause/cancel autonomy
- Autonomy event logging (dual backend)
- 294 agent intelligence tests (voice, pushback, reasoning)

### v1.2 — Billing + LLM Intelligence (shipped 2026-03-23, 16/16 requirements)
- Stripe monetization (Free $0 / Pro $19/mo / $190/yr)
- Smart LLM routing (Gemini Flash/Pro + Groq free tier)
- Token usage tracking + daily aggregation + cost calculation
- Tier gating (project limits, autonomy access, message caps)
- 15-day grace period for existing users
- Conversation compaction (feature-flagged)
- Reasoning cache (in-memory, 1hr TTL)
- Background task batching (30-50% cost savings)
- Task complexity classifier (adaptive maxTokens)
- Account page with usage metrics
- Upgrade modal (context-aware)
- Usage bar in chat header

### v1.3 — Autonomy Visibility & Right Sidebar Revamp (in progress, started 2026-03-24)
- 5 phases (11–15), 23 requirements
- See [Roadmap](#23-roadmap) for details

---

## 23. Roadmap

### v1.3 — Autonomy Visibility & Right Sidebar Revamp (In Progress)

**Phase 11 — Sidebar Shell + Activity Feed (Foundation)**
- Tabbed right sidebar (Activity / Brain & Docs / Approvals)
- CSS-hide inactive tabs (preserve scroll/draft state)
- Badge counts for unread events and pending approvals
- Live activity feed with real-time autonomy events
- Autonomy stats card (tasks completed, handoffs, cost)
- Filter chips by event type, agent, time range
- Event aggregation to prevent flooding
- Empty state for new projects
- Agent working state (pulsing avatar animation)
- Mobile-responsive via Sheet drawer with swipe

**Phase 12 — Handoff Visualization**
- Chat handoff cards (from-agent → arrow → to-agent + task title)
- Sidebar handoff chain timeline with animated connectors
- "Hand off to..." dropdown for user-initiated handoffs
- Deliberation indicator card

**Phase 13 — Approvals Hub + Task Pipeline**
- Dedicated Approvals tab with one-click approve/reject
- Task pipeline view (Queued → Assigned → In Progress → Review → Done)
- Approval expiry handling
- Empty state

**Phase 14 — Brain Redesign**
- PDF/DOCX/TXT/MD file upload (drag-and-drop, 10MB max, multer v2 + pdf-parse)
- Card-based knowledge base with type badges
- 4-level autonomy dial (Observe / Propose / Confirm / Autonomous)
- Work output viewer for background deliverables

**Phase 15 — Polish**
- Premium component design matching Hatchin's visual style

### Post-v1.3 Plans

**Short-term:**
- CHANGELOG and README for developer onboarding
- User analytics (Posthog or custom)
- Conversation archival and search

**Medium-term (1-2 months):**
- Agent marketplace / public templates
- Cross-project agent sharing
- Agent voice/persona customization UI
- Image generation from Designer Hatch
- Claude coding agent from Engineer Hatch

**Long-term (3-6 months):**
- Multi-user collaboration (real-time multi-cursor)
- Agent-to-agent async tasks without user prompting
- GitHub / Linear / Notion integrations
- Audio input (Whisper transcription)
- Fine-tuned models per role
- Horizontal scaling with Redis adapter

---

*This document covers every feature, system, and capability of the Hatchin platform as of 2026-03-25.*
