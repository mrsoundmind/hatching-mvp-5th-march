# Phase 13: Approvals Hub + Task Pipeline — Research

**Researched:** 2026-03-25
**Domain:** React sidebar components, approval state management, task pipeline visualization, TanStack Query mutations
**Confidence:** HIGH

---

## Summary

Phase 13 builds the Approvals tab content within the already-existing three-tab RightSidebar shell from Phase 11. The shell, tab-switching logic, CSS-hide pattern, and `SidebarTabBar` are all complete. Phase 13 only needs to populate the approvals panel with two components — `ApprovalsTab` (the container) and its children — and wire the `hasPendingApprovals` prop in `RightSidebar.tsx` (currently hardcoded `false`).

The backend is substantially built. Two separate approval surfaces exist in parallel: `POST /api/tasks/:id/approve` and `POST /api/tasks/:id/reject` handle the primary approval flow (tasks with `metadata.awaitingApproval === true`). The `POST /api/action-proposals/:id/approve` and `/reject` handle a secondary action-proposal flow. Phase 13 targets the primary task-approval flow, which is what `AutonomousApprovalCard.tsx` already handles in chat.

The task pipeline view (APPR-02) is a read-only stage-grouped display of existing tasks from `GET /api/tasks?projectId=...`. No new backend endpoints or DB migrations are needed. Tasks already carry a `status` enum (`"todo" | "in_progress" | "completed" | "blocked"`) and the pipeline stage mapping is a pure frontend concern.

The primary complexity in this phase is expiry logic (APPR-03). The `tasks` schema does not have a native `expiresAt` column. Expiry must be derived from task metadata and the existing approval payload (`metadata.awaitingApproval`, `metadata.approvedAt`, `metadata.rejectedAt`). The frontend will treat tasks as expired when they were placed in approval state more than a configurable window (30 minutes is the established pattern from the execution pipeline) and neither approved nor rejected.

**Primary recommendation:** Build two focused components (`ApprovalsTab` + `ApprovalItem` + `TaskPipelineView` + `ApprovalsEmptyState`), fetch tasks from the existing `/api/tasks` endpoint, derive expiry in the frontend, and wire `hasPendingApprovals` to count non-expired pending tasks. Zero new backend work is required.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APPR-01 | User can view all pending approvals in a dedicated Approvals tab with one-click approve/reject buttons | Backend: `POST /api/tasks/:id/approve` + `/reject` already exist. Frontend: `ApprovalItem` maps `metadata.awaitingApproval === true` tasks to approval cards. `useMutation` pattern from TanStack Query drives the action. |
| APPR-02 | User sees a task pipeline view showing tasks in stages: Queued, Assigned, In Progress, Review, Done | Backend: `GET /api/tasks?projectId=...` returns all tasks with `status` field. Frontend mapping: `todo` → Queued, assignee present + `todo` → Assigned, `in_progress` → In Progress, `blocked` → Review, `completed` → Done. |
| APPR-03 | Stale approvals expire gracefully with clear "expired" messaging instead of silently failing | No expiry column in DB. Derive in frontend: task is expired when `metadata.awaitingApproval === true` AND no `approvedAt`/`rejectedAt` AND `updatedAt` is > 30 min old. Expired items render "Expired" badge; buttons are removed. |
| APPR-04 | Approvals tab shows a compelling empty state when no pending approvals exist | Use existing `EmptyState` component (`client/src/components/ui/EmptyState.tsx`). `ShieldCheck` icon (already used in `SidebarTabBar`). Copy defined in UI-SPEC. No CTA button — approvals are system-generated. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Component rendering | Project standard |
| TanStack React Query | 5.60.5 | Data fetching + mutations | Project standard for ALL server data |
| Framer Motion | 11.13.1 | ApprovalItem enter/exit animations | Established pattern in AutonomousApprovalCard |
| Lucide React | 0.453.0 | ShieldCheck, CheckCircle, XCircle icons | Project standard icon set |
| Tailwind CSS | 3.4.17 | Styling | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Tooltip | via Radix | Expiry tooltip on "Expired" badge (hover) | Only for expiry tooltip — not buttons |
| shadcn Badge | via Radix | "Expired" badge + pipeline stage dots | Alternative: plain `<span>` with Tailwind also valid |
| shadcn ScrollArea | via Radix | Approval list scroll container | Only if native overflow causes issues with sidebar height |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query `useMutation` for approve/reject | `useState` + `fetch` | Query handles loading state, error state, and cache invalidation automatically — prefer Query |
| Frontend-derived expiry | New `expiresAt` DB column | DB migration not needed; approval windows are short-lived enough that in-memory derivation is accurate |
| Separate approvals API endpoint | `/api/tasks?awaitingApproval=true` | Existing `/api/tasks?projectId=...` suffices with frontend filtering — avoids new endpoint |

**Installation:** No new packages needed. All libraries already installed.

---

## Architecture Patterns

### Recommended Component Structure

```
client/src/components/sidebar/
├── ApprovalsTab.tsx          # Container: fetches tasks, renders list or empty state + pipeline
├── ApprovalItem.tsx          # Single pending approval row with Approve Task/Reject Task
├── TaskPipelineView.tsx      # Read-only stage-grouped task count display
└── ApprovalsEmptyState.tsx   # EmptyState wrapper with ShieldCheck icon + copy
```

### Pattern 1: Data Fetching with TanStack Query

**What:** Fetch tasks via `useQuery`, derive approval items in useMemo, run mutations on approve/reject.
**When to use:** Any server-derived data in this sidebar. Matches every other sidebar component.

```typescript
// Source: established pattern in useAutonomyFeed.ts + ActivityTab.tsx

// Fetch all project tasks
const { data: tasks, isLoading } = useQuery<Task[]>({
  queryKey: ['/api/tasks', `?projectId=${projectId}`],
  enabled: !!projectId,
  staleTime: 15_000,
  refetchInterval: 30_000, // Poll every 30s to catch new approvals
});

// Derive pending approvals
const pendingApprovals = useMemo(() =>
  (tasks ?? []).filter(t =>
    (t.metadata as any)?.awaitingApproval === true &&
    !(t.metadata as any)?.approvedAt &&
    !(t.metadata as any)?.rejectedAt
  ), [tasks]);
```

### Pattern 2: Approve/Reject Mutation

**What:** TanStack `useMutation` calling `POST /api/tasks/:id/approve` or `/reject`.
**When to use:** Any one-click action that modifies server state and should invalidate cached task data.

```typescript
// Source: server/routes/tasks.ts — /api/tasks/:id/approve already exists

const approveMutation = useMutation({
  mutationFn: (taskId: string) =>
    fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' }).then(r => {
      if (!r.ok) throw new Error('Failed to approve');
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  },
  onError: () => {
    toast({ description: "Couldn't process your decision. Try again.", variant: "destructive" });
  },
});
```

### Pattern 3: Expiry Derivation (Frontend Only)

**What:** Classify an approval as "expired" using timestamp math in useMemo — no DB column needed.
**When to use:** Any state that can be computed from existing data rather than requiring new DB migrations.

```typescript
const APPROVAL_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function isApprovalExpired(task: Task): boolean {
  const meta = task.metadata as Record<string, unknown> | null;
  if (!meta?.awaitingApproval) return false;
  // Already actioned — not expired, gone
  if (meta.approvedAt || meta.rejectedAt) return false;
  // Check age of last update
  const updatedAt = new Date(task.updatedAt).getTime();
  return Date.now() - updatedAt > APPROVAL_EXPIRY_MS;
}
```

### Pattern 4: Pipeline Stage Mapping

**What:** Map task `status` enum to pipeline stage display labels. Pure frontend transform.
**When to use:** Translating DB enum values to human-readable UI labels.

```typescript
// Tasks schema status: "todo" | "in_progress" | "completed" | "blocked"
// Pipeline stage mapping:
const PIPELINE_STAGES = [
  { id: 'queued',      label: 'Queued',      filter: (t: Task) => t.status === 'todo' && !t.assignee },
  { id: 'assigned',   label: 'Assigned',    filter: (t: Task) => t.status === 'todo' && !!t.assignee },
  { id: 'inprogress', label: 'In Progress', filter: (t: Task) => t.status === 'in_progress' },
  { id: 'review',     label: 'Review',      filter: (t: Task) => t.status === 'blocked' },
  { id: 'done',       label: 'Done',        filter: (t: Task) => t.status === 'completed' },
] as const;
```

Note: "Review" maps to `blocked` status because the DB has no `review` status value. The pipeline view is a display rename — it does not change DB values.

### Pattern 5: Real-Time Count Wiring to SidebarTabBar

**What:** `RightSidebar.tsx` currently passes `hasPendingApprovals={false}` (hardcoded). Phase 13 must wire the real count.
**When to use:** Any time a tab badge needs live data.

```typescript
// In RightSidebar.tsx — replace the hardcoded false:
// Source: server/routes/tasks.ts (approve endpoint) + existing SidebarTabBar prop

const { data: tasks } = useQuery<Task[]>({
  queryKey: ['/api/tasks', `?projectId=${activeProject?.id}`],
  enabled: !!activeProject?.id,
  staleTime: 15_000,
  refetchInterval: 30_000,
});

const hasPendingApprovals = useMemo(() =>
  (tasks ?? []).some(t =>
    (t.metadata as any)?.awaitingApproval === true &&
    !isApprovalExpired(t) &&
    !(t.metadata as any)?.approvedAt &&
    !(t.metadata as any)?.rejectedAt
  ), [tasks]);

// Then pass to SidebarTabBar:
// hasPendingApprovals={hasPendingApprovals}
```

### Pattern 6: Real-Time Task Updates via WS

**What:** The WebSocket already emits `task_created` and `task_approval_rejected` events. Invalidate TanStack Query cache on receipt to keep the approval list current without polling lag.
**When to use:** Any sidebar component showing task data.

```typescript
// Source: server/routes/tasks.ts — broadcastToProject emits task_approval_rejected
// Source: useRealTimeUpdates hook already in RightSidebar

// In ApprovalsTab or parent — listen for task events:
useSidebarEvent('task_approval_rejected', () => {
  queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
});
```

The existing `useSidebarEvent` hook (from Phase 11/12) handles CustomEvent listeners. The WS → CustomEvent bridge in `CenterPanel.tsx` already dispatches task events.

### Anti-Patterns to Avoid

- **Do not create a new backend API endpoint for approvals.** The existing `/api/tasks?projectId=...` returns all tasks including pending approvals. Filter client-side.
- **Do not use `AnimatePresence` with a `key` that changes on re-render.** The `ApprovalItem` exit animation requires a stable `key={task.id}` — using index as key will break the exit animation.
- **Do not query tasks inside `ApprovalItem`.** All data flows down as props from `ApprovalsTab`. `ApprovalItem` is a pure presentation component.
- **Do not show zero-count pipeline stages.** UI-SPEC is explicit: omit `TaskPipelineView` entirely when there are no tasks at all — show nothing rather than 5 zero-count rows.
- **Do not add a confirmation dialog for Reject Task.** UI-SPEC is explicit: single click, no confirmation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading state in buttons | Custom loading spinner | `disabled + opacity-50` on both buttons while `isPending` | Matches UI-SPEC spec; consistent with AutonomousApprovalCard |
| Toast on mutation error | Custom error UI | shadcn `useToast` (already imported in RightSidebar) | Already used throughout app |
| Scroll container | Custom scroll logic | `overflow-y-auto hide-scrollbar` class (established pattern) | Matches ActivityTab.tsx scroll pattern |
| Animated list enter/exit | CSS transitions | Framer Motion `AnimatePresence` + `motion.div` | Established pattern in AutonomousApprovalCard; exact animation values in UI-SPEC |
| Empty state layout | Custom layout | `EmptyState` component at `@/components/ui/EmptyState.tsx` | Already built with correct visual style |

---

## Common Pitfalls

### Pitfall 1: Task Fetch Scope — All Tasks vs. Approval Tasks

**What goes wrong:** Fetching `/api/tasks?projectId=...` returns ALL tasks (todo, in_progress, completed, blocked). If the list is long (50+ tasks), filtering client-side is fast, but the pipeline view counts all of them. This is expected and correct. The pitfall is confusing approval-only filtering with the pipeline view which shows all tasks.
**Why it happens:** Two components in `ApprovalsTab` need the same data for different purposes: `ApprovalItem` list (filtered to `awaitingApproval`) and `TaskPipelineView` (all tasks bucketed by status).
**How to avoid:** Fetch once in `ApprovalsTab`, derive two useMemo arrays — `pendingApprovals` and `allTasks` — and pass each to the respective child component. Single query, two views.
**Warning signs:** Two separate `useQuery` calls for tasks in the same tab panel.

### Pitfall 2: `metadata` Type Cast

**What goes wrong:** The `tasks.metadata` column is typed as `{ createdFromChat?: boolean; messageId?: string; estimatedHours?: number; actualHours?: number }` in `shared/schema.ts`. It does NOT include `awaitingApproval`, `draftOutput`, `approvedAt`, `rejectedAt` — those were added at runtime by `taskExecutionPipeline.ts` and `tasks.ts` route without schema update.
**Why it happens:** The schema type is outdated relative to what the execution pipeline actually writes.
**How to avoid:** Cast `task.metadata as Record<string, unknown>` (not `as any`) before accessing approval fields. This is the same approach already used in `server/routes/tasks.ts` lines 356 and 435.
**Warning signs:** TypeScript error "property 'awaitingApproval' does not exist on type".

### Pitfall 3: Missing `AnimatePresence` Around Approval List

**What goes wrong:** `ApprovalItem` exit animation (`opacity: 0, y: -4`, 200ms) requires a parent `<AnimatePresence>` wrapper. Without it, items disappear immediately on approve/reject instead of animating out.
**Why it happens:** Framer Motion exit animations only fire when the component is removed from a parent `AnimatePresence`.
**How to avoid:** Wrap the approval items map in `<AnimatePresence mode="popLayout">`. Use `task.id` as the `key` on each `motion.div`.
**Warning signs:** Items disappear instantly after approve click with no animation.

### Pitfall 4: Pipeline Stage "Review" vs. DB Status "blocked"

**What goes wrong:** The UI-SPEC calls the fourth stage "Review" but the DB `tasks.status` enum has no `review` value. The closest semantic match is `blocked` (a task that is blocked/awaiting feedback before proceeding). If a developer creates a `review` filter that matches on the string "review", it will always show zero tasks.
**Why it happens:** Design vocabulary doesn't align with DB enum values chosen pre-UI.
**How to avoid:** Map `blocked` → "Review" in the PIPELINE_STAGES constant. Document this explicitly in the constant's comment.
**Warning signs:** Review stage always shows 0 tasks even when tasks exist.

### Pitfall 5: `hasPendingApprovals` Not Propagating Real-Time Updates

**What goes wrong:** The SidebarTabBar dot badge only updates when the task list query refetches. If an approval arrives via WebSocket but the query hasn't refetched yet, the badge stays stale.
**Why it happens:** The `refetchInterval: 30_000` polling window means up to 30s delay before badge appears.
**How to avoid:** Listen for `AUTONOMY_EVENTS.APPROVAL_REQUIRED` CustomEvent (already dispatched by CenterPanel) and immediately call `queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })` on receipt. The event already carries `taskId` and `projectId`.
**Warning signs:** Approval arrives in chat but badge doesn't appear until page activity causes a refetch.

---

## Code Examples

### ApprovalsTab Structure

```typescript
// Source: pattern from ActivityTab.tsx (ActivityTab — same container structure)

export function ApprovalsTab({ projectId }: { projectId: string | undefined }) {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks', `?projectId=${projectId}`],
    enabled: !!projectId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const pendingApprovals = useMemo(() =>
    (tasks ?? []).filter(t => {
      const meta = t.metadata as Record<string, unknown>;
      return meta?.awaitingApproval === true
        && !meta?.approvedAt
        && !meta?.rejectedAt;
    }),
    [tasks]
  );

  // Sort: active first, expired last
  const activeApprovals = pendingApprovals.filter(t => !isApprovalExpired(t));
  const expiredApprovals = pendingApprovals.filter(t => isApprovalExpired(t));
  const sortedApprovals = [...activeApprovals, ...expiredApprovals];

  if (!isLoading && sortedApprovals.length === 0) {
    return <ApprovalsEmptyState />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div role="list" className="flex-1 overflow-y-auto hide-scrollbar space-y-1">
        <AnimatePresence mode="popLayout">
          {sortedApprovals.map(task => (
            <ApprovalItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>
      {tasks && tasks.length > 0 && (
        <TaskPipelineView tasks={tasks} />
      )}
    </div>
  );
}
```

### ApprovalItem With Mutation

```typescript
// Source: AutonomousApprovalCard.tsx (existing component — visual sibling)

export function ApprovalItem({ task }: { task: Task }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meta = task.metadata as Record<string, unknown>;
  const isExpired = isApprovalExpired(task);

  const approveMutation = useMutation({
    mutationFn: () => fetch(`/api/tasks/${task.id}/approve`, { method: 'POST' })
      .then(r => { if (!r.ok) throw new Error('Failed'); }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }),
    onError: () => toast({ description: "Couldn't process your decision. Try again.", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => fetch(`/api/tasks/${task.id}/reject`, { method: 'POST' })
      .then(r => { if (!r.ok) throw new Error('Failed'); }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }),
    onError: () => toast({ description: "Couldn't process your decision. Try again.", variant: "destructive" }),
  });

  const isLoading = approveMutation.isPending || rejectMutation.isPending;
  const agentName = task.assignee ?? 'Hatch';
  const riskScore = meta?.riskScore as number | undefined;
  const borderColor = riskScore && riskScore >= 0.6 ? 'border-l-[var(--hatchin-orange)]' : 'border-l-amber-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: isExpired ? 0 : 0.18, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 px-3 py-3 rounded-lg bg-[var(--hatchin-surface)] border-l-[3px] ${borderColor}`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[var(--hatchin-surface-hover)] flex items-center justify-center text-xs font-semibold shrink-0">
        {agentName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--hatchin-text-bright)]">{agentName}</p>
        {Array.isArray(meta?.riskReasons) && (meta.riskReasons as string[]).length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {(meta.riskReasons as string[]).join(' · ')}
          </p>
        )}
        <div className="flex gap-2 mt-2">
          {isExpired ? (
            <span
              className="inline-flex px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400"
              aria-label="Approval expired"
            >
              Expired
            </span>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => approveMutation.mutate()}
                aria-label={`Approve task: ${task.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--hatchin-blue)] text-white hover:bg-[var(--hatchin-blue)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve Task
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => rejectMutation.mutate()}
                aria-label={`Reject task: ${task.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject Task
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

### TaskPipelineView

```typescript
// Source: pattern from ActivityTab skeleton (animate-shimmer loading state)

const PIPELINE_STAGES = [
  { id: 'queued',      label: 'Queued',      dot: 'bg-gray-400',                    filter: (t: Task) => t.status === 'todo' && !t.assignee },
  { id: 'assigned',   label: 'Assigned',    dot: 'bg-[var(--hatchin-blue)]',        filter: (t: Task) => t.status === 'todo' && !!t.assignee },
  { id: 'inprogress', label: 'In Progress', dot: 'bg-[var(--hatchin-orange)] animate-pulse', filter: (t: Task) => t.status === 'in_progress' },
  { id: 'review',     label: 'Review',      dot: 'bg-amber-400',                   filter: (t: Task) => t.status === 'blocked' },
  { id: 'done',       label: 'Done',        dot: 'bg-[var(--hatchin-green)]',       filter: (t: Task) => t.status === 'completed' },
] as const;

export function TaskPipelineView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-[var(--hatchin-border-subtle)]">
      <p className="text-xs font-semibold hatchin-text-muted mb-2 px-1">Task pipeline</p>
      <div role="list" className="space-y-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = tasks.filter(stage.filter).length;
          return (
            <motion.div
              key={stage.id}
              role="listitem"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03, duration: 0.12, ease: 'easeOut' }}
              className="flex items-center justify-between px-2 py-1.5 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                <span className="text-xs hatchin-text-muted">{stage.label}</span>
              </div>
              <span className="text-xs font-semibold hatchin-text">{count}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

### RightSidebar.tsx Wiring (hasPendingApprovals)

```typescript
// In RightSidebar.tsx — replace hasPendingApprovals={false} (line ~339)
// Source: existing RightSidebar.tsx — already fetches via useQuery for ActivityTab

const { data: allTasks } = useQuery<Task[]>({
  queryKey: ['/api/tasks', `?projectId=${activeProject?.id}`],
  enabled: !!activeProject?.id,
  staleTime: 15_000,
  refetchInterval: 30_000,
});

const hasPendingApprovals = useMemo(() =>
  (allTasks ?? []).some(t => {
    const meta = t.metadata as Record<string, unknown>;
    return meta?.awaitingApproval === true
      && !meta?.approvedAt
      && !meta?.rejectedAt
      && !isApprovalExpired(t);
  }), [allTasks]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chat-only approval cards (`AutonomousApprovalCard`) | Dedicated sidebar Approvals tab | Phase 13 | User can action approvals without finding the right chat message |
| `hasPendingApprovals={false}` hardcoded | Live badge count from task query | Phase 13 | Badge actually shows pending items |
| No task pipeline visibility | `TaskPipelineView` in sidebar | Phase 13 | User sees task distribution without TaskManager |

**Not changed in Phase 13:** The chat-side `AutonomousApprovalCard` continues to work as before. Phase 13 adds a parallel approval surface in the sidebar — it does not replace the chat card.

---

## Open Questions

1. **`metadata.riskReasons` field in tasks**
   - What we know: `AutonomousApprovalCard` receives `riskReasons: string[]` as a prop in chat. The task metadata has `riskScore` stored by `taskExecutionPipeline.ts`.
   - What's unclear: Whether `riskReasons` is also stored in `task.metadata`. Quick check of `taskExecutionPipeline.ts` would confirm. If not present, `ApprovalItem` should fall back to a generic description.
   - Recommendation: Check `taskExecutionPipeline.ts` for what it writes to task metadata. If `riskReasons` is not stored, derive a human-readable reason from `riskScore` range in `ApprovalItem`.

2. **`useSidebarEvent` hook availability in `ApprovalsTab`**
   - What we know: `useSidebarEvent` was created in Phase 11 for the activity feed hooks.
   - What's unclear: Whether it's exported from a shared location or only via `useAutonomyFeed`.
   - Recommendation: Confirm path — likely `client/src/hooks/useSidebarEvent.ts`. If available, use it directly in `ApprovalsTab` to listen for `AUTONOMY_EVENTS.APPROVAL_REQUIRED` for cache invalidation.

3. **Approval expiry window (30 min)**
   - What we know: The execution pipeline does not store an explicit expiry time. The 30-minute window is a derived estimate.
   - What's unclear: Whether product wants a longer window (e.g., 24h for users who come back the next day).
   - Recommendation: Default to 30 minutes as specified in UI-SPEC. This can be a named constant for easy adjustment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured in `vitest.config.ts`) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run scripts/` |
| Full suite command | `npm run typecheck && npx vitest run scripts/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPR-01 | `ApprovalsTab` renders ApprovalItem for tasks with `awaitingApproval === true` | unit | `npx vitest run scripts/test-approvals-tab.test.ts` | Wave 0 |
| APPR-01 | Approve/Reject buttons call correct API endpoints | unit | `npx vitest run scripts/test-approvals-tab.test.ts` | Wave 0 |
| APPR-02 | `TaskPipelineView` counts match task status distribution | unit | `npx vitest run scripts/test-task-pipeline-view.test.ts` | Wave 0 |
| APPR-02 | `blocked` status maps to "Review" stage (not raw "blocked") | unit | `npx vitest run scripts/test-task-pipeline-view.test.ts` | Wave 0 |
| APPR-03 | `isApprovalExpired` returns true after 30min window | unit | `npx vitest run scripts/test-approval-expiry.test.ts` | Wave 0 |
| APPR-03 | Expired items render badge instead of buttons | unit | `npx vitest run scripts/test-approvals-tab.test.ts` | Wave 0 |
| APPR-04 | Empty state renders when no pending approvals | unit | `npx vitest run scripts/test-approvals-tab.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run scripts/test-approvals-tab.test.ts scripts/test-task-pipeline-view.test.ts scripts/test-approval-expiry.test.ts`
- **Per wave merge:** `npm run typecheck && npx vitest run scripts/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/test-approvals-tab.test.ts` — covers APPR-01, APPR-03, APPR-04
- [ ] `scripts/test-task-pipeline-view.test.ts` — covers APPR-02
- [ ] `scripts/test-approval-expiry.test.ts` — covers APPR-03 expiry logic (pure function, no JSX)

*(Framework is installed — `vitest.config.ts` exists. No framework install needed.)*

---

## Existing Code to Reuse Directly

These files must be understood before implementation. No duplication:

| File | What to Reuse |
|------|--------------|
| `client/src/components/AutonomousApprovalCard.tsx` | Visual vocabulary (border, button styles, icon usage) — `ApprovalItem` is the sidebar sibling |
| `client/src/components/sidebar/ActivityTab.tsx` | Container pattern (flex-col, overflow scroll, skeleton loading, EmptyState) |
| `client/src/components/sidebar/ActivityFeedItem.tsx` | Color-coded left border (3px), agent avatar (32px), text hierarchy (text-xs / text-[10px]) |
| `client/src/components/ui/EmptyState.tsx` | Used as-is for `ApprovalsEmptyState` — pass `ShieldCheck` icon + copy from UI-SPEC |
| `client/src/components/RightSidebar.tsx` line ~339 | `hasPendingApprovals={false}` — replace with live derived value |
| `client/src/lib/autonomyEvents.ts` | `AUTONOMY_EVENTS.APPROVAL_REQUIRED` — listen to this for real-time cache invalidation |
| `server/routes/tasks.ts` lines 345-457 | `POST /api/tasks/:id/approve` and `/reject` — already complete, no changes needed |

---

## Sources

### Primary (HIGH confidence)

- `client/src/components/AutonomousApprovalCard.tsx` — approval card visual spec and animation values
- `client/src/components/sidebar/SidebarTabBar.tsx` — `hasPendingApprovals` prop interface
- `client/src/components/RightSidebar.tsx` — current `hasPendingApprovals={false}` location and tab CSS-hide pattern
- `client/src/components/sidebar/ActivityTab.tsx` — container component pattern to follow
- `server/routes/tasks.ts` — approve/reject endpoints (lines 345-457)
- `shared/schema.ts` — tasks table schema (lines 188-215), `status` enum values
- `client/src/lib/autonomyEvents.ts` — `AUTONOMY_EVENTS.APPROVAL_REQUIRED` event definition
- `client/src/hooks/useAutonomyFeed.ts` — TanStack Query fetch pattern for sidebar hooks
- `.planning/phases/13-approvals-hub-task-pipeline/13-UI-SPEC.md` — definitive visual/interaction contract

### Secondary (MEDIUM confidence)

- `server/autonomy/execution/taskExecutionPipeline.ts` (first 80 lines) — confirms `awaitingApproval` metadata field exists; full `riskReasons` storage not fully verified (open question 1 above)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, all patterns established
- Architecture: HIGH — backend complete, component patterns clear from existing siblings
- Pitfalls: HIGH — all sourced from direct code inspection of existing components
- Expiry logic: MEDIUM — 30min window is reasonable but not pinned to a backend config value

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable phase, no fast-moving dependencies)
