# Project Research Summary

**Project:** Hatchin v2.0 — Deliverable/Artifact System
**Domain:** Cross-agent coordinated document production on an existing AI team chat platform
**Researched:** 2026-03-25
**Confidence:** HIGH (all research grounded in direct codebase analysis and well-documented shipped products)

## Executive Summary

Hatchin v2.0 adds a professional deliverable/artifact system on top of an existing production platform that already has multi-agent execution (pg-boss), handoff orchestration, peer review gates, and safety scoring. The right approach is to extend — not replace — this infrastructure. Single-agent AI document generation (Claude Artifacts, ChatGPT Canvas) is fully commoditized as of late 2024. Hatchin's differentiation is cross-agent deliverable chains: PM writes a PRD, Engineer writes a tech spec referencing it, Designer creates a brief from both — five linked, specialist-authored documents from a coordinated team. No competitor does this because no competitor has the underlying multi-agent architecture that Hatchin already ships.

The recommended approach is: database-first (three new tables in one migration), then split-panel artifact viewer, then deliverable generation with schema enforcement, then cross-agent chains with explicit context injection, then project packages, then onboarding integration. Stack requirements are minimal — only four new packages (`@react-pdf/renderer`, `rehype-sanitize`, `rehype-slug`, `rehype-autolink-headings`) against an existing stack that already has everything else needed. The richest technical risks are around cross-document reference staleness, LLM structural variance in generated documents, and context injection token budget management.

The key risk is building the artifact panel before establishing the data model and deliverable schemas. Three pitfalls (stale cross-document references, structural variance, and versioning storage costs) all require schema decisions that cannot be retrofitted after the first deliverable is generated. Phase 1 must lay the data foundation before any UI work begins. Phase 2's deliverable schema enforcement (section names, ordering, word count targets, temperature 0.3) is the most critical implementation investment — it determines whether documents are professional-grade or inconsistent, and whether iteration produces targeted edits or whole-document regenerations.

## Key Findings

### Recommended Stack

The existing stack already covers the vast majority of what v2.0 needs. `react-markdown`, `remark-gfm`, `rehype-highlight`, `@tailwindcss/typography`, `framer-motion`, `react-resizable-panels`, `@radix-ui/react-scroll-area`, `pg-boss`, and Drizzle ORM are all already installed and immediately usable. The `prose` Tailwind class is already registered in `tailwind.config.ts` — rich markdown rendering for the artifact panel requires no new frontend packages.

Only four new packages are required. PDF export uses `@react-pdf/renderer` server-side (not Puppeteer, which is incompatible with Neon's serverless memory limits). The rehype plugins handle sanitization and TOC anchoring for the richer rendering context of the artifact panel.

**Core technologies:**
- `@react-pdf/renderer@4.3.0`: Server-side branded PDF export — only React-ecosystem PDF library supporting custom branding without a Chromium binary; must be server-side only, never bundled in Vite client
- `rehype-sanitize@6.0.0`: AST-based XSS protection for LLM-produced markdown in the artifact panel — runs in Node.js and browser, unlike dompurify; must come before rehype-slug in the plugin array
- `rehype-slug@6.0.0` + `rehype-autolink-headings@7.1.0`: Section anchor links for TOC navigation — two plugin lines versus a 40-line custom implementation
- `deliverables`, `packages`, `deliverable_versions` DB tables via Drizzle migration — `text` column type (not JSONB) for markdown content to avoid TOAST threshold issues and enable future full-text search

**Critical version decision:** `@react-pdf/renderer` must be server-side only. Use `renderToBuffer()` not `renderToStream()` for Express response handling. `content` field on `deliverable_versions` must be `TEXT`, not JSONB — a 5,000-word PRD is ~30KB; storing as JSONB adds parsing overhead with no query benefit.

### Expected Features

The split-panel artifact viewer (chat left, document right) is now the canonical user expectation after Claude Artifacts and ChatGPT Canvas shipped in October 2024. Missing this feels broken. In-place iteration, version history, and copy/download are also table stakes. Everything else is differentiation.

**Must have (table stakes):**
- Split-panel artifact viewer — Claude Artifacts and Canvas established this as the expected UX; any AI that produces structured documents must show them in a dedicated panel
- In-place iteration via chat — "make this more concise" updates the document, not a new chat message
- Version history (5-version cap) — users expect to be able to undo after even one iteration
- Copy and download — copy-to-clipboard is zero-effort; .md download is trivial; both are universally expected
- Deliverable list / browser — after the second document, users need a way to find and switch between them
- Explicit trigger path — "Write me a PRD" must reliably open the artifact panel with a document
- Streaming generation — content streams into the panel as it generates; users need visible progress for 30–60 second generation times
- Agent attribution — who produced this document, with their avatar and role
- Status badges (Draft / Complete) — tied to the existing peer review and safety gate state

**Should have (competitive differentiation):**
- Cross-agent deliverable chains — the primary differentiator; PM PRD injected as context when Engineer writes tech spec; `upstreamDeliverableId` FK in schema; no competitor does this
- Project packages — "Launch Package" triggers PM → PRD, Engineer → Tech Spec, Designer → Brief, Marketing → GTM; async execution; package-level progress tracking
- Async background production — pg-boss already ships; deliverable jobs are a new job type in the existing queue; Maya return briefing is already the notification mechanism
- Organic detection — two-stage (classify then propose, never auto-create); conservative threshold; "Ready to write this up as a PRD?" confirmation card
- Peer-reviewed deliverables — `peerReviewRunner.ts` already ships; apply to mid-risk deliverable types; show "Reviewed by [Agent]" badge
- Professional PDF export — cover page, TOC, agent attribution, Hatchin branding via `@react-pdf/renderer`
- Zero-friction onboarding — first deliverable offered within 3 minutes; project type classifier determines which deliverable type to generate first

**Defer (v2.1+):**
- Rich text WYSIWYG editor (Tiptap, Slate.js) — 2–3 weeks of work; contradicts Hatchin's "team produces work for you" brand positioning
- Real-time multi-user collaborative editing — requires CRDT infrastructure; no multi-user layer exists yet
- Public sharing links — privacy and compliance complexity before user validation
- Full git-style revision history with diff view — storage and UI complexity; enterprise concern
- Custom package templates — B2B feature; defer to company-level intelligence milestone

### Architecture Approach

The deliverable system layers on top of the existing autonomy pipeline without replacing any existing modules. The architecture reuses three established patterns already in the codebase: (1) `[[ACTION:]]` blocks extended to `[[DELIVERABLE: type: title]]` via a new `parseDeliverableBlock()` in the existing `actionParser.ts`; (2) `window.dispatchEvent` / `window.addEventListener` CustomEvent bridge between CenterPanel and RightSidebar, the same pattern used in v1.3; (3) TanStack Query + WebSocket real-time update pattern for artifact state.

**Major components:**
1. `shared/schema.ts` (modified) — three new tables: `deliverables`, `packages`, `deliverable_versions`; current content on `deliverables` row for fast reads; `upstreamDeliverableId` nullable self-reference encoding chain without a join table; `metadata` JSONB for `sourceConversationId`, word count, export state
2. `shared/deliverableTypeRegistry.ts` (new) — role-to-deliverable-type mapping and chain dependency graph; defines which types unlock which in a chain sequence; section schemas per type (required sections, ordering, word count targets)
3. `server/ai/deliverableGenerator.ts` (new) — role-aware LLM prompt for document production and section-level iteration; enforces type schema via JSON template injection; `temperature: 0.3`; revision path regenerates only the target section and splices it back in
4. `server/autonomy/deliverableChainOrchestrator.ts` (new) — seeds task graph from chain registry; delegates execution to existing `handoffOrchestrator.ts`; adds `deliverableContext: { id, title, type, content }[]` to the handoff payload with intelligent truncation for token budget
5. `client/src/components/ArtifactPanel.tsx` (new) — full deliverable viewer overlay on RightSidebar (absolute-positioned, non-blocking); version history drawer; export button; renders via ReactMarkdown with `prose` class + rehype plugin chain
6. `client/src/components/DeliverableCard.tsx` (new) — chat bubble variant announcing a deliverable with title and open button; renders when `messageType: 'deliverable'`
7. `client/src/components/PackageView.tsx` (new) — package progress overview with linked deliverable list and per-step status including `agent_missing` state

**Key architectural decisions:**
- ArtifactPanel renders as an absolute-positioned overlay on RightSidebar — not a route, not a tab — conversation context is never lost when opening a document
- Chat input becomes the iteration interface when ArtifactPanel is open; messages tagged with `activeDeliverableId` in WS payload metadata
- `deliverable_versions` is a separate table (not JSONB array) — keeps base row small; supports pagination; allows future full-text search on content
- Version retention policy: keep last 20 versions plus user-pinned; automatic pruning async after each new version write

### Critical Pitfalls

1. **Artifact panel steals focus from the originating conversation** — avoid by making the panel a non-blocking slide-in beside chat (not an overlay or tab switch); store `sourceConversationId` on every deliverable in the initial schema; surface "revise this" buttons that pre-fill a chat message in the originating conversation. This is an architectural decision required in Phase 1.

2. **Downstream agents receive chat summaries, not document content** — `handoffOrchestrator.ts` passes `completedOutput: string` (conversational text); downstream agents produce generic tech specs with placeholder language. Fix: add `deliverableContext: { id, title, type, content }[]` to the handoff payload; inject full upstream document into downstream generation prompt; truncate intelligently (section headings + 100 words per section) when upstream exceeds token budget. Required in Phase 3 before first chain is implemented.

3. **LLM structural variance makes documents unpredictable across regenerations** — section names rename, sections disappear, document length oscillates 30–40% between identical prompts. Fix: define canonical JSON schemas per deliverable type; inject schema as a JSON template the LLM fills; for revision requests, regenerate only the target section and splice back in; set `temperature: 0.3` for structured generation. Must be built before the first deliverable is generated.

4. **Organic detection creates deliverables nobody asked for** — false positives destroy user trust faster than false negatives. Fix: two-stage approach — classify intent first, then propose with a confirmation card; never auto-create; conservative threshold; auto-created drafts require explicit user confirmation.

5. **Stale cross-document references when upstream documents are revised** — tech spec references PRD v1; user iterates PRD to v2; tech spec is now inconsistent but nothing signals this. Fix: track `referencedDocuments: [{ id, version, snapshotHash }]` at generation time; surface stale reference warnings; provide one-click "Update downstream documents"; never auto-update silently.

6. **Package creation silently stalls when required agents are missing** — shows "2/4 complete" with no explanation. Fix: validate agent availability at package creation time (not execution time); track step state as `{ status: 'agent_missing' }`; surface recovery action with direct link to agent creation.

## Implications for Roadmap

Based on research dependencies and pitfall phase-attribution, a six-phase structure is recommended:

### Phase 1: Database Foundation + Artifact Panel Shell

**Rationale:** Every v2.0 feature requires the `deliverables` table to exist. The `sourceConversationId` field and `referencedDocuments` snapshot structure must be in the initial schema — retrofitting requires data migration. The `deliverable_versions` table must be separate from day one. The ArtifactPanel's non-blocking relationship to chat is an architectural decision, not styling — establish here before any UI work.

**Delivers:** Three new DB tables with Drizzle migration and `npm run db:push`; CRUD API routes (`server/routes/deliverables.ts`, `server/routes/packages.ts`); eight new storage methods in `IStorage` + both `MemStorage` and `DatabaseStorage` implementations; ArtifactPanel shell with open/close state; `DeliverableCard` chat bubble; four WS event types added to `shared/dto/wsSchemas.ts`

**Addresses:** Split-panel viewer (table stakes), agent attribution (table stakes), status badges (table stakes), copy/download (table stakes)

**Avoids:** Artifact panel focus-steal pitfall (sourceConversationId in schema); versioning storage cost pitfall (separate versions table from day one); stale reference pitfall (referencedDocuments snapshot structure in schema)

**Research flag:** Standard patterns — Drizzle migration + CRUD routes follow established codebase patterns exactly

### Phase 2: Deliverable Generation + Schema Enforcement

**Rationale:** Canonical schemas per deliverable type must exist before the first real deliverable is generated. Section-level storage (needed for targeted iteration) also must be in place from this phase. `deliverableGenerator.ts` with `temperature: 0.3` and JSON schema injection is the most critical technical investment of the entire system.

**Delivers:** `server/ai/deliverableGenerator.ts` with role-aware prompts and type schemas for PRD, tech spec, design brief, GTM plan, blog post, and project plan; `[[DELIVERABLE: type: title]]` action block parsing via `actionParser.ts` extension; streaming generation into ArtifactPanel; explicit trigger path ("Write me a PRD"); version history with back/forward navigation; `shared/deliverableTypeRegistry.ts` with section schemas; install four new npm packages

**Addresses:** Explicit trigger path (table stakes), streaming generation (table stakes), version history (table stakes), deliverable list/browser (table stakes)

**Avoids:** LLM structural variance pitfall (schema enforcement + temperature 0.3); whole-document regeneration pitfall (section-level architecture from day one)

**Research flag:** Needs deeper research — canonical section definitions and word-count targets for each deliverable type are content design decisions with significant downstream implications; section-level storage model design needs careful thought before any iteration logic is built

### Phase 3: Cross-Agent Deliverable Chains

**Rationale:** This is the primary differentiator. Every competitor produces one document at a time from one model. Chains require modifying `handoffOrchestrator.ts` to carry `deliverableContext` (full document content, not chat summary) and implementing intelligent upstream context truncation for token budget management.

**Delivers:** `server/autonomy/deliverableChainOrchestrator.ts`; modified `handoffOrchestrator.ts` with `deliverableContext` field; upstream document injection in downstream generation prompts with intelligent truncation; `upstreamDeliverableId` FK populated; "based on [PRD title]" reference visible in ArtifactPanel; `MAX_DELIVERABLE_CHAIN_DEPTH` policy constant in `policies.ts`; agent availability validation at chain creation time; stale reference tracking (`referencedDocuments` snapshot)

**Addresses:** Cross-agent deliverable chains (primary differentiator), shared context between linked deliverables

**Avoids:** Upstream context omission pitfall (deliverableContext in handoff payload, not chat summary); stale reference pitfall (referencedDocuments snapshot tracking activated here)

**Research flag:** Needs deeper research — token budget management for multi-hop chains (PRD + Tech Spec must both fit in Designer's context window); testing cross-agent output consistency; stale reference UX design

### Phase 4: Organic Detection + Iteration UX

**Rationale:** Organic detection and iteration UX are designed together because organic detection's false positive problem requires the same proposal/confirmation UX that iteration uses for section-level targeting. Building detection before designing the confirmation UX produces the auto-created deliverables failure mode.

**Delivers:** Two-stage organic detection in `server/ai/taskDetection.ts` extension — intent classification then proposal card; conservative threshold; confirmation card in CenterPanel; section-level targeting for revision requests (identify section, regenerate, splice back in); diff highlighting in ArtifactPanel; `activeDeliverableId` metadata tagging on outgoing WS messages; iteration short-circuit path in `chat.ts`

**Addresses:** In-place iteration (table stakes), organic detection for common types (table stakes), version history with meaningful diffs

**Avoids:** Organic detection false-positive pitfall (two-stage + conservative threshold + confirmation card); whole-document regeneration for targeted requests (section-level targeting)

**Research flag:** Needs deeper research — intent classification boundary between "deliverable-adjacent planning" and genuine production intent; diff highlighting library choice and render performance for large documents

### Phase 5: Project Packages + Background Production

**Rationale:** Packages depend on working chains (Phase 3) and the async production infrastructure that already ships in v1.1. This phase wires existing pg-boss infrastructure to deliverable jobs and adds package management UI.

**Delivers:** `server/routes/packages.ts` with full CRUD; package templates for Launch Package (PRD + Tech Spec + Design Brief + GTM), Content Sprint (Blog + Social Calendar + Email Sequence), Planning Package (Project Plan + Competitive Analysis + SOP); package job routing in existing pg-boss queue; `PackageView.tsx` with progress bar and per-deliverable status; `package_progress` WS events; agent availability validation at package creation with `agent_missing` step status and recovery action; package-level Maya return briefing on completion

**Addresses:** Three starter package types (P1), async background production (P1), package progress tracker (P1)

**Avoids:** Agent-missing failure mode (validate at creation, not execution time); silent package stall (explicit `agent_missing` status with recovery action surfaced)

**Research flag:** Standard patterns — extends existing pg-boss queue with new job type; package template structure is configuration, not novel architecture

### Phase 6: Zero-Friction Onboarding + PDF Export

**Rationale:** Onboarding integration depends on organic detection (Phase 4) being reliable. PDF export depends on the deliverable schema system (Phase 2) being stable — PDF templates must match canonical document structure. Both ship together as the polish layer.

**Delivers:** Project type classifier (content sprint vs product launch vs side project vs marketing) that selects the first deliverable type; Maya onboarding prompt offering first deliverable within 3 minutes; first deliverable framed as "starting point — tell me what to adjust"; `@react-pdf/renderer` PDF export endpoint (`POST /api/deliverables/:id/export`); `PRDTemplate`, `TechSpecTemplate`, `GTMTemplate`, `DesignBriefTemplate` React PDF components with embedded fonts, cover page, TOC, page numbers, agent attribution; PDF preview before download; multi-document package export as combined PDF

**Addresses:** Zero-friction onboarding (<3 min benchmark), professional PDF export (P2), package PDF export

**Avoids:** Generic onboarding deliverable pitfall (project type classifier determines deliverable type, not a fixed "project plan"); PDF quality pitfall (dedicated print path via `@react-pdf/renderer`, not Puppeteer against web renderer)

**Research flag:** Needs deeper research — project type classifier design (categories, how to classify from onboarding answers); PDF template design and testing against real LLM-generated content

### Phase Ordering Rationale

- Phases 1 and 2 must execute in order — schema is the foundation, generation system is the engine
- Phase 3 depends on Phase 2 — schemas must exist before chains inject upstream content into downstream prompts
- Phase 4 depends on Phase 2 — section-level iteration requires section-level storage from the schema
- Phase 5 depends on Phase 3 — packages are coordinated chains; requires chain infrastructure
- Phase 6 depends on Phases 4 and 2 — onboarding uses organic detection; PDF uses deliverable schemas
- Phases 4 and 5 can be built in parallel after Phase 3 completes

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 2 (Deliverable Generation):** Canonical schemas per type have significant downstream implications for every other phase; section-level storage model needs careful design before any iteration logic is built
- **Phase 3 (Cross-Agent Chains):** Token budget management for multi-hop context injection is the technically hardest new piece; needs explicit design before implementation
- **Phase 4 (Organic Detection):** Intent classification boundary between "deliverable-adjacent" and genuine production intent; diff library choice and render performance
- **Phase 6 (Onboarding + PDF):** Project type classifier design; PDF template development and testing against real LLM-generated content lengths

Phases with standard patterns (skip research-phase):
- **Phase 1 (Database Foundation):** Drizzle migration + CRUD routes follow established codebase patterns exactly
- **Phase 5 (Packages + Background):** Extends existing pg-boss queue with new job type; package template structure is configuration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing packages confirmed from direct `package.json` and `tailwind.config.ts` inspection; four new packages are mature, well-documented libraries with clear use cases |
| Features | MEDIUM-HIGH | Competitor analysis based on training data through Aug 2025; Claude Artifacts and ChatGPT Canvas are extensively documented (HIGH); Jasper and Copy.ai product details are MEDIUM due to significant 2024 product changes |
| Architecture | HIGH | Based entirely on direct codebase analysis; no external speculation; all proposed patterns reuse established codebase patterns from v1.0–v1.3 |
| Pitfalls | HIGH | Grounded in direct codebase analysis plus well-documented failure modes in artifact panels, LLM output pipelines, and multi-agent orchestration; phase attribution is specific and actionable |

**Overall confidence:** HIGH

### Gaps to Address

- **Token budget management for multi-hop chains:** How to handle the case where PRD (2,000 words) + Tech Spec (2,500 words) must both be injected into the Designer's context for a design brief; the intelligent truncation strategy (section headings + 100 words per section) needs explicit token-count validation before Phase 3 implementation begins
- **Deliverable type schema definitions:** Canonical section names, ordering, and word count targets for each deliverable type (PRD, TechSpec, DesignBrief, GTMPlan, BlogPost, SOP) need to be defined before Phase 2 begins; this is content design, not code design, and requires domain knowledge
- **Gemini 2.5-Flash quality variance:** The research notes Gemini Flash has higher quality variance than GPT-4o; if deliverable generation quality is inconsistent in testing, the LLM routing policy (currently Gemini Pro for autonomy tasks in Pro tier) may need a `deliverable_generation` override route
- **Stale reference UX design:** The "Tech Spec may be outdated" warning UX is not addressed in the architecture research — how prominent, how to trigger re-generation, what to show when multiple downstream documents are affected; needs UX design before Phase 3

## Sources

### Primary (HIGH confidence)
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/package.json` — all existing package versions confirmed directly
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/tailwind.config.ts` — `@tailwindcss/typography` confirmed in plugins array
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/client/src/components/MessageBubble.tsx` — existing `react-markdown` + `remark-gfm` + `rehype-highlight` usage pattern
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/shared/schema.ts` — confirmed no `deliverables` table exists; existing table structure reviewed
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/server/autonomy/handoff/handoffOrchestrator.ts` — handoff payload structure; basis for `deliverableContext` extension
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/shared/roleRegistry.ts` + `shared/roleIntelligence.ts` — 30-role system; `deliverableTypes` extension point confirmed
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/.planning/PROJECT.md` — v2.0 deliverable system requirements; cross-agent chain requirement

### Secondary (MEDIUM-HIGH confidence)
- **Claude Artifacts** (Anthropic, Oct 2024) — split-panel UX, version history, in-place iteration; extensively documented; HIGH confidence on shipped feature set as of Aug 2025
- **ChatGPT Canvas** (OpenAI, Oct 2024) — collaborative editor model, track-changes, targeted editing; extensively covered; HIGH confidence
- **Notion AI** — stable 2023–2025 feature set; inline generation, AI columns, workspace Q&A; HIGH confidence
- **Jasper AI campaign mode** — MEDIUM confidence due to significant 2024 product pivots
- **Copy.ai Workflows** — MEDIUM confidence due to 2024 enterprise GTM pivot

### Tertiary
- `@react-pdf/renderer` suitability (2.4M weekly downloads, active maintenance) — corroborated by npm adoption data and training knowledge; no direct version testing in this session

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
