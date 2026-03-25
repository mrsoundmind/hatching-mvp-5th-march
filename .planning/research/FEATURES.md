# Feature Research

**Domain:** AI deliverable/artifact systems — cross-agent coordinated document production (Hatchin v2.0)
**Researched:** 2026-03-25
**Confidence:** MEDIUM-HIGH — derived from training knowledge of Claude Artifacts (Anthropic, shipped Oct 2024), ChatGPT Canvas (OpenAI, shipped Oct 2024), Notion AI document generation (2023–2025), Jasper AI (2022–2025), Copy.ai (2022–2025), and Coda AI, all as of Aug 2025 knowledge cutoff. External verification tools unavailable in this session; confidence is MEDIUM for product-specific details, HIGH for UX pattern analysis.

---

## Context

This research answers: what do competing AI artifact systems (Claude Artifacts, ChatGPT Canvas, Notion AI, Jasper, Copy.ai) do for structured document creation from AI conversation? What is table stakes vs differentiating? What makes a great artifact/deliverable experience?

The critical distinction for Hatchin v2.0: single-agent artifact generation (writing a PRD in one chat) is fully commoditized. The differentiator is cross-agent deliverable chains — PM writes PRD, Engineer writes tech spec referencing it, Designer creates brief from both, Marketing drafts GTM from the PRD. Five linked documents from a coordinated team. No single-chat AI product can do this. Hatchin's existing handoff orchestrator, safety gates, and multi-agent architecture make this achievable.

---

## Competitor Landscape

### Claude Artifacts (Anthropic, Oct 2024)
A split-screen panel that opens to the right of chat when Claude generates structured content (code, HTML, SVG, markdown documents). Artifacts are:
- Persistent across the conversation — they do not disappear when you scroll past them
- Iteratable — "make this more formal" updates the artifact in-place with a diff-style visual
- Copyable and downloadable — code runs in a sandboxed iframe; documents are copyable markdown
- Version-navigable — arrow buttons step through previous versions (like undo)
- Single-artifact-per-panel — one artifact visible at a time; no multi-artifact linking

What Claude Artifacts does not do: multiple linked artifacts, multi-agent authorship, project-level persistence, packages of related documents, or PDF export. Each artifact is session-scoped unless you use Projects.

**Confidence: HIGH** (shipped product, well-documented in training data)

### ChatGPT Canvas (OpenAI, Oct 2024)
A collaborative editor that opens alongside chat, designed specifically for document and code editing:
- Full rich-text editing — users can directly edit the document, not just instruct ChatGPT to edit
- Context-aware AI suggestions — highlight a passage and ask "make this sharper"
- Toolbar shortcuts — reading level, length adjustment, add emojis (document), explain code, add logs (code)
- Track-changes style highlighting — shows what ChatGPT changed
- Targeted editing — can ask ChatGPT to edit only the highlighted section, not the whole document
- No multi-document linking, no multi-agent authorship, single document per canvas

Canvas positions itself as a collaborative writing environment more than an artifact viewer. The ability to directly edit alongside AI assistance is its core differentiator vs Claude Artifacts' read-only panel model.

**Confidence: HIGH** (shipped product, extensively covered in training data)

### Notion AI
- Inline AI generation inside Notion pages — write a page outline, generate content for each section
- `/AI` slash command generates blocks within existing page structure
- "Continue writing" and "Improve writing" on selected blocks
- AI Autofill in databases — fill a property based on page content (e.g., summarize meeting notes into action items column)
- AI Q&A — answer questions about your entire Notion workspace
- No dedicated artifact panel; AI output appears directly in the page inline

What Notion AI does not do: autonomous background production, agent handoffs, multi-document chain production, or export-to-PDF with agent attribution. It is fundamentally a writing assistant within pages, not a coordinated team producing standalone deliverables.

**Confidence: HIGH** (well-documented product used extensively in training data)

### Jasper AI
- Template-first workflow — user selects a document template (blog post, ad copy, product description, email sequence)
- Boss Mode — long-form document editor with AI commands inserted via `/`
- Campaign mode — input a brief, Jasper produces multiple assets (blog post + LinkedIn post + Twitter thread + email) from a single brief
- Brand voice — company tone, vocabulary, style stored as a brand asset; all outputs enforce it
- Team collaboration — multiple users can work on the same document

Jasper's Campaign mode is the closest analog to Hatchin's v2.0 ambition at the single-source level: one input produces multiple related outputs. But Jasper's "agents" are just sequential generation steps in one linear pipeline — not specialist agents with distinct roles, peer review, or handoff awareness.

**Confidence: MEDIUM** (well-documented in training data through 2024; Jasper underwent significant product changes in 2024)

### Copy.ai
- Workflow automation — define a multi-step pipeline (input → AI step → output) like Zapier but for content
- Pre-built workflows for common content chains: blog post → social media → email newsletter
- No conversational interface — purely template/workflow driven
- No agent personas — steps are generic AI generation, not specialist roles

Copy.ai's Workflows are technically close to what Hatchin calls "project packages" — a grouped set of content outputs from one input. But there is no conversation, no specialist expertise, and no autonomy — users define every step explicitly.

**Confidence: MEDIUM** (2024 knowledge; Copy.ai's product evolved significantly)

### Coda AI
- AI assistant within Coda docs — generate tables, formulas, and page sections from prompts
- AI columns in tables — auto-fill a column based on row content (competitor analysis, SEO tags)
- Document Q&A across Coda workspace
- No multi-agent, no handoffs, no export-oriented deliverables

### Key Patterns Across All Products

1. **Split-screen is the canonical UX** — Claude Artifacts and ChatGPT Canvas both open a second panel to the right of chat. This pattern is now the de-facto user expectation for AI-generated structured content. Users have internalized it.

2. **In-place iteration is essential** — Every product allows "make this better" to update the existing document, not append a new one. Users expect refinement, not replacement.

3. **Version history is expected in editors** — Canvas tracks changes; Artifacts shows step-back arrows. The moment a user iterates, they expect to be able to undo.

4. **Single document at a time** — No competitor shows multiple linked documents simultaneously. This is an unmet gap and Hatchin's opportunity.

5. **No cross-agent authorship** — No competitor shows "this section was written by your PM, this section by your Engineer." Visible team attribution is a completely unoccupied space.

6. **Export is an afterthought** — Most tools offer copy or basic download. Professional branded PDF export is table stakes that nobody does well.

7. **No async / background production** — Every competitor requires the user to be present. "Your team produced 4 documents overnight" is entirely unoccupied.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any AI product that produces structured documents. Missing these makes the deliverable system feel unfinished or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Split-panel artifact viewer | Claude Artifacts and ChatGPT Canvas shipped Oct 2024 and immediately became the canonical UX. Any AI that produces a document is now expected to show it in a dedicated panel, not inline in chat. | MEDIUM | Right-side panel that opens when a deliverable is created. Markdown rendering with syntax highlighting for code blocks. Persistent across conversation — stays visible while chat continues. |
| In-place iteration via chat | All three major products (Artifacts, Canvas, Notion AI) allow "make this more concise" to update the existing document. Users expect refinement to happen in-place, not as a new message. | MEDIUM | Active deliverable receives chat instructions. Agent updates the document with animated diff-style highlight of changed sections. Conversation and artifact stay linked. |
| Version history | Canvas tracks changes; Artifacts has back/forward navigation. Once users iterate even once, they expect to go back. | MEDIUM | Arrow navigation between versions. At minimum: current and previous. Ideal: full history with timestamps. Can be implemented as append-only version array in JSONB. |
| Copy and download | Every AI document tool offers copy-to-clipboard and download. Copy.ai, Jasper, Notion AI, Claude Artifacts all provide this. | LOW | Copy button (raw markdown or plain text). Download as .md or .txt. PDF export addressed separately as a differentiator. |
| Deliverable list / browser | Once a user has created more than one document, they need a way to find and switch between them. Every productivity tool (Notion, Google Docs, Jasper) has this. | MEDIUM | List of deliverables per project. Grouped by type or agent. Title, creation date, status (draft / complete). Click to open in viewer panel. Builds on v1.3's Work Output Viewer concept. |
| Explicit creation trigger | "Write me a PRD" must reliably produce a deliverable in the artifact panel, not just a chat response. Users trained by Claude/ChatGPT expect explicit commands to produce artifacts. | MEDIUM | Intent detection: "write", "create", "draft", "generate", "produce" + document type → artifact mode. Separate from organic detection (see Differentiators). |
| Organic detection from conversation | When a conversation naturally reaches the point where a document makes sense (PM has gathered enough context for a PRD), it should happen automatically or with a suggestion. Claude does this implicitly. | HIGH | Context threshold detection: when enough PRD elements (problem statement, audience, goals, features) have been discussed, Maya or the relevant Hatch offers "Ready to write this up as a PRD?" Builds on existing task detection infrastructure. |
| Loading / progress state during generation | Every async AI generation product shows some progress indicator. Users given a blank spinner for 30–60 seconds assume something broke. Jasper and Canvas both show streaming content. | LOW | Stream document content into the panel as it generates — same streaming pattern already used in chat. Show "Alex is writing your PRD..." with the writing avatar state. |
| Empty state with actionable prompt | Users opening the deliverable system for the first time need to understand what it can produce and how to start. Without this, they close it and never return. | LOW | Clear empty state: "Your team can produce professional documents from your conversations. Try: 'Write me a PRD for this project'" with examples of package types. |
| Deliverable status badges | Drafts, complete, in-review, approved — users need to understand the state of each document at a glance. Linear, GitHub, and Notion all use status badges. | LOW | Status tags on deliverable cards: Draft / In Review / Complete / Needs Approval. Tied to safety gate tier and peer review state from existing v1.1 autonomy backend. |

### Differentiators (Competitive Advantage)

Features that set Hatchin apart from Claude Artifacts, ChatGPT Canvas, Notion AI, Jasper, and Copy.ai. All are achievable on Hatchin's existing architecture.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-agent deliverable chains | PM writes PRD → Engineer writes tech spec that explicitly references it → Designer creates brief based on both. Downstream agents have read access to upstream outputs. This is the single most important differentiator — no competitor does this. ChatGPT Canvas, Claude Artifacts, and Jasper all produce one document at a time from one model. | HIGH | Handoff orchestrator already routes between agents. Add deliverable context injection: when Engineer picks up, inject PM's PRD as "prior work" context in the prompt. Link deliverables in the database with a `parent_deliverable_id` foreign key. |
| Project packages | "Launch Package" = PRD + Tech Spec + Design Brief + GTM Plan, produced as a coordinated set. User selects a package type, their team produces all documents and links them. No competitor has this concept. | HIGH | Package templates define the member deliverables and their agent ownership. User initiates a package → each deliverable is queued as a background job → agents produce in parallel where possible, sequentially where one feeds the next. |
| Visible team attribution | Each section or document shows which Hatch authored it. "This tech spec was written by Coda (Engineer)" with their avatar. No competitor shows multi-agent authorship because no competitor has multiple specialist agents. | LOW | Store `agent_id` and `agent_name` on the deliverable record. Render avatar + name in the viewer header. For cross-agent packages, show all contributing agents with their respective documents. |
| Async background production | "Your team is working on this overnight — you'll be notified when it's ready." No competitor offers this. Jasper, Canvas, and Artifacts all require the user to be present and watching. | HIGH | Already exists in v1.1 pg-boss execution pipeline. Deliverable jobs are the natural next artifact type for background execution. Maya return briefing (already shipped) becomes the notification mechanism for "your team produced 4 documents overnight." |
| Handoff notes visible in documents | When PM hands off to Engineer, the document includes a brief handoff note: "Alex (PM) to Coda (Engineer): PRD is complete, key technical constraints on page 2." Makes team coordination visible inside the deliverable itself, not just in the chat. | MEDIUM | Add a metadata section at the document top showing handoff context. Structured data from existing handoffProtocol.passes / receives fields in roleIntelligence.ts. |
| Professional PDF export with attribution | Branded PDF with cover page, table of contents, agent attribution, Hatchin watermark (or white-labeled for Pro). Clean typography. No competitor does this well — Notion's export is sparse; Jasper's is basic. | HIGH | Puppeteer (headless Chrome) or `@react-pdf/renderer` for styled PDF. Cover page: project name, date, document type. TOC from headings. Footer: "Produced by [Agent Name] on [date] — Hatchin." For packages: combined multi-document PDF with dividers. |
| Peer-reviewed deliverables | Before delivery, cross-agent peer review checks the document using the reviewer's peerReviewLens. "QA reviewed this spec and flagged 2 ambiguous requirements." No AI writing tool shows this. Already exists in v1.1 for task execution — extend to deliverables. | MEDIUM | Mid-risk deliverables (score 0.35–0.59) go through peerReviewRunner.ts before being marked Complete. Add a "Reviewed by [Agent]" badge with expandable review summary. |
| Zero-friction first deliverable (<3 min) | Onboarding benchmark: first document produced in under 3 minutes without explaining what AI is or how to prompt it. No current tool achieves this for non-technical users — all require template selection or prompt crafting. | HIGH | Maya initiates during onboarding: "Tell me about your project. I'll have a project overview ready in a few minutes." Organic detection triggers immediately from onboarding conversation. First deliverable is a simple Project Summary — low token cost, high perceived value. |
| Shared context between linked deliverables | When the tech spec references "as described in the PRD," that reference is accurate — the Engineer agent actually read the PRD, not a summary. Cross-document context injection at prompt time. | HIGH | Store deliverable content in the database. When generating a downstream deliverable, inject upstream content (or a structured summary if too long) into the prompt context alongside the project brain. |
| Package progress tracker | "Launch Package: 2 of 5 documents complete. In progress: Tech Spec (Coda)." Users starting an async package need to know what's happening. No competitor has multi-document progress tracking. | MEDIUM | Progress bar on the package card. Each member deliverable reports status independently. Rolls up to package-level percentage. WS event fires when each member completes. |

### Anti-Features (Deliberately NOT Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Rich text WYSIWYG editor (Google Docs-style) | Users want to edit the AI output directly, like ChatGPT Canvas | Canvas positions ChatGPT as a collaborative editor; Hatchin's brand positions Hatches as colleagues who produce work for you. Building a full editor says "you still do the writing." More importantly, implementing a robust rich text editor (Tiptap, Slate.js) is 2-3 weeks of work that delays the core differentiator (cross-agent chains). | Allow direct text editing as a future iteration. For v2.0, support text editing via chat instruction ("make this more concise") to the authoring agent — the Hatch revises, you review. Add direct editing in v2.1 if users request it. |
| Real-time multi-user collaborative editing | Multiple users editing the same deliverable simultaneously (Google Docs style) | Requires CRDT infrastructure (Yjs, Automerge) or operational transforms — months of work. Hatchin has no multi-user collaboration layer at all yet (single-user per project). Premature feature before core deliverable system is validated. | Single-user viewing and iteration is sufficient for v2.0. Add collaborative editing when multi-user collaboration milestone ships. |
| Importing existing documents to edit | Users want to paste in their existing PRD and ask the AI to improve it | Creates a different product category (AI document editor vs AI team that produces documents). Pulls engineering toward upload/parse infrastructure for user content, not team-coordination infrastructure. Confuses the product narrative: are Hatches editing my work or producing their own? | Hatchin's value prop is production, not editing. For context, users can add their existing documents to the Project Brain (already shipping in v1.3). Hatches then produce new documents informed by that context — not edits of the user's document. |
| Template library (user-selects template, AI fills it) | Jasper's model — very familiar to content teams | Template-first is the opposite of Hatchin's anti-prompting philosophy. It forces users to know what template they need and how to fill it. Also commoditized — Jasper, Copy.ai, and dozens of tools already do this. | Hatches detect what kind of document is needed from conversation context and produce the appropriate format automatically. No template selection required. Maya or the relevant Hatch suggests the right document type. |
| Instant single-message generation without conversation | "Click button → PRD generated from project name alone" | Produces shallow, generic documents with no real project context. First-time users might be impressed; after one use they'll see it's hollow. Destroys trust in the deliverable quality. | Organic detection ensures documents are generated after enough context has been gathered. The Hatch asks clarifying questions if needed before producing the deliverable. Quality over speed. |
| Per-document revision history for every edit | Full version control with diff-view, like Google Docs revision history | High storage complexity and UI complexity for MVP. Storing every incremental edit multiplies JSONB storage requirements. Diff rendering is a significant UI investment. | Store a maximum of 5 previous versions per deliverable (append to version array, drop oldest). Arrow navigation between versions (same pattern as Claude Artifacts). Full git-style diff is a v3+ concern. |
| Public sharing / publishing deliverables | "Share this PRD with a public link" | Privacy and compliance complexity before any user validation. Who owns documents produced by AI? What data appears in public links? Hatchin has no public-facing document infrastructure. | Pro users can export to PDF and share the file. Public sharing links deferred to v2.1 when B2B customers need to share deliverables with stakeholders outside Hatchin. |

---

## Feature Dependencies

```
[Deliverable System — Core Infrastructure]
    └──requires──> [Deliverables DB table (id, project_id, agent_id, type, content, status, version_history)]
    └──requires──> [GET /api/deliverables — list per project]
    └──requires──> [POST /api/deliverables — create]
    └──requires──> [PATCH /api/deliverables/:id — update content / status]
    └──required-by──> ALL deliverable features below

[Split-Panel Artifact Viewer]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [v1.3 RightSidebar decomposed into tabs] (mount surface)
    └──required-by──> [In-place iteration]
    └──required-by──> [Version history]
    └──required-by──> [Deliverable list / browser]

[In-place Iteration via Chat]
    └──requires──> [Split-Panel Artifact Viewer]
    └──requires──> [Active deliverable tracked in CenterPanel state]
    └──enhances──> [Existing streaming chat] (same WS pattern, different output target)

[Organic Detection]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [Existing task detection infrastructure] (extends taskDetection.ts)
    └──enhances──> [Zero-friction onboarding] (first document triggered without explicit request)

[Cross-Agent Deliverable Chains]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [parent_deliverable_id FK on deliverables table]
    └──requires──> [Deliverable context injection in agent prompts]
    └──requires──> [Existing handoff orchestrator] (handoffOrchestrator.ts — already ships)
    └──required-by──> [Project Packages]
    └──required-by──> [Shared context between linked deliverables]
    └──required-by──> [Handoff notes visible in documents]

[Project Packages]
    └──requires──> [Cross-Agent Deliverable Chains]
    └──requires──> [Package templates table (name, member_types[], agent_assignments)]
    └──requires──> [Package progress tracker]
    └──requires──> [Existing background execution (pg-boss)] (async production already ships)

[Async Background Production]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [Existing pg-boss job queue] (already ships in v1.1)
    └──requires──> [Existing Maya return briefing] (notification mechanism already ships)
    └──enhances──> [Project Packages] (packages run async in background)

[Peer-Reviewed Deliverables]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [Existing peerReviewRunner.ts] (already ships in v1.1)
    └──enhances──> [Cross-Agent Deliverable Chains] (peer review per hop)

[Professional PDF Export]
    └──requires──> [Deliverable System — Core Infrastructure]
    └──requires──> [Split-Panel Artifact Viewer] (HTML template as render source)
    └──enhances──> [Project Packages] (export entire package as one PDF)

[Zero-Friction Onboarding (<3 min)]
    └──requires──> [Organic Detection]
    └──requires──> [Async Background Production]
    └──enhances──> [Project Packages] (first experience is a simple package, not a blank tool)

[Package Progress Tracker]
    └──requires──> [Project Packages]
    └──requires──> [WS events for deliverable status changes]
    └──enhances──> [v1.3 Activity Feed] (package progress appears as activity events)
```

### Dependency Notes

- **Deliverable DB table is the single gating dependency.** Everything above requires a `deliverables` table to exist. This is the first commit in Phase 1 of v2.0. The schema design (especially `parent_deliverable_id` and `version_history` JSONB) must be finalized before any UI work begins.

- **v1.3 must ship before v2.0 starts.** The split-panel viewer needs a mount surface — the v1.3 tab shell provides it. The Work Output Viewer planned for v1.3.x is the direct predecessor to the deliverable browser. The v1.3 activity feed is the natural display surface for package progress events.

- **Cross-agent chains require upstream context injection.** This is the technically hardest new piece — not the UI, but ensuring the Engineer agent's prompt actually contains the PM's PRD content, managed within LLM token limits. Token budget management is the primary risk here (see PITFALLS.md).

- **Async production already exists.** pg-boss is shipped. Maya return briefing is shipped. The v2.0 deliverable execution jobs are a new job type in the existing queue, not a new queue. This dramatically reduces risk.

- **Organic detection extends existing task detection.** `server/ai/taskDetection.ts` already parses chat messages for implicit task intents. Deliverable detection is the same pattern targeting document types instead of tasks.

---

## MVP Definition

### Launch With (v2.0)

The minimum deliverable system that validates the cross-agent coordination value proposition.

- [ ] Deliverables database table with core schema (id, project_id, agent_id, type, content, status, version_history JSONB, parent_deliverable_id) — gating dependency
- [ ] Split-panel artifact viewer — opens to the right of chat when a deliverable is created; markdown rendering; persistent across chat; copy and download buttons
- [ ] In-place iteration — active deliverable receives chat instructions from the authoring agent; document updates in-place with visual diff highlight
- [ ] Version history (5 versions max) — back/forward arrow navigation; timestamps
- [ ] Deliverable list / browser per project — title, agent avatar, type badge, status, creation date; click to open in viewer
- [ ] Explicit trigger path — "Write me a PRD" → agent produces deliverable in artifact panel; covers all common document types (PRD, tech spec, design brief, GTM plan, project plan)
- [ ] Organic detection for common types — when enough context is gathered for a PRD or project plan, Maya offers to write it; at minimum for project creation and onboarding
- [ ] Streaming generation — document content streams into panel as it generates; authoring agent shows "working" avatar state; progress visible
- [ ] Visible agent attribution — deliverable header shows author avatar, role, and creation timestamp
- [ ] Basic status (Draft / Complete) — Simple two-state status; complete when agent marks finished and peer review (if applicable) passes
- [ ] Cross-agent deliverable chains — when Engineer writes tech spec, PRD context is injected; parent_deliverable_id linked; viewer shows "based on [PRD title]" reference
- [ ] Three starter package types — Launch Package (PRD + Tech Spec + Design Brief + GTM), Content Sprint (Blog + Social Calendar + Email Sequence), Planning Package (Project Plan + Competitive Analysis + SOP); initiatable with one click; async production; progress tracking
- [ ] Async background production — deliverable jobs run in pg-boss background queue; Maya notifies on completion via return briefing
- [ ] Package progress tracker — progress bar on package card; per-deliverable status; WS updates
- [ ] Zero-friction onboarding — first deliverable offered within 3 minutes of project creation; Maya initiates during onboarding conversation

### Add After Validation (v2.0.x)

Features to add once the core deliverable loop is working and users are producing documents.

- [ ] Peer-reviewed deliverables — add once base quality is validated; apply peerReviewRunner to mid-risk deliverable types; show "Reviewed by [Agent]" badge
- [ ] Professional PDF export — add once users demonstrate they share documents externally; Puppeteer or @react-pdf/renderer; cover page, TOC, attribution, Hatchin branding
- [ ] Handoff notes in documents — add once cross-agent chains are shipping and users respond to the coordination narrative; structured metadata section at document top
- [ ] Expanded package library — more package types based on what users request; landing page and GTM driven by real user packages produced
- [ ] Deliverable sharing (private link, PDF only) — add when Pro users ask to share with stakeholders outside Hatchin

### Future Consideration (v2.1+)

Features to defer until product-market fit on core deliverables is established.

- [ ] Direct text editing (WYSIWYG) — add if users consistently request it; Tiptap or similar; significant complexity investment
- [ ] Full git-style revision history with diff view — storage and UI complexity; defer until enterprise/B2B customers need audit trails
- [ ] Multi-user collaborative editing on deliverables — requires CRDT infrastructure; defer to multi-user collaboration milestone
- [ ] Public sharing / publishing deliverables — privacy and compliance complexity; defer to B2B milestone
- [ ] Custom package creation (user defines member deliverables and agent assignments) — powerful for B2B but adds configuration complexity; defer until company-level intelligence milestone
- [ ] Deliverable templates (user-selects) — contradicts anti-prompting philosophy; only viable if B2B customers need branded document structures enforced

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Deliverables DB table + API | HIGH | LOW | P1 |
| Split-panel artifact viewer | HIGH | MEDIUM | P1 |
| Streaming generation in panel | HIGH | LOW | P1 |
| Agent attribution in deliverable | HIGH | LOW | P1 |
| Deliverable list / browser | HIGH | MEDIUM | P1 |
| Explicit trigger path | HIGH | MEDIUM | P1 |
| In-place iteration via chat | HIGH | MEDIUM | P1 |
| Version history (5 versions) | MEDIUM | LOW | P1 |
| Copy and download | MEDIUM | LOW | P1 |
| Organic detection (onboarding-scope) | HIGH | MEDIUM | P1 |
| Cross-agent deliverable chains | HIGH | HIGH | P1 |
| Three starter package types | HIGH | HIGH | P1 |
| Async background production | HIGH | LOW | P1 — backend already exists |
| Package progress tracker | HIGH | MEDIUM | P1 |
| Zero-friction onboarding | HIGH | MEDIUM | P1 |
| Status badges (Draft/Complete) | MEDIUM | LOW | P1 |
| Empty state with actionable prompt | MEDIUM | LOW | P1 |
| Peer-reviewed deliverables | HIGH | LOW | P2 — backend already exists |
| PDF export (basic) | HIGH | HIGH | P2 |
| Handoff notes in documents | MEDIUM | MEDIUM | P2 |
| Expanded organic detection (all types) | MEDIUM | HIGH | P2 |
| Deliverable sharing (PDF only) | MEDIUM | MEDIUM | P2 |
| In-deliverable cross-references (linked sections) | MEDIUM | HIGH | P3 |
| Direct text editing (WYSIWYG) | MEDIUM | HIGH | P3 |
| Custom package templates | LOW | HIGH | P3 |
| Public sharing links | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must ship in v2.0 — core value proposition not demonstrated without these
- P2: Target for v2.0.x after initial user validation
- P3: v2.1+ or explicitly deferred

---

## Competitor Feature Analysis

| Feature | Claude Artifacts | ChatGPT Canvas | Notion AI | Jasper Campaign Mode | Copy.ai Workflows | Hatchin v2.0 Approach |
|---------|-----------------|----------------|-----------|---------------------|-------------------|-----------------------|
| Artifact panel / viewer | Split-screen right panel. Persists across conversation. Code runs in sandbox. | Full editor opens alongside chat. Richer than Artifacts — user can type directly. | Inline in page. No dedicated panel. | Dedicated long-form editor. | No conversational UI. Workflow output shown as final. | Split-panel right of chat (same pattern, proven UX). Viewer-first not editor-first, consistent with "team produces work for you" brand. |
| In-place iteration | Yes — "make this shorter" updates artifact in-place. | Yes — highlight + prompt. Most powerful implementation. Direct editing also allowed. | Yes — select block, choose action. Very limited. | Yes — via Boss Mode `/` commands. | No — workflow outputs are final. | Yes — chat instruction to authoring agent updates in-place. No direct editing in v2.0 (deferred to v2.1). |
| Version history | Yes — back/forward arrows, multiple versions. | Yes — tracks changes, shows diffs. | No version history for AI-generated blocks. | No version history. | No version history. | Yes — 5 version max via JSONB array. Back/forward arrows. Timestamps. |
| Multi-document linking | No — one artifact at a time per session. | No — one canvas at a time. | No — documents are separate pages. | Campaign mode produces multiple but not linked. | Workflows produce multiple but not linked. | Yes — parent_deliverable_id FK; downstream agents read upstream content; viewer shows "based on [PRD]" reference. This is the primary gap in all competitors. |
| Specialist authorship | No — one model, no role specialization. | No — one model. | No — generic AI assistant. | Named "brand voice" but not specialist roles. | Generic AI steps, no roles. | Yes — each deliverable has a specialist author (PM writes PRD, Engineer writes tech spec). Avatar, name, role displayed on deliverable. |
| Cross-agent context injection | No — session context only. | No — single model has all context. | No | No | No | Yes — when Engineer generates tech spec, PM's PRD is injected into the prompt as "prior work." Managed within token budget via structured summary. |
| Async / background production | No — user must be present. | No — user must be present. | No | No | Workflows run but no async notification. | Yes — pg-boss background queue (already ships). Maya return briefing notification (already ships). "Your team produced 4 docs overnight." |
| Packages / grouped deliverables | No | No | Notion pages can be grouped in a database but not AI-coordinated production. | Campaign mode: one brief → multiple assets. Not "packages." | Workflow: closest analog. Sequential steps, not specialist agents. | Yes — Launch Package, Content Sprint, Planning Package. Team produces all member deliverables and links them. Package-level progress tracker. |
| Peer review | No | No | No | No | No | Yes — peerReviewRunner.ts already ships in v1.1. Extend to deliverables. |
| PDF export | Basic download (markdown/code). No PDF. | No | Notion PDF export: functional but bare, no branding, poor typography. | Jasper PDF: basic, no agent attribution. | No PDF. | Professional PDF: cover page, TOC, agent attribution, Hatchin branding. Puppeteer or @react-pdf/renderer. Multi-document package PDF with dividers. |
| Zero-friction first document | Requires knowing to ask. No onboarding guidance. | Requires knowing Canvas exists. | Requires navigating Notion UI, using /AI command. | Template selection required. | Template/workflow selection required. | Maya initiates during onboarding. First deliverable offered without user knowing what a deliverable is. <3 min benchmark. |

---

## Hatchin-Specific Dependencies on Existing Architecture

These features are specifically enabled by Hatchin's existing v1.1/v1.2 infrastructure — things no competitor can replicate without rebuilding from scratch:

| v2.0 Feature | Depends On | Already Exists? |
|-------------|-----------|-----------------|
| Cross-agent chains | handoffOrchestrator.ts | Yes — v1.1 |
| Async production | pg-boss job queue | Yes — v1.1 |
| Background notification | Maya return briefing | Yes — v1.1 |
| Peer-reviewed deliverables | peerReviewRunner.ts | Yes — v1.1 |
| Safety-gated delivery | taskExecutionPipeline.ts | Yes — v1.1 |
| Specialist authorship | 30-role roleRegistry + roleIntelligence | Yes — v1.1 |
| Project context in prompts | Project Brain JSONB | Yes — v1.0 |
| Trust-adjusted autonomy | trustScorer + trustAdapter | Yes — v1.1 |
| Organic detection | taskDetection.ts (extension point) | Yes — v1.0 (extend) |
| Activity feed for package progress | autonomy_events + ActivityFeed | Yes — v1.3 (extend) |

The backend effort for v2.0 is primarily:
1. A new `deliverables` database table (1 migration)
2. CRUD API routes for deliverables (new route module)
3. Deliverable context injection logic (new module in `server/ai/`)
4. Package templates and job routing (new module in `server/autonomy/`)
5. New background job type in the existing pg-boss queue

The frontend effort is the primary scope:
1. Split-panel viewer component
2. Deliverable list / browser
3. Package selection and progress UI
4. Artifact streaming integration
5. Onboarding integration

---

## Sources

All sourced from training data (knowledge cutoff: August 2025). External verification tools unavailable in this session.

- **Claude Artifacts** — Anthropic, shipped October 2024; extensively documented in Claude release notes and user guides; HIGH confidence on feature set as of Aug 2025
- **ChatGPT Canvas** — OpenAI, shipped October 2024; extensively covered in OpenAI release notes and independent reviews; HIGH confidence on feature set as of Aug 2025
- **Notion AI** — feature set stable 2023–2025; inline generation, AI columns, workspace Q&A are well-documented; HIGH confidence
- **Jasper AI** — campaign mode, Boss Mode, brand voice; MEDIUM confidence (Jasper pivoted product direction in 2024; specific features may have changed)
- **Copy.ai** — workflow automation model; MEDIUM confidence (significant product changes in 2024 toward enterprise GTM workflows)
- **Coda AI** — AI assistant, AI columns; HIGH confidence (stable feature set well-documented)
- UX pattern analysis: Claude Artifacts vs Canvas UX difference (split-panel vs collaborative editor) derived from extensive training data coverage of both products at launch
- Hatchin codebase: `.planning/PROJECT.md`, `CLAUDE.md`, `server/autonomy/`, `shared/roleRegistry.ts`, `shared/roleIntelligence.ts` — direct dependency mapping

---

*Feature research for: AI deliverable/artifact systems — cross-agent coordinated document production (Hatchin v2.0)*
*Researched: 2026-03-25*
