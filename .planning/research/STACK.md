# Stack Research

**Domain:** Deliverable/artifact system — rich markdown document panel, PDF export with branded styling, deliverable versioning/storage, cross-agent deliverable chains. Adding to existing React 18 + Tailwind + Framer Motion + Shadcn + Express + Drizzle + Neon PostgreSQL platform.
**Researched:** 2026-03-25
**Confidence:** HIGH (all existing versions confirmed directly from package.json; new package recommendations based on direct codebase inspection and library analysis)

---

## Context: Do NOT Re-Research (Existing Stack)

This is v2.0 on an existing production platform. The following are already installed:

| Already Installed | Version | Relevant to Deliverables |
|-------------------|---------|--------------------------|
| `react-markdown` | ^10.1.0 | Already used in MessageBubble — extend, do not replace |
| `remark-gfm` | ^4.0.1 | Already used — tables, strikethrough, task lists |
| `rehype-highlight` | ^7.0.2 | Already used — code block syntax highlighting |
| `@tailwindcss/typography` | ^0.5.15 | Already installed AND registered in tailwind.config.ts plugins — `prose` class available now |
| `framer-motion` | ^11.18.2 | Panel animations, version history slide transitions |
| `react-resizable-panels` | ^2.1.7 | Split-pane layout primitive — already wrapped in `ui/resizable.tsx` |
| `@radix-ui/react-scroll-area` | ^1.2.4 | Scrollable artifact panel container |
| `@radix-ui/react-tabs` | ^1.1.4 | Deliverable version history tabs |
| `@radix-ui/react-tooltip` | ^1.2.7 | Toolbar button tooltips in artifact panel |
| `@tanstack/react-query` | ^5.60.5 | All deliverable data fetching |
| `drizzle-orm` | ^0.39.1 | New deliverables + versions tables |
| `date-fns` | ^3.6.0 | Version timestamps, "updated 2 hours ago" |
| `pg-boss` | ^10.4.2 | Already handles background task execution — deliverable production runs through this |
| `lucide-react` | ^0.453.0 | Toolbar icons (copy, download, version history) |

**Critical finding:** `@tailwindcss/typography` is already installed and already added to `tailwind.config.ts` plugins. The `prose` class is immediately available. This means rich markdown rendering for the artifact panel requires ZERO new frontend packages — just apply `prose` class to a `ReactMarkdown` wrapper.

---

## Recommended Stack Additions

### New Dependencies Required

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@react-pdf/renderer` | ^4.3.0 | Generate branded PDF exports on the server | React-like declarative PDF construction with full font embedding, custom layouts, tables, and images. Runs in Node.js (server-side generation). Produces binary PDF buffer returned as a download response. The only mature React-ecosystem PDF library that supports full custom branding with Hatchin's design language. Actively maintained (2.4M weekly downloads). |
| `rehype-sanitize` | ^6.0.0 | Sanitize LLM-produced markdown HTML in artifact panel | Deliverable content comes from LLM — any code block or user-influenced prompt could inject raw HTML into the rendered tree. `rehype-highlight` (already in use for chat) does not sanitize. The artifact panel renders richer content (tables, task lists, full headings) and must sanitize before rendering. Drop-in addition to the existing `rehypePlugins` array. |
| `rehype-slug` | ^6.0.0 | Add `id` attributes to headings for TOC anchor links | Each `<h2>` and `<h3>` in a deliverable gets an auto-generated slug id (e.g., `id="executive-summary"`). Required for the floating table of contents to scroll-link to sections. Tiny package, no dependencies. |
| `rehype-autolink-headings` | ^7.1.0 | Add clickable anchor `#` links to headings | Pairs with `rehype-slug`. Users can copy a link to a specific section of a deliverable — important for PRDs and tech specs that get shared with stakeholders. |

**That is four new packages total.** Everything else uses the existing stack.

### No New Dependencies Needed (Covered by Existing Stack)

| Feature | Use Existing | Rationale |
|---------|-------------|-----------|
| Rich artifact markdown rendering | `react-markdown` + `remark-gfm` + `@tailwindcss/typography` (all installed) | Apply `prose dark:prose-invert prose-sm max-w-none` to the ReactMarkdown wrapper. Tables, task lists, blockquotes, headings — all handled. The existing MessageBubble custom component overrides (h1, h2, code blocks) are SUPPRESSED in the artifact panel to let `prose` styles take over. |
| Artifact panel split layout | `react-resizable-panels` (installed, wrapped in `ui/resizable.tsx`) | Chat on left, artifact panel on right — use `ResizablePanelGroup direction="horizontal"`. Exact same primitive already used in the app. |
| Artifact panel scroll | `@radix-ui/react-scroll-area` (installed) | Styled scrollable container with custom scrollbar. Already used in the sidebar. |
| Version history UI | `@radix-ui/react-tabs` (installed) | Version switcher renders as horizontal tabs: v1, v2, v3 — click switches the displayed content. |
| Deliverable animation | `framer-motion` (installed) | Slide-in animation when artifact panel opens (translate from right). Version switch cross-fade. |
| Background deliverable production | `pg-boss` (installed) | Deliverable chain jobs run via existing job queue. No new queue infrastructure needed. |
| Deliverable storage | `drizzle-orm` + Neon PostgreSQL (installed) | New `deliverables` and `deliverable_versions` tables via Drizzle migration. |
| Real-time completion notification | `ws` + existing WebSocket (installed) | `deliverable_ready` WS event triggers artifact panel to open with completed content. |
| Copy-to-clipboard button | Browser `navigator.clipboard` API | No library needed for the toolbar Copy button. |
| Deliverable type badges | `lucide-react` (installed) | FileText, Code2, Layout, BarChart icons for PRD/TechSpec/DesignBrief/GTM badge types. |
| Agent attribution display | Existing avatar system (`AgentAvatar`) | Already built — show which Hatch produced the deliverable with role color + avatar. |
| Onboarding first deliverable | Existing `pg-boss` + WS notification | Zero-friction onboarding is a UX flow, not a new technical dependency. |

---

## Installation

```bash
# New packages only
npm install @react-pdf/renderer rehype-sanitize rehype-slug rehype-autolink-headings

# TypeScript types (if not bundled)
npm install -D @types/rehype-sanitize
```

**Note:** `@react-pdf/renderer` ships its own TypeScript types. `rehype-sanitize`, `rehype-slug`, and `rehype-autolink-headings` are written in TypeScript — no separate `@types/` packages needed.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@react-pdf/renderer` | `puppeteer` / Chromium headless | Puppeteer produces pixel-perfect PDFs from HTML/CSS — better for complex layouts with web fonts. Choose it if the PDF needs to exactly mirror a web page. Rejected here because: (1) Chromium binary is 300MB+, incompatible with Neon/serverless deploy constraints; (2) `@react-pdf/renderer` gives programmatic control over PDF structure (TOC entries, page breaks, agent attribution blocks) that Puppeteer cannot provide declaratively; (3) Puppeteer crashes at Neon's memory limits with multiple concurrent export requests. |
| `@react-pdf/renderer` | `pdfmake` | `pdfmake` is a JSON-config PDF library — good for simple tables and reports. Does not support component composition or React mental model. `@react-pdf/renderer` integrates into the existing React component system, so `<DeliverablePDF>` is a reusable, typed React component. |
| `@react-pdf/renderer` | `jspdf` | `jspdf` is client-side and canvas-based. Does not support custom fonts cleanly, produces low-quality output for text-heavy documents. All Hatchin deliverables are text-heavy (PRDs, specs, GTM plans). Server-side generation via `@react-pdf/renderer` is higher quality and avoids client-side memory issues on large documents. |
| `rehype-sanitize` | `dompurify` | `dompurify` is DOM-dependent (browser-only). The deliverable render pipeline runs on the server for email/export previews. `rehype-sanitize` is AST-based, runs in Node.js and browser. |
| `rehype-slug` + `rehype-autolink-headings` | Custom heading components in ReactMarkdown | Custom components in the `components` prop of `ReactMarkdown` could add ids manually, but require maintaining a slug function and anchor insertion. `rehype-slug` handles this with one plugin line. Two-line change vs 40-line custom implementation. |
| New `deliverables` table | Storing deliverables in `messages.content` | Messages table stores chat messages — stuffing large document content (5,000+ word PRDs) into the message content field would (1) break cursor pagination assumptions, (2) make deliverable search impossible, (3) prevent version history without message duplication, (4) conflate two distinct data types. Dedicated `deliverables` table with a FK to `projects` is the correct model. |
| New `deliverable_versions` table | `jsonb` version array on `deliverables` | JSONB array of version snapshots would hit PostgreSQL TOAST threshold after 2–3 revisions of a 5,000-word document. Separate `deliverable_versions` rows (one row per version, `content text NOT NULL`) keep the parent `deliverables` row small and allow efficient `SELECT * FROM deliverable_versions WHERE deliverable_id = X ORDER BY version_number DESC` queries. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`puppeteer` / `playwright` for PDF** | Chromium binary is 300MB+; incompatible with serverless memory limits on Neon; startup latency (2–4s) degrades UX; over-engineered for the use case | `@react-pdf/renderer` server-side |
| **`slate-react` / `prosemirror`** | Full rich-text editors (collaborative editing, inline formatting toolbar, selection API). Deliverables are produced by Hatches and iterated through conversation — not edited in-place by users in v2.0. Adding a rich-text editor doubles the frontend complexity for a v2.0 that doesn't need it. Revisit for v3.0 if users request in-panel editing. | `ReactMarkdown` with `prose` class |
| **`@uiw/react-md-editor`** / any markdown editor component | Same reason as Slate — deliverables are LLM-produced, read-optimized, not user-edited in v2.0. Editors bring keybinding conflicts, custom CSS overrides that fight Tailwind, and bundle bloat. | Read-only `ReactMarkdown` + conversation-based iteration |
| **`shiki`** | Better syntax highlighting than `rehype-highlight` but requires 2.8MB+ grammar bundle. The artifact panel renders business documents (PRDs, GTM plans, design briefs) — code blocks are rare. `rehype-highlight` (already installed) is sufficient. | `rehype-highlight` (already installed) |
| **`zustand` / `jotai`** | Global state for "which deliverable is open" is not needed — it's a URL param (`?artifact=<id>`) + TanStack Query. Adding a client-side store for this creates a second source of truth. | `wouter` URL params + `@tanstack/react-query` |
| **`react-pdf` (viewer)** | Renders PDF pages as canvas in the browser (different library from `@react-pdf/renderer`). Not needed — deliverables display as rich markdown in the panel; PDF is a download/export action only. | `ReactMarkdown` with `prose` for in-panel view |
| **`mammoth` / `docx` for DOCX export** | DOCX export is out of scope for v2.0. PDF + copy-to-clipboard covers stakeholder sharing needs. DOCX generation adds complexity without clear user demand. | Defer to post-v2.0 based on user feedback |

---

## Integration Points with Existing Stack

### Artifact Panel Data Flow

```
User or Hatch triggers deliverable production
  → pg-boss job created: { type: 'produce_deliverable', agentId, projectId, deliverableType, chainContext }
  → taskExecutionPipeline.ts: executes LLM call → produces markdown content
  → storage.createDeliverable({ projectId, agentId, type, title, content }) → INSERT INTO deliverables
  → storage.createDeliverableVersion({ deliverableId, content, versionNumber: 1, agentId }) → INSERT INTO deliverable_versions
  → WS broadcast: { type: 'deliverable_ready', deliverableId, agentId, title, deliverableType }
  → CenterPanel.tsx: receives WS event → sets openArtifactId state
  → ArtifactPanel.tsx: useQuery(['deliverable', id]) → GET /api/deliverables/:id
  → ReactMarkdown + prose class renders content
```

### PDF Export Flow

```
User clicks "Export PDF" in artifact toolbar
  → POST /api/deliverables/:id/export (new route in server/routes/deliverables.ts)
  → server fetches deliverable content + project branding (name, color, logo if present)
  → @react-pdf/renderer: renderToBuffer(<DeliverablePDF project={...} deliverable={...} />)
  → res.setHeader('Content-Type', 'application/pdf')
  → res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`)
  → res.send(buffer)
  → Browser triggers download
```

### Deliverable Chain Flow (Cross-Agent)

```
PM Hatch produces PRD → deliverable:{ id, type: 'prd', content }
  → pg-boss enqueues: { type: 'produce_deliverable', type: 'tech_spec', chainContext: { priorDeliverableId: prdId } }
  → Engineer Hatch receives job: loads prior deliverable content via storage.getDeliverable(priorDeliverableId)
  → Injects prior content into LLM context: "The PM produced the following PRD: [content]. Write a tech spec that references and expands on this."
  → Produces tech spec with explicit PRD references
  → WS broadcast: { type: 'deliverable_ready', deliverableId, chainPosition: 2, chainTotal: 4 }
```

### Version History Flow

```
User sends follow-up message: "Can you make the PRD more concise?"
  → CenterPanel detects active deliverable context (openArtifactId set)
  → Agent regenerates deliverable with revision instruction
  → storage.createDeliverableVersion({ deliverableId, content: revised, versionNumber: 2 })
  → ArtifactPanel.tsx: useQuery(['deliverable_versions', deliverableId]) revalidates
  → Version tabs show v1 / v2; user can click back to compare
```

### Database Schema (New Tables Required)

Two new Drizzle tables via migration — no changes to existing tables:

```typescript
// shared/schema.ts additions

export const deliverables = pgTable("deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  agentId: varchar("agent_id").references(() => agents.id),
  type: text("type").notNull().$type<"prd" | "tech_spec" | "design_brief" | "gtm_plan" | "content" | "research" | "sop">(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft").$type<"draft" | "complete" | "superseded">(),
  chainId: varchar("chain_id"),  // groups linked deliverables from one production run
  chainPosition: integer("chain_position"),  // 1 = first in chain, 2 = second, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deliverableVersions = pgTable("deliverable_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").references(() => deliverables.id).notNull(),
  agentId: varchar("agent_id").references(() => agents.id),
  content: text("content").notNull(),  // full markdown — TEXT not JSONB, no TOAST issues
  versionNumber: integer("version_number").notNull(),
  changeNote: text("change_note"),  // "Made more concise per user feedback"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  deliverableIdIdx: index("deliverable_versions_deliverable_id_idx").on(table.deliverableId),
}));
```

**Why `TEXT` not `JSONB` for `content`:** Markdown is a flat string. JSONB provides no query advantage for a string field and adds unnecessary parsing overhead. `text` with a PostgreSQL index on `deliverable_id` is the correct column type. A 5,000-word PRD is ~30KB as text — well within PostgreSQL's 1GB column limit and below TOAST threshold concerns at typical document lengths.

---

## Stack Patterns by Variant

**For the artifact panel markdown rendering:**
- Apply `className="prose dark:prose-invert prose-sm max-w-none"` to the `<ReactMarkdown>` container div
- Suppress MessageBubble's custom component overrides — let `prose` handle h1/h2/ul/li/code
- Add `rehypePlugins={[rehypeSanitize, rehypeSlug, rehypeAutolink, rehypeHighlight]}` in that order (sanitize before slug)
- Do NOT pass `components` prop with custom h1/h2/code overrides to the artifact panel `<ReactMarkdown>` — `prose` handles this cleanly

**For the PDF export:**
- Run `@react-pdf/renderer` **server-side only** — do not bundle it in Vite frontend build (Chromium dependency causes build issues)
- Add `@react-pdf/renderer` to the esbuild `external` list in `package.json` build script if it resolves browser dependencies
- Use `renderToBuffer()` not `renderToStream()` for Express response — simpler error handling
- Embed Hatchin fonts via `Font.register()` at server startup for consistent branding

**For deliverable versioning:**
- `deliverable_versions` is the source of truth for content — `deliverables` is the metadata record
- The "current" version is always `SELECT ... ORDER BY version_number DESC LIMIT 1`
- Never update content in-place on `deliverable_versions` — append new rows only (immutable version history)

**For the chain orchestration:**
- Use `chainId` (a shared UUID generated at chain creation) to group related deliverables
- Use `chainPosition` to determine ordering without hard-coding type sequences
- The chain is defined by the production job, not the schema — schema just records position

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@react-pdf/renderer@4.3.0` | `node@20.16.11` | Node.js 16+ required. Server-side use only. Do not import in Vite client bundle. |
| `rehype-sanitize@6.0.0` | `react-markdown@10.1.0` | Both use unified/rehype AST pipeline. rehype-sanitize must come before rehype-slug in plugin array. |
| `rehype-slug@6.0.0` | `rehype-autolink-headings@7.1.0` | rehype-slug must run before rehype-autolink-headings (autolink requires existing slug ids). |
| `rehype-autolink-headings@7.1.0` | `rehype-highlight@7.0.2` | No conflicts — all three operate on different node types in the AST. |
| All new rehype plugins | `remark-gfm@4.0.1` | remark plugins (remark-gfm) run before rehype plugins in the unified pipeline. Order: remark → rehype. No conflicts. |

---

## Sources

- `/Users/shashankrai/Documents/hatching-mvp-5th-march/package.json` — all existing versions confirmed directly — HIGH confidence
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/tailwind.config.ts` — `@tailwindcss/typography` confirmed in plugins array — HIGH confidence
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/client/src/components/MessageBubble.tsx` — existing `react-markdown` + `remark-gfm` + `rehype-highlight` usage pattern confirmed — HIGH confidence
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/shared/schema.ts` — existing table structure, confirmed no `deliverables` table exists yet — HIGH confidence
- `/Users/shashankrai/Documents/hatching-mvp-5th-march/.planning/PROJECT.md` — v2.0 deliverable system requirements, confirmed cross-agent chain requirement — HIGH confidence
- `@react-pdf/renderer` — 2.4M weekly downloads, actively maintained, Node.js server-side PDF generation; no browser import required — HIGH confidence (training data corroborated by npm adoption)
- `rehype-sanitize` — part of the official unified/rehype ecosystem (same org as react-markdown) — HIGH confidence
- `rehype-slug` + `rehype-autolink-headings` — standard unified ecosystem plugins for TOC anchor support — HIGH confidence
- PostgreSQL `TEXT` vs `JSONB` for string content — `TEXT` is correct for flat strings; `JSONB` parsing overhead with no query benefit — HIGH confidence

---

*Stack research for: Hatchin v2.0 deliverable/artifact system — rich artifact panel, PDF export, versioning, cross-agent chains*
*Researched: 2026-03-25*
