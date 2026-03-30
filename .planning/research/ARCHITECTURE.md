# Architecture Research

**Domain:** Deliverable/Artifact system added to existing AI team chat app (Hatchin v2.0)
**Researched:** 2026-03-25
**Confidence:** HIGH — based on direct codebase analysis, no external speculation

> **Note:** This file supersedes the v1.3 frontend architecture research. v2.0 adds a deliverable production layer on top of the existing autonomy pipeline. The v1.3 sidebar architecture (SidebarTabBar, ActivityTab, etc.) remains valid and is assumed shipped.

---

## System Overview

### Where the New System Sits in the Existing Architecture

```
FRONTEND (React 18)
┌──────────────────┬───────────────────────────┬───────────────────────────────┐
│   LeftSidebar    │       CenterPanel          │       RightSidebar            │
│                  │                            │  (tabs: Activity/Brain/       │
│  NEW: Package    │  MODIFIED:                 │   Approvals — from v1.3)      │
│  list under      │  - Render DeliverableCard  │                               │
│  project tree    │    for deliverable_created │  NEW: ArtifactPanel overlay   │
│                  │    WS event                │  - Slides over sidebar        │
│                  │  - activeDeliverableId     │  - Claude desktop pattern     │
│                  │    in WS message metadata  │  - Version history drawer     │
│                  │    when panel open         │  - Iterate via chat input     │
└──────────────────┴───────────────────────────┴───────────────────────────────┘
                           │ CustomEvent bridge (existing pattern)
                           │
BACKEND (Express + Drizzle ORM)
┌──────────────────┬───────────────────────────┬───────────────────────────────┐
│ server/routes/   │   server/ai/              │  server/autonomy/             │
│                  │                            │                               │
│ NEW:             │  MODIFIED: chat.ts         │  MODIFIED: handoff            │
│ deliverables.ts  │  - detect [[DELIVERABLE:]] │  orchestrator to carry        │
│ packages.ts      │    block post-stream       │  deliverableContext in        │
│                  │  - call deliverable-       │  structuredHandoff            │
│                  │    Generator after         │                               │
│                  │    streaming completes     │  NEW: deliverable             │
│                  │                            │  ChainOrchestrator.ts         │
│                  │  NEW:                      │  (seeds task graph from       │
│                  │  deliverableGenerator.ts   │   deliverable type registry)  │
└──────────────────┴───────────────────────────┴───────────────────────────────┘
                           │
SHARED
┌──────────────────┬───────────────────────────┬───────────────────────────────┐
│  shared/         │  shared/roleRegistry.ts   │  shared/dto/wsSchemas.ts      │
│  schema.ts       │  MODIFIED: +deliverable   │  MODIFIED: +4 deliverable     │
│  MODIFIED:       │  Types: string[]          │  WS event types               │
│  +deliverables   │                            │                               │
│  +packages       │  shared/roleIntelligence  │  shared/                      │
│  +deliverable_   │  MODIFIED: +deliverable   │  deliverableTypeRegistry.ts   │
│   versions       │  Prompt: string           │  NEW: role → types map +      │
│                  │                            │  chain dependency graph       │
└──────────────────┴───────────────────────────┴───────────────────────────────┘
                           │
DATABASE (Neon PostgreSQL via Drizzle)
┌─────────────────────────────────────────────────────────────────────────────┐
│  NEW: deliverables table    NEW: packages table                              │
│  NEW: deliverable_versions table (immutable iteration history)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### New Components

| Component | Responsibility | Lives In |
|-----------|----------------|----------|
| `deliverables` DB table | Persistent artifact storage with current content | `shared/schema.ts` |
| `packages` DB table | Named groups of linked deliverables | `shared/schema.ts` |
| `deliverable_versions` DB table | Immutable version snapshots, iteration history | `shared/schema.ts` |
| `server/routes/deliverables.ts` | CRUD + versioning endpoints, export trigger | `server/routes/` |
| `server/routes/packages.ts` | Package CRUD, progress aggregation | `server/routes/` |
| `server/ai/deliverableGenerator.ts` | Role-aware LLM prompt for document production and iteration | `server/ai/` |
| `server/autonomy/deliverableChainOrchestrator.ts` | Seeds task graph from deliverable type chain; delegates execution to existing handoff orchestrator | `server/autonomy/` |
| `shared/deliverableTypeRegistry.ts` | Role → deliverable types map; chain dependency graph (which types unlock which) | `shared/` |
| `client/src/components/ArtifactPanel.tsx` | Full deliverable viewer/editor overlay, version history, export button | `client/src/components/` |
| `client/src/components/DeliverableCard.tsx` | Chat bubble variant that announces a deliverable with title + open button | `client/src/components/` |
| `client/src/components/PackageView.tsx` | Package progress overview with linked deliverable list | `client/src/components/` |
| `client/src/hooks/useDeliverable.ts` | TanStack Query for loading deliverable + version list | `client/src/hooks/` |
| `client/src/hooks/useArtifactPanel.ts` | Panel open/close state + active deliverable ID tracking | `client/src/hooks/` |

### Modified Existing Components

| Component | What Changes | Why |
|-----------|--------------|-----|
| `shared/schema.ts` | Add 3 tables, insert schemas, type exports | Deliverable persistence |
| `shared/roleRegistry.ts` | Add optional `deliverableTypes?: string[]` to `RoleDefinition` | Role → deliverable type mapping used by UI |
| `shared/roleIntelligence.ts` | Add optional `deliverablePrompt?: string` to `RoleIntelligence` | Role-specific LLM prompt for document generation |
| `shared/dto/wsSchemas.ts` | Add 4 WS event types: `deliverable_created`, `deliverable_updated`, `package_progress`, `deliverable_chain_started` | Real-time artifact events |
| `server/storage.ts` | Add 8 `IStorage` interface methods + implementations in both `MemStorage` and `DatabaseStorage` | Storage abstraction requirement |
| `server/routes.ts` | Register `registerDeliverableRoutes()` and `registerPackageRoutes()` | Route wiring |
| `server/routes/chat.ts` | Add `handleDeliverableEmission()` called post-stream; detect `metadata.activeDeliverableId` for iteration path | Deliverable creation + iteration hooks |
| `server/ai/actionParser.ts` | Add `parseDeliverableBlock()` for `[[DELIVERABLE: type: title]]` blocks | Reuse existing parse infrastructure |
| `server/autonomy/handoff/handoffOrchestrator.ts` | Add `deliverableContext` field to `structuredHandoff` when upstream task produced a deliverable | Chain document passing |
| `server/autonomy/config/policies.ts` | Add `MAX_DELIVERABLE_CHAIN_DEPTH` constant | Chain depth guard |
| `client/src/components/CenterPanel.tsx` | Handle `deliverable_created` WS event; dispatch `open_artifact_panel` CustomEvent; tag outgoing messages with `activeDeliverableId` when panel is open | UI wiring |
| `client/src/components/RightSidebar.tsx` | Listen for `open_artifact_panel` CustomEvent; render `ArtifactPanel` as overlay | Panel container |
| `client/src/components/MessageBubble.tsx` | Handle `messageType: 'deliverable'` to render `DeliverableCard` | New message type |
| `client/src/hooks/useRealTimeUpdates.ts` | Add 4 new WS event cases dispatching CustomEvents for deliverable events | Event pipeline |

---

## Recommended Project Structure (New Files Only)

```
shared/
├── schema.ts                          # MODIFIED: +deliverables, packages, deliverable_versions
├── roleRegistry.ts                    # MODIFIED: +deliverableTypes?: string[] per role
├── roleIntelligence.ts                # MODIFIED: +deliverablePrompt?: string per role
├── deliverableTypeRegistry.ts         # NEW: types, chain graph, owner roles
└── dto/
    └── wsSchemas.ts                   # MODIFIED: +4 deliverable WS event types

server/
├── routes/
│   ├── deliverables.ts                # NEW: CRUD + versioning endpoints
│   └── packages.ts                    # NEW: package CRUD + progress
├── ai/
│   ├── actionParser.ts                # MODIFIED: +parseDeliverableBlock()
│   └── deliverableGenerator.ts        # NEW: role-aware deliverable production + iteration
└── autonomy/
    └── deliverableChainOrchestrator.ts # NEW: seeds task graph from chain registry

client/src/
├── components/
│   ├── ArtifactPanel.tsx              # NEW: deliverable viewer overlay
│   ├── DeliverableCard.tsx            # NEW: chat bubble for deliverable announcement
│   ├── PackageView.tsx                # NEW: package overview + linked deliverables
│   ├── CenterPanel.tsx                # MODIFIED: deliverable WS event + panel dispatch
│   ├── RightSidebar.tsx               # MODIFIED: mount ArtifactPanel overlay
│   └── MessageBubble.tsx              # MODIFIED: deliverable messageType
└── hooks/
    ├── useDeliverable.ts              # NEW: TanStack Query hook
    └── useArtifactPanel.ts            # NEW: panel state management
```

---

## Data Model

### New Tables — Add to `shared/schema.ts`

```typescript
// Deliverable: a single artifact produced by an agent
export const deliverables = pgTable("deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  packageId: varchar("package_id"),              // nullable — references packages.id once packages table exists
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  messageId: varchar("message_id"),              // nullable — announcement message in chat
  title: text("title").notNull(),
  deliverableType: text("deliverable_type").notNull(),  // "prd", "tech-spec", "design-brief", etc.
  content: text("content").notNull(),            // current version content (Markdown)
  version: integer("version").notNull().default(1),
  status: text("status").notNull()
    .$type<"draft" | "in_review" | "approved" | "exported">()
    .default("draft"),
  upstreamDeliverableId: varchar("upstream_deliverable_id"),  // nullable self-reference for chain
  handoffChain: jsonb("handoff_chain").$type<string[]>().default([]),  // agentIds in order
  metadata: jsonb("metadata").$type<{
    wordCount?: number;
    exportedAt?: string;
    pdfUrl?: string;
    taskId?: string;
    conversationId?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("deliverables_project_id_idx").on(table.projectId),
  agentIdIdx: index("deliverables_agent_id_idx").on(table.agentId),
}));

// Package: named group of linked deliverables
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),               // "Launch Package", "Content Sprint"
  description: text("description"),
  status: text("status").notNull()
    .$type<"planning" | "in_progress" | "complete">()
    .default("planning"),
  deliverableCount: integer("deliverable_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("packages_project_id_idx").on(table.projectId),
}));

// Version snapshots: immutable history
export const deliverableVersions = pgTable("deliverable_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").references(() => deliverables.id).notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changeDescription: text("change_description"),
  triggeredBy: text("triggered_by").notNull()
    .$type<"user" | "agent" | "iteration">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  deliverableIdIdx: index("deliverable_versions_deliverable_id_idx").on(table.deliverableId),
}));
```

**Design rationale:**
- `content` stays on `deliverables` row (current version) — fast reads without joining versions table
- `deliverable_versions` is append-only — never update, only insert on each iteration
- `upstreamDeliverableId` is nullable self-reference — encodes chain graph without a separate join table
- `packageId` is nullable — deliverables can exist standalone before grouping
- `text` for content (not JSONB) — searchable, works with future `tsvector` full-text search, simpler to render in frontend

---

## Architectural Patterns

### Pattern 1: Deliverable Intent Detection via Action Block Extension

The chat pipeline in `server/routes/chat.ts` already parses `[[ACTION: ...]]` blocks from agent responses via `server/ai/actionParser.ts`. Deliverable detection reuses this exact infrastructure.

**When to use:** Agent responds to a deliverable-type request (write a PRD, draft a tech spec, etc.)

**How it works:**
1. System prompt for deliverable-capable roles includes: "If you are producing a deliverable document, begin your response with `[[DELIVERABLE: type: title]]`."
2. `actionParser.ts` gets a new `parseDeliverableBlock()` function (parallel to existing `parseAction()`).
3. Post-stream handler in `chat.ts` calls `parseDeliverableBlock()` on the completed response.
4. If found: strip the block from persisted message content, call `deliverableGenerator.createFromResponse()`, broadcast `deliverable_created` WS event.

**Trade-offs:** Post-stream detection means the deliverable is created after the chat response — small latency. The alternative (dedicated endpoint) requires the user to explicitly request a deliverable, which breaks the "just talk" philosophy.

```typescript
// Extension to server/ai/actionParser.ts
export interface ParsedDeliverable {
  type: string;   // "prd", "tech-spec", "design-brief", etc.
  title: string;
}

export function parseDeliverableBlock(content: string): ParsedDeliverable | null {
  const match = content.match(/\[\[DELIVERABLE:\s*([^:]+?):\s*(.+?)\]\]/i);
  if (!match) return null;
  return { type: match[1].trim().toLowerCase(), title: match[2].trim() };
}
```

### Pattern 2: ArtifactPanel as CustomEvent-Driven Overlay

The ArtifactPanel follows the exact same cross-component communication pattern already established in v1.3 for AI streaming state, tasks, and autonomy events. It uses `window.dispatchEvent` / `window.addEventListener`.

**When to use:** When user clicks DeliverableCard in chat, or when `deliverable_created` WS event fires for the active project.

**How it works:**
- CenterPanel dispatches `open_artifact_panel` CustomEvent with `deliverableId`
- RightSidebar listens, sets `activeDeliverableId` state, renders `ArtifactPanel` as an absolute-positioned overlay
- ArtifactPanel listens for `deliverable_updated` WS events (re-dispatched from CenterPanel) and re-fetches via `useDeliverable`
- Closing dispatches `close_artifact_panel` CustomEvent

**Trade-offs:** Overlay keeps RightSidebar tab state intact (CSS-hide, preserves scroll/draft — same decision as v1.3). Creating a new route (`/deliverables/:id`) breaks conversation context — user needs both chat and document visible.

```typescript
// CenterPanel — when deliverable card clicked or deliverable_created fires:
window.dispatchEvent(new CustomEvent('open_artifact_panel', {
  detail: { deliverableId: string, autoOpen: boolean }
}));

// RightSidebar — listens:
React.useEffect(() => {
  const handler = (e: Event) => {
    const { deliverableId } = (e as CustomEvent<{ deliverableId: string }>).detail;
    setActiveDeliverableId(deliverableId);
    setPanelOpen(true);
  };
  window.addEventListener('open_artifact_panel', handler);
  return () => window.removeEventListener('open_artifact_panel', handler);
}, []);
```

### Pattern 3: Iteration via Chat Input Tag

When ArtifactPanel is open, the user's chat input becomes the iteration interface — no separate "edit mode" UI needed. The frontend tags outgoing WS messages with `activeDeliverableId` from `useArtifactPanel`.

**When to use:** User types "add a competitive analysis section" or "make this more concise" while viewing a PRD in the panel.

**Backend handling in `chat.ts`:**
```typescript
// Near top of send_message_streaming handler:
if (payload.metadata?.activeDeliverableId) {
  await handleDeliverableIteration({
    deliverableId: payload.metadata.activeDeliverableId,
    instruction: payload.message.content,
    agent, project, storage, broadcastToConversation, generateText
  });
  return; // skip normal chat response path
}
```

The `handleDeliverableIteration` helper:
1. Loads `deliverables` row content
2. Sends focused prompt to LLM: "Here is the current [PRD]. User instruction: [instruction]. Return the complete updated document."
3. Creates version row in `deliverable_versions`
4. Updates `deliverables.content` + `version`
5. Broadcasts `deliverable_updated` WS event (CenterPanel re-dispatches as CustomEvent → ArtifactPanel re-fetches)

**Trade-offs:** Skipping the normal chat response path means iteration messages don't get a normal agent reply. A brief acknowledgment message ("Got it, updating the PRD...") should be sent before the iteration begins to avoid a silent UI. This can be a simple `streaming_started` + `streaming_completed` with the acknowledgment text.

### Pattern 4: Deliverable Chain as Extended Handoff

The existing handoff orchestrator finds next tasks via `metadata.dependsOn`. Deliverable chains use the same task-dependency mechanism — `deliverableChainOrchestrator.ts` seeds the task graph, then the existing `handoffOrchestrator.ts` executes it.

**`deliverableChainOrchestrator.ts` is a thin seeder:**
1. Accept a "root deliverable type" (e.g., "prd") and projectId
2. Look up `chainInputs` in `deliverableTypeRegistry` to find dependent types (tech-spec, design-brief, gtm-plan)
3. Find the right agents for each dependent type via conductor
4. Create tasks with `metadata.dependsOn` relationships
5. Queue the first task via `queueTaskExecution()`
6. Existing handoff orchestrator handles the rest

**Key addition to `handoffOrchestrator.ts`:**
```typescript
// When queueing next task, check if upstream task produced a deliverable:
const upstreamDeliverable = await input.storage.getDeliverableByTaskId(input.completedTask.id);
if (upstreamDeliverable) {
  structuredHandoff.deliverableContext = {
    id: upstreamDeliverable.id,
    title: upstreamDeliverable.title,
    content: upstreamDeliverable.content.slice(0, 3000), // context window budget
  };
}
```

No new execution pipeline, no duplicate cycle detection, no separate budget system. The deliverable chain inherits `MAX_HANDOFF_HOPS` from `policies.ts`.

---

## Data Flow: LLM Response → Deliverable Storage → UI → Iteration

```
1. USER SENDS MESSAGE
   CenterPanel → WebSocket send_message_streaming
   (includes activeDeliverableId in metadata if panel open)
        │
        ├── activeDeliverableId present? → ITERATION PATH (see below)
        │
        ▼ (normal chat flow)
2. AGENT RESPONDS (LLM streaming)
   chat.ts → streaming_chunk WS events → CenterPanel renders
        │
        ▼
3. STREAM COMPLETE
   chat.ts: parseDeliverableBlock(completedContent)
        │
        ├── [[DELIVERABLE: prd: My App PRD]] found? → CREATION PATH
        │        │
        │        ▼
        │   deliverableGenerator.createFromResponse()
        │   - strips [[DELIVERABLE:...]] from persisted message content
        │   - calls generateChatWithRuntimeFallback with role-specific prompt
        │   - returns structured Markdown document
        │        │
        │        ▼
        │   storage.createDeliverable(...)   → writes deliverables row
        │   storage.createDeliverableVersion(...)  → writes version 1
        │        │
        │        ▼
        │   broadcastToConversation('deliverable_created', { deliverableId, title, ... })
        │        │
        │        ▼
        │   CenterPanel WS handler → 'deliverable_created' case
        │   → Appends DeliverableCard to message list
        │   → Dispatches open_artifact_panel CustomEvent
        │        │
        │        ▼
        │   RightSidebar listener → sets activeDeliverableId
        │   ArtifactPanel mounts → useDeliverable fetches GET /api/deliverables/:id
        │   → Panel opens with new deliverable
        │
        └── no deliverable block? → normal message save, no artifact side effects
        │

ITERATION PATH:
        │
        ▼
4. ITERATION HANDLER (handleDeliverableIteration in chat.ts)
   - GET storage.getDeliverable(activeDeliverableId) → current content
   - LLM call: focused iteration prompt with current doc + user instruction
   - storage.createDeliverableVersion(N+1, newContent)
   - storage.updateDeliverable({ content: newContent, version: N+1 })
   - broadcastToConversation('deliverable_updated', { deliverableId, version: N+1 })
   - send brief acknowledgment message to chat ("PRD updated.")
        │
        ▼
5. ARTIFACT PANEL UPDATE
   CenterPanel receives 'deliverable_updated' WS event
   → Dispatches CustomEvent → ArtifactPanel re-fetches via useDeliverable
   → Panel content updates in place, version counter increments
```

---

## WebSocket Events (New — Add to `shared/dto/wsSchemas.ts`)

```typescript
// Server → Client
{ type: 'deliverable_created';
  deliverableId: string;
  title: string;
  deliverableType: string;
  agentId: string;
  agentName: string;
  packageId: string | null;
  projectId: string; }

{ type: 'deliverable_updated';
  deliverableId: string;
  version: number;
  changeDescription: string | null; }

{ type: 'package_progress';
  packageId: string;
  name: string;
  completedCount: number;
  deliverableCount: number;
  status: 'planning' | 'in_progress' | 'complete'; }

{ type: 'deliverable_chain_started';
  packageId: string;
  agentSequence: Array<{ agentId: string; agentName: string; deliverableType: string }>; }
```

---

## API Routes (New — Add to `server/routes/`)

```
# Deliverables
GET    /api/projects/:projectId/deliverables         → Deliverable[]
GET    /api/deliverables/:id                         → Deliverable
GET    /api/deliverables/:id/versions                → DeliverableVersion[]
POST   /api/deliverables                             → create (manual trigger, body: { projectId, agentId, title, deliverableType, content })
PATCH  /api/deliverables/:id                         → { status?, title? }
DELETE /api/deliverables/:id                         → 204

# Packages
GET    /api/projects/:projectId/packages             → Package[]
GET    /api/packages/:id                             → Package with deliverables[]
POST   /api/packages                                 → create (body: { projectId, name, description })
PATCH  /api/packages/:id                             → { status?, name?, description? }
DELETE /api/packages/:id                             → 204

# Export
POST   /api/deliverables/:id/export                 → { url: string } (PDF)
POST   /api/packages/:id/export                     → { url: string } (PDF package / zip)
```

All routes require `req.session.userId`. Ownership check: load project via `storage.getProject(projectId)`, verify `project.userId === req.session.userId`.

---

## IStorage Extensions (Add to `server/storage.ts`)

```typescript
// Add to IStorage interface — both MemStorage and DatabaseStorage must implement:
getDeliverablesByProject(projectId: string): Promise<Deliverable[]>;
getDeliverable(id: string): Promise<Deliverable | undefined>;
getDeliverableByTaskId(taskId: string): Promise<Deliverable | undefined>;  // for handoff lookup
createDeliverable(data: InsertDeliverable): Promise<Deliverable>;
updateDeliverable(id: string, updates: Partial<Deliverable>): Promise<Deliverable | undefined>;
deleteDeliverable(id: string): Promise<boolean>;
getDeliverableVersions(deliverableId: string): Promise<DeliverableVersion[]>;
createDeliverableVersion(data: InsertDeliverableVersion): Promise<DeliverableVersion>;

getPackagesByProject(projectId: string): Promise<Package[]>;
getPackage(id: string): Promise<Package | undefined>;
createPackage(data: InsertPackage): Promise<Package>;
updatePackage(id: string, updates: Partial<Package>): Promise<Package | undefined>;
deletePackage(id: string): Promise<boolean>;
```

`getDeliverableByTaskId` queries `deliverables WHERE metadata->>'taskId' = $1` — one JSONB field lookup, not a full scan.

---

## deliverableTypeRegistry (New Shared File)

Centralizes the deliverable type definitions and chain dependency graph. Referenced by:
- `deliverableGenerator.ts` — which LLM prompt to use
- `deliverableChainOrchestrator.ts` — which types to produce next
- Frontend `ArtifactPanel.tsx` — type badge display
- Frontend "New deliverable" button — which types are available for which agents

```typescript
// shared/deliverableTypeRegistry.ts
export interface DeliverableTypeDefinition {
  id: string;           // "prd", "tech-spec", "design-brief", etc.
  label: string;        // "Product Requirements Document"
  shortLabel: string;   // "PRD"
  ownerRole: string;    // primary role that produces this type
  canAlsoProduceRoles?: string[];  // secondary roles
  chainInputs?: string[];          // types this one requires as upstream context
  description: string;
}

export const DELIVERABLE_TYPES: DeliverableTypeDefinition[] = [
  { id: "prd",              label: "Product Requirements Document",  shortLabel: "PRD",       ownerRole: "Product Manager",      chainInputs: [] },
  { id: "tech-spec",        label: "Technical Specification",        shortLabel: "Tech Spec", ownerRole: "Software Engineer",    chainInputs: ["prd"] },
  { id: "design-brief",     label: "Design Brief",                   shortLabel: "Brief",     ownerRole: "Product Designer",     chainInputs: ["prd"] },
  { id: "gtm-plan",         label: "Go-to-Market Plan",              shortLabel: "GTM",       ownerRole: "Growth Marketer",      chainInputs: ["prd"] },
  { id: "test-plan",        label: "Test Plan",                      shortLabel: "Test Plan", ownerRole: "QA Lead",              chainInputs: ["tech-spec"] },
  { id: "blog-post",        label: "Blog Post",                      shortLabel: "Blog",      ownerRole: "Content Writer",       chainInputs: [] },
  { id: "content-calendar", label: "Content Calendar",               shortLabel: "Calendar",  ownerRole: "Social Media Manager", chainInputs: ["gtm-plan"] },
  { id: "email-sequence",   label: "Email Drip Sequence",            shortLabel: "Emails",    ownerRole: "Email Specialist",     chainInputs: ["gtm-plan"] },
  { id: "comp-analysis",    label: "Competitive Analysis",           shortLabel: "Comp",      ownerRole: "Business Analyst",     chainInputs: [] },
  { id: "project-plan",     label: "Project Plan",                   shortLabel: "Plan",      ownerRole: "Operations Manager",   chainInputs: ["prd"] },
];

// Chain structure (what a root type unlocks):
// prd → tech-spec, design-brief, gtm-plan, project-plan
// tech-spec → test-plan
// gtm-plan → content-calendar, email-sequence
```

---

## Build Order (Phase Dependencies)

Each phase has a hard compile dependency on the previous phase. Phases within a phase can be parallelized.

### Phase 1: Data Layer
**Why first:** Schema, types, and IStorage interface changes are the foundation everything imports.

1. Add 3 tables to `shared/schema.ts` (deliverables, packages, deliverable_versions)
2. Add insert schemas and type exports
3. Add `IStorage` interface methods
4. Implement in `MemStorage` (enables fast dev loop without DB)
5. Implement in `DatabaseStorage`
6. Run `npm run db:push`
7. Create `shared/deliverableTypeRegistry.ts`

**Gate:** `npm run typecheck` passes. No UI or routes yet.

### Phase 2: Server Routes
**Why second:** Routes can be verified via direct API calls before any UI. Early exposure of auth/validation bugs.

1. Create `server/routes/deliverables.ts` (CRUD + versioning)
2. Create `server/routes/packages.ts`
3. Register both in `server/routes.ts`
4. Add 4 WS event types to `shared/dto/wsSchemas.ts`

**Gate:** `npm run typecheck` passes. Manual `curl` tests confirm CRUD works.

### Phase 3: AI Deliverable Generator
**Why third:** Self-contained module. Can integration-test without UI.

1. Create `server/ai/deliverableGenerator.ts` (uses `generateChatWithRuntimeFallback`)
2. Add `deliverablePrompt?: string` to `RoleIntelligence` interface
3. Add `deliverableTypes?: string[]` to `RoleDefinition` interface
4. Fill `deliverablePrompt` for 8 primary roles (PM, Engineer, Designer, Marketer, QA, Copywriter, Social, BA)
5. Add `parseDeliverableBlock()` to `server/ai/actionParser.ts`
6. Add `handleDeliverableEmission()` helper to `server/routes/chat.ts`; call it post-stream

**Gate:** Chat with PM: "write a PRD for my app" → DB row created in `deliverables` → WS event fired (check server logs).

### Phase 4: Artifact Panel UI
**Why fourth:** UI built against working API. Enables rapid visual iteration.

1. Create `client/src/hooks/useDeliverable.ts`
2. Create `client/src/hooks/useArtifactPanel.ts`
3. Create `client/src/components/DeliverableCard.tsx`
4. Create `client/src/components/ArtifactPanel.tsx` (view + version history sidebar)
5. Modify `client/src/components/MessageBubble.tsx` — handle `messageType: 'deliverable'`
6. Modify `client/src/hooks/useRealTimeUpdates.ts` — add `deliverable_created`, `deliverable_updated` cases
7. Modify `client/src/components/CenterPanel.tsx` — dispatch `open_artifact_panel` CustomEvent
8. Modify `client/src/components/RightSidebar.tsx` — overlay ArtifactPanel

**Gate:** Create deliverable via API → DeliverableCard appears in chat → click opens ArtifactPanel.

### Phase 5: Iteration Protocol
**Why fifth:** Depends on Phase 4 (panel open state) and Phase 3 (generator working).

1. `useArtifactPanel.ts` exposes `activeDeliverableId` (already built in Phase 4)
2. CenterPanel includes `activeDeliverableId` in WS message metadata when non-null
3. `chat.ts` handler: detect `metadata.activeDeliverableId` → delegate to iteration handler
4. Implement `handleDeliverableIteration()` in `deliverableGenerator.ts`
5. ArtifactPanel subscribes to `deliverable_updated` CustomEvent → re-fetches

**Gate:** Open panel → type "add a risks section" → panel updates with new content, version counter bumps.

### Phase 6: Deliverable Chain Orchestration
**Why sixth:** Requires Phase 3 (generator) and Phase 1 (data layer). Chain is additive — standalone deliverables work without it.

1. Create `server/autonomy/deliverableChainOrchestrator.ts`
2. Extend `handoffOrchestrator.ts` to add `deliverableContext` to `structuredHandoff`
3. Add `getDeliverableByTaskId` to `IStorage` and implementations
4. Wire chain trigger: when user requests a package (e.g., "build the launch package"), call `deliverableChainOrchestrator`
5. Create `client/src/components/PackageView.tsx`
6. Wire package routes

**Gate:** PM produces PRD → system queues tech-spec task for Engineer → Engineer produces tech-spec referencing PRD → both appear in same package in UI.

### Phase 7: Export
**Why last:** Pure enhancement. Everything else works without it. PDF generation is isolated.

1. Choose PDF library: `@react-pdf/renderer` (client-side) or server-side `puppeteer`/`playwright` HTML→PDF
2. Implement `POST /api/deliverables/:id/export`
3. Implement `POST /api/packages/:id/export`
4. Add export button in ArtifactPanel

**Recommended:** Server-side HTML→PDF using headless browser (Puppeteer/Playwright). Client-side PDF rendering via `@react-pdf/renderer` requires writing a separate PDF layout component and produces lower-quality output for complex documents. At MVP scale, synchronous generation on the same Node.js process is acceptable; at >100 concurrent exports, move to pg-boss background job.

**Gate:** Click "Export PDF" → file downloads with correct content.

---

## Integration Points: Each Existing Module

### `server/routes/chat.ts`

**Current state:** ~2,878 lines. Already runs post-stream hooks for task detection (`classifyTaskIntent`), brain updates (`brain_updated_from_chat`), and autonomy triggers.

**Change:** Add `handleDeliverableEmission()` as a new post-stream hook in the same location as `classifyTaskIntent`. It must NOT be inlined — extract as a named function to avoid further inflating the file.

```typescript
// Called after streaming_completed is broadcast:
await handleDeliverableEmission({
  agentResponse: finalContent,
  agent, project, conversationId,
  storage, broadcastToConversation, generateText
});
```

**Iteration path:** At the START of the streaming handler, before calling the LLM, check for `payload.metadata?.activeDeliverableId`. If present, delegate to `handleDeliverableIteration()` and return early — do not enter the normal chat flow.

### `server/ai/actionParser.ts`

**Current state:** Parses `[[ACTION: ...]]` and `[[UPDATE: ...]]` blocks. Simple regex + string operations.

**Change:** Add `parseDeliverableBlock()` function following the exact same pattern as the existing parsers. Zero new dependencies.

### `server/autonomy/handoff/handoffOrchestrator.ts`

**Current state:** Finds dependent tasks, evaluates conductor decision, attaches `structuredHandoff` to task metadata, queues execution.

**Change:** After computing `structuredHandoff`, optionally look up whether the completed task produced a deliverable. If so, attach `deliverableContext`. One async DB call added. No structural changes.

### `server/ai/openaiService.ts` / `server/llm/providerResolver.ts`

**No changes needed.** `deliverableGenerator.ts` imports `generateChatWithRuntimeFallback` directly from `providerResolver.ts` — same pattern as all other LLM-calling modules. Billing tracking and provider fallback apply automatically.

### `shared/roleRegistry.ts` and `shared/roleIntelligence.ts`

**Change:** Add one optional field to each interface. Existing 30 role entries need no immediate updates — `deliverableTypes?: string[]` defaults to `undefined` (treated as empty array). Only the 8-10 primary roles need prompts in the first release. The registry is additive by design (from v1.1).

### `client/src/components/CenterPanel.tsx`

**Current state:** Owns the single WebSocket connection. Dispatches CustomEvents for all autonomy WS events via `window.dispatchEvent`. Already handles `task_suggestions`, `task_created`, `upgrade_required`.

**Change:** Add two cases to the WS message handler switch:
```typescript
case 'deliverable_created':
  window.dispatchEvent(new CustomEvent('deliverable_created', { detail: msg }));
  break;
case 'deliverable_updated':
  window.dispatchEvent(new CustomEvent('deliverable_updated', { detail: msg }));
  break;
```

Additionally, when sending a message, include `activeDeliverableId` from `useArtifactPanel`:
```typescript
metadata: {
  ...existingMetadata,
  activeDeliverableId: activeDeliverableId ?? undefined,
}
```

### `client/src/components/RightSidebar.tsx`

**Current state:** After v1.3, is a tabbed shell (Activity / Brain & Docs / Approvals). Listens to CustomEvents for AI streaming state.

**Change:** Add a listener for `open_artifact_panel`. When fired, set `activeDeliverableId` state and render `<ArtifactPanel>` as an `absolute inset-0 z-50` overlay over the sidebar content. On close, clear state and dispatch `close_artifact_panel`. This keeps tab state intact behind the panel.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Single-node fine. `deliverable_versions` grows fast — monitor row count. Keep all content in DB. |
| 1k–100k users | Add composite index on `deliverable_versions(deliverable_id, version DESC)`. Prune versions > 30 days old or keep only last 10 per deliverable. Move PDF generation to pg-boss background jobs. |
| 100k+ users | Move `deliverable_versions.content` to blob storage (S3/R2). Store only URL + content hash in DB. Add full-text search index (`tsvector`) on `deliverables.content` for project-wide search. |

### First bottleneck: deliverable_versions table growth

A 5,000-word PRD edited 20 times = 100,000 words stored as 20 row copies. For MVP this is fine. First mitigation: keep only last 10 versions per deliverable (add a cleanup function called on `createDeliverableVersion`). Second mitigation: move content to blob storage.

### Second bottleneck: PDF generation latency

Synchronous Puppeteer/Playwright on the main Node.js process blocks the event loop for 1–3 seconds during PDF rendering. For MVP (<100 exports/day) this is acceptable. At scale: move to pg-boss background job, return `{ jobId }` immediately, emit `export_complete` WS event when done.

---

## Anti-Patterns

### Anti-Pattern 1: Own LLM Call Path in deliverableGenerator

**What people do:** `deliverableGenerator.ts` initializes its own Gemini/OpenAI client via `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)` directly.

**Why it's wrong:** Bypasses `recordUsage()` billing tracking, provider fallback chain, test mocking (`LLM_MODE=test`), and the reasoning cache. Deliverable generation won't appear in usage summaries and tests can't inject mock responses.

**Do this instead:** Accept `generateText: (prompt, system, maxTokens?) => Promise<string>` as a dependency parameter — the same pattern used in `ExecuteTaskInput` in `taskExecutionPipeline.ts`. The caller passes `generateChatWithRuntimeFallback` from `providerResolver.ts`.

### Anti-Pattern 2: Store Document Content in messages.content

**What people do:** When an agent "produces" a PRD, save the full 3,000-word document as the agent's chat message content in the `messages` table.

**Why it's wrong:** Messages are designed for short conversational turns. Long content breaks context window injection (the whole message history is injected into LLM prompts). It also makes versioning impossible — messages are treated as immutable by the integrity system.

**Do this instead:** Store document content in `deliverables.content`. The `messages` row stores only the announcement (short text + deliverable ID reference). `DeliverableCard` renders the link to open the panel.

### Anti-Pattern 3: Parallel Execution Engine in deliverableChainOrchestrator

**What people do:** Build `deliverableChainOrchestrator.ts` with its own task queue, agent routing, cycle detection, and safety gates.

**Why it's wrong:** Duplicates the entire autonomy pipeline (`handoffOrchestrator`, `queueTaskExecution`, `handoffTracker.detectCycle`, `MAX_HANDOFF_HOPS`). Creates two surfaces for bugs and two pipelines to maintain.

**Do this instead:** `deliverableChainOrchestrator.ts` is a thin seeder — it creates tasks with `metadata.dependsOn` and calls `queueTaskExecution()` for the first task. The existing handoff orchestrator handles everything from there. The orchestrator should be < 100 lines.

### Anti-Pattern 4: ArtifactPanel as a Separate React Route

**What people do:** Create `/deliverables/:id` as a new page in `App.tsx` using Wouter.

**Why it's wrong:** Users need to reference the conversation while editing. Full-page navigation removes the chat context. The back button breaks the expected "return to conversation" flow.

**Do this instead:** ArtifactPanel is an overlay component within `home.tsx`. Use URL query params (`?deliverable=:id`) for shareable deep links — `home.tsx` reads the param on mount and dispatches `open_artifact_panel` if set. This gives deep-linking without a route change.

### Anti-Pattern 5: Eager Panel Open for Every deliverable_created

**What people do:** Automatically open ArtifactPanel whenever any `deliverable_created` WS event fires, regardless of whether the user is actively engaged.

**Why it's wrong:** If a background agent produces a deliverable while the user is reading old messages, the panel forces itself open and disrupts the reading flow.

**Do this instead:** On `deliverable_created`, append a `DeliverableCard` to the message list (passive notification). Only auto-open the panel if the deliverable was created in response to the user's most recent message (check `conversationId` + recency). Otherwise, let the user click the DeliverableCard to open when ready.

---

## Sources

- Direct analysis of `/Users/shashankrai/Documents/hatching-mvp-5th-march/` codebase (2026-03-25)
- `server/autonomy/handoff/handoffOrchestrator.ts` — handoff chain and context propagation pattern
- `server/autonomy/execution/taskExecutionPipeline.ts` — dependency injection pattern for generateText
- `server/ai/actionParser.ts` — [[ACTION]] block parsing pattern to extend
- `shared/schema.ts` — JSONB patterns, self-reference patterns, index conventions
- `server/routes/tasks.ts` — RegisterTaskDeps pattern for route module dependencies
- `client/src/components/RightSidebar.tsx` — CustomEvent bridge pattern (existing, v1.3)
- `shared/roleIntelligence.ts` — how to extend role interface fields additively
- `CLAUDE.md` — architectural decisions, storage interface requirements, WS event conventions

---
*Architecture research for: Hatchin v2.0 Deliverable/Artifact System*
*Researched: 2026-03-25*
*Confidence: HIGH — based on direct codebase analysis*
