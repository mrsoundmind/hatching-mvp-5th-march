# Hatchin MVP — Complete Function, Logic & Algorithm Inventory

## Context
Complete catalog of ALL functions, logic, algorithms, and features in the Hatchin app. Master reference for systematic testing, auditing, and review.

**Last verified**: 2026-03-26 | **Branch**: reconcile-codex | **Milestone**: v1.3 in progress

---

## PART 1: FRONTEND (156 files)

### Pages (7 files)

| File | Component | What It Does | Key Logic/Algorithms |
|------|-----------|-------------|---------------------|
| `client/src/pages/home.tsx` | Main app shell | Three-panel layout (Left/Center/Right sidebar) + mobile Sheet drawers | `normalizeSelectionId()` sanitizes IDs; CustomEvent listener for `project_brain_updated` syncs cache; sessionStorage persistence for selections; project creation flows (idea/starter pack/scratch) |
| `client/src/pages/MayaChat.tsx` | Maya 1-on-1 chat | Project-level Maya conversation with streaming | Stream watchdog (20s timeout auto-reset); coachmark UX (localStorage `hatchin_maya_visited`); doc upload to brain |
| `client/src/pages/login.tsx` | OAuth login | Animated login with agent card parallax, slide carousel | `sanitizeNextPath()` validates redirect URLs (rejects `/api/auth/...`); Framer Motion `useMotionValue` + `useSpring` for parallax; auto-rotate carousel (4s) |
| `client/src/pages/LandingPage.tsx` | Marketing landing | 8 USP panels with animated previews | `InlineSVG` fetches SVG and injects via innerHTML (SMIL animations); responsive carousel via `activeUSPIndex` + swipe detection |
| `client/src/pages/AccountPage.tsx` | Billing dashboard | Subscription status, usage, upgrade/manage buttons | `fetchBillingStatus()` → GET `/api/billing/status`; `redirectToPortal()` → POST `/api/billing/portal`; `redirectToCheckout()` → POST `/api/billing/checkout`; grace period detection |
| `client/src/pages/onboarding.tsx` | Post-signup onboarding | Step-by-step walkthrough | TypingText animator + ChatPreview + AgentHatch components |
| `client/src/pages/not-found.tsx` | 404 page | Simple error card | Static render |

### Hooks (10 files)

| File | Hook | Returns | Key Logic/Algorithms |
|------|------|---------|---------------------|
| `hooks/useAuth.ts` | `useAuth()` | `{ user, isLoading, signIn, signOut, refresh, hasCompletedOnboarding, completeOnboarding, isSignedIn }` | `fetchSessionUser()` → GET `/api/auth/me`; onboarding state via localStorage `hasCompletedOnboarding:{userId}`; `AUTH_CHANGED_EVENT` dispatching; mounted check prevents state updates after unmount |
| `hooks/useRealTimeUpdates.ts` | `useRealTimeUpdates()` | `{ connectionStatus, metrics, isConnected, updateMessageCount, updateTaskCompletion, updateMilestone }` | Debounce: 500ms metric batching; WS connection removed (CenterPanel handles it); simple counters for external use |
| `hooks/useRightSidebarState.ts` | `useRightSidebarState()` | `{ state, actions }` | useReducer with 10 action types; localStorage persistence `hatchin_right_sidebar_preferences`; listens for `project_brain_updated` CustomEvent; "recently saved" badge for 2.5s; auto-detects active view (agent/team/project) **BUG: stale closure in toggleSection** |
| `hooks/useThreadNavigation.ts` | `useThreadNavigation()` | Thread structure with 16 helpers | Two-pass thread building (roots → replies); per-thread unread tracking; `getVisibleMessages()` respects `collapsedThreads` Set; `markThreadAsRead()` sets `threadReadState` |
| `hooks/useAutonomyFeed.ts` | `useAutonomyFeed(projectId)` | `{ events, stats, isLoading, workingAgents, unreadCount, clearUnread, activeFilter, setActiveFilter, agentFilter, setAgentFilter }` | Dual source: REST (stale: 30s) + CustomEvent real-time; debounce batching (3s flush by traceId); `mapAutonomyEventToFeedEvent()` mapping; category classification; max 200 events; feed stats query (stale: 60s) |
| `hooks/useUnreadCounts.ts` | `useUnreadCounts()` | `{ counts, increment, clear, clearAll, getTotalUnread, hasUnread, getCount }` | sessionStorage persistence `hatchin:unreadCounts`; auto-save on every change |
| `hooks/useAgentWorkingState.ts` | `useAgentWorkingState()` | `Set<string>` of working agent IDs | Listens for `AUTONOMY_EVENTS.AGENT_WORKING_STATE` CustomEvents; Set add/remove on isWorking toggle |
| `hooks/useSidebarEvent.ts` | `useSidebarEvent(eventName, handler, deps?)` | void | Typed useEffect wrapper for CustomEvent listening; useCallback stabilization; automatic cleanup |
| `hooks/use-toast.ts` | `useToast()` | `{ toast }` | Shadcn auto-generated toast hook |

### Lib/Utilities (9 files)

| File | Exports | Key Logic/Algorithms |
|------|---------|---------------------|
| `lib/websocket.ts` | `useWebSocket(url, options?)` | Exponential backoff reconnect: `min(1000 * 2^retryCount, 30000)`, max 10 retries; Zod validation on outbound messages; conversation join replay after reconnect; `getWebSocketUrl()` returns ws:// or wss:// based on protocol |
| `lib/queryClient.ts` | `queryClient`, `apiRequest()`, `getQueryFn()` | staleTime: Infinity; refetchOnWindowFocus: false; retry: false; 401 → throw; `apiRequest()` wrapper with credentials: include |
| `lib/autonomyEvents.ts` | `AUTONOMY_EVENTS`, `dispatchAutonomyEvent()` | 8 event types (TASK_EXECUTING, TASK_COMPLETED, HANDOFF_ANNOUNCED, etc.); typed CustomEvent dispatcher |
| `lib/agentColors.ts` | `getAgentColors(role?)`, `getRoleEmoji(role?)` | Reads ROLE_DEFINITIONS from roleRegistry; fallback to DEFAULT_COLORS; CHARACTER_ROLE_MAP for name→role lookup |
| `lib/chatMode.ts` | `deriveChatMode()` | Priority: activeAgentId → 'agent', activeTeamId → 'team', else → 'project' |
| `lib/conversationId.ts` | `buildConversationId()` | Format: `project:{id}`, `team:{id}:{teamId}`, `agent:{id}:{agentId}` |
| `lib/devLog.ts` | `devLog()` | Only logs if `import.meta.env.DEV` |
| `lib/testModeTagging.ts` | Test mode utilities | TEST_LLM_PROVIDER switching |
| `lib/utils.ts` | `cn()`, date helpers | Tailwind class merge utility |

### Core Components (30+ files)

| Component | File | What It Does | Key Logic/Algorithms |
|-----------|------|-------------|---------------------|
| **CenterPanel** | `CenterPanel.tsx` (~2000+ lines) | Chat interface: messages, streaming, approval cards, handoff cards | Chat context derivation; cursor-based pagination; streaming lifecycle (started→chunk→completed→error); `resizeComposer()` auto-height; `determineSendGating()` tier checks; autonomy event dispatching via CustomEvents; approval/reject mutations; pause/resume autonomy |
| **LeftSidebar** | `LeftSidebar.tsx` | Project/team/agent tree + user menu | Search filtering (fuzzy/exact); undo system (3s restore window); Ctrl+K focus search; project creation flow (idea→name→hatch or pack→name→hatch); delete with undo popup |
| **RightSidebar** | `RightSidebar.tsx` | Tabbed sidebar (Activity/Brain/Approvals) | `hasPendingApprovals` computed from tasks with `awaitingApproval && !expired`; unread count from useAutonomyFeed; tab change clears unread |
| **MessageBubble** | `MessageBubble.tsx` | Single message renderer | User (right-aligned, plain) vs Agent (left-aligned, markdown via ReactMarkdown+remark-gfm+rehype-highlight); streaming cursor; status indicators (sending/sent/failed); reactions (agent only) |
| **ProjectTree** | `ProjectTree.tsx` | Hierarchical project browser | Filters Maya (`!isSpecialAgent`); search highlighting with regex; working state animation from `useAgentWorkingState()`; right-click context menu (edit/delete/rename) |
| **TaskManager** | `TaskManager.tsx` | Task list with filters | Collapsible sections (Urgent/InProgress/Backlog/Done); hierarchical subtasks; AI task suggestions modal |
| **AutonomousApprovalCard** | `AutonomousApprovalCard.tsx` | Inline high-risk approval | One-click approve/reject; risk reasons display; agent avatar |
| **HandoffCard** | `chat/HandoffCard.tsx` | Handoff announcement in chat | From-agent avatar → arrow → To-agent avatar + task title |
| **DeliberationCard** | `chat/DeliberationCard.tsx` | Multi-agent coordination indicator | Agent names, round counter, optional completion summary |
| **QuickStartModal** | `QuickStartModal.tsx` | Choose creation path | Radio: Idea / Starter pack |
| **StarterPacksModal** | `StarterPacksModal.tsx` | Template selection grid | 8 starter packs with emoji, title, description, color |
| **ProjectNameModal** | `ProjectNameModal.tsx` | Name input form | Validation: required name, max 100 chars; dirty state tracking (FocusTrap fix) |
| **AddHatchModal** | `AddHatchModal.tsx` | Create agent | 30 role dropdown; tier gate (Pro only) |
| **TaskSuggestionModal** | `TaskSuggestionModal.tsx` | Approve AI tasks | Checkbox list; approve all/selected → batch POST |
| **UpgradeModal** | `UpgradeModal.tsx` | Tier gate prompt | Free vs Pro comparison; Stripe checkout redirect |
| **WelcomeModal** | `WelcomeModal.tsx` | First-time onboarding | Animated egg; Maya greeting; localStorage persistence |
| **OnboardingManager** | `OnboardingManager.tsx` | Onboarding flow orchestrator | Step machine: welcome→steps→path-selection→starter-packs→completed; `completeOnboarding()` persists dismissal |
| **ThemeProvider** | `ThemeProvider.tsx` | Dark/light theme context | Theme state + toggle + persistence |
| **ErrorFallbacks** | `ErrorFallbacks.tsx` | Error boundaries | `AppErrorFallback` (full-screen) + `PanelErrorFallback` (panel-level) |
| **EggHatchingAnimation** | `EggHatchingAnimation.tsx` | Animated egg hatching | Pulsing ring keyframe; grow/crack/hatch sequence |
| **ProgressTimeline** | `ProgressTimeline.tsx` | Visual progress bar | Milestones + percentage |

### Sidebar Components (11 files)

| Component | File | What It Does |
|-----------|------|-------------|
| **SidebarTabBar** | `sidebar/SidebarTabBar.tsx` | 3 tabs with Framer Motion animated indicator + badge counts |
| **ActivityTab** | `sidebar/ActivityTab.tsx` | Stats card + filters + feed list |
| **ActivityFeedItem** | `sidebar/ActivityFeedItem.tsx` | Event label + timestamp + category icon + expandable data |
| **FeedFilters** | `sidebar/FeedFilters.tsx` | Category chips + agent dropdown + time filter |
| **AutonomyStatsCard** | `sidebar/AutonomyStatsCard.tsx` | Tasks completed + handoffs + cost |
| **ApprovalsTab** | `sidebar/ApprovalsTab.tsx` | Pending approvals list + TaskPipelineView |
| **ApprovalItem** | `sidebar/ApprovalItem.tsx` | Approve/reject buttons + risk badge + expiry |
| **TaskPipelineView** | `sidebar/TaskPipelineView.tsx` | Kanban: Queued→Assigned→InProgress→Review→Done |
| **HandoffChainTimeline** | `sidebar/HandoffChainTimeline.tsx` | Agent chain timeline with animated connectors |
| **ApprovalsEmptyState** | `sidebar/ApprovalsEmptyState.tsx` | Empty state for approvals |
| **approvalUtils.ts** | `sidebar/approvalUtils.ts` | `isApprovalExpired(task)` — checks TTL |
| **BrainDocsTab** | `sidebar/BrainDocsTab.tsx` (123 lines) | Brain tab container: documents + autonomy settings + work outputs |
| **DocumentUploadZone** | `sidebar/DocumentUploadZone.tsx` (168 lines) | Drag-drop + click file upload (PDF/DOCX/TXT/MD, 10MB max); states: idle/dragging/uploading/error; POST to `/api/projects/:id/brain/upload` |
| **DocumentCard** | `sidebar/DocumentCard.tsx` (79 lines) | Document list item: file icon, title, type badge (PDF=blue, DOCX=orange, MD=green, TXT=muted), date, delete button; optimistic delete with rollback |
| **AutonomySettingsPanel** | `sidebar/AutonomySettingsPanel.tsx` (208 lines) | Toggle autonomous execution + 4-position autonomy dial (observe/propose/confirm/autonomous) + inactivity trigger select (30min/1hr/2hr/4hr); debounced 800ms PATCH save; flash-save animation |
| **WorkOutputSection** | `sidebar/WorkOutputSection.tsx` (105 lines) | Completed task outputs as collapsible accordion; agent avatar + task title + date + monospace output; one-open-at-a-time pattern |

### Avatar Components (32 files)
- `AgentAvatar.tsx` — Dispatcher: role → character name → specific avatar component; `isWorking` → pulsing ring
- `BaseAvatar.tsx` — Common styling (circle, border, fallback emoji, working animation)
- 30 role-specific avatars (MayaAvatar, AlexAvatar, CodaAvatar, etc.) — each renders custom SVG with role colors

### UI Primitives (50+ shadcn files) — Never modify directly

---

## PART 2: BACKEND (~115 files, ~20,000+ lines)

### Server Entry (`server/index.ts`)
Initialization flow: .env → production guardrails → storage mode assertion → runtime config → Helmet → CORS → rate limiting (200/15min, 15/min AI) → session middleware (PostgreSQL, 7-day TTL) → ensure session table → auth schema compat → tool cache → config snapshot → runtime checks → registerRoutes → Vite/static → listen port 5001 → background runner → pg-boss worker → graceful shutdown

### Routes (7 modules, 40+ endpoints)

#### `server/routes.ts` — Orchestrator (~500 lines)
- `registerRoutes(app, sessionParser)` — initializes all route modules + WS server
- `getGlobalBroadcast()` — module-level broadcast reference
- OAuth endpoints: `/api/auth/google/start`, `/api/auth/google/callback`
- Auth: GET `/api/auth/me`, POST `/api/auth/logout`
- Personality: GET `/api/personality/:agentId`, POST `/api/personality/feedback`
- Handoff stats: GET `/api/handoffs/stats`, `/api/handoffs/history`

#### `server/routes/chat.ts` — WebSocket & Streaming (~2,878 lines)
| Function | What It Does | Key Algorithm |
|----------|-------------|---------------|
| `registerChatRoutes()` | Attaches WS server, processes all inbound WS messages | Streaming lifecycle: validate → parse mentions → conductor routing → safety scoring → LLM stream → tone guard → task detection → brain updates → store with idempotency |
| `checkForAutonomyTrigger()` | Checks if background execution should start | Tier gate → daily budget check → resolveAutonomyTrigger() → queue task execution |
| `sendWsError()` | Safely emits error to WS client | Error without throwing |
| `getStreamingErrorPayload()` | Maps LLM errors to user-friendly codes | 401→"brain connection", 429→fallback provider |

#### `server/routes/projects.ts` — Project CRUD + Brain
| Endpoint | Key Logic |
|----------|-----------|
| POST `/api/projects` | `checkProjectLimit` tier gate; creates canonical conversation; initializes Maya via `initializeIdeaProject()` or starter pack via `initializeStarterPackProject()`; broadcasts `project_created` |
| PATCH `/api/projects/:id` | Partial update (coreDirection, brain, executionRules); Pro gate for autonomy settings |
| POST `/api/projects/:id/brain/documents` | Add brain document |
| PATCH `/api/projects/:id/brain` | Update shared memory |

#### `server/routes/tasks.ts` — Task Management + AI Extraction
| Endpoint | Key Logic |
|----------|-----------|
| POST `/api/tasks/extract` | AI extraction via `extractTasksFromMessage()` → fallback to `extractTasksFallback()` (keyword matching) |
| POST `/api/task-suggestions/analyze` | Generate task suggestions from conversation |
| PATCH `/api/tasks/:id` | Update status, priority, assignee, metadata |

#### `server/routes/autonomy.ts` — Autonomy Events + Approvals
| Endpoint | Key Logic |
|----------|-----------|
| GET `/api/autonomy/events` | Filter by projectId, eventType, since, limit |
| GET `/api/autonomy/approvals/pending` | Get pending approvals for user |
| POST `/api/autonomy/approvals/:id/approve` | Approve high-risk action |
| POST `/api/autonomy/approvals/:id/reject` | Reject autonomous action |
| GET/PATCH `/api/autonomy/settings/:projectId` | Autonomy dial (Observe/Propose/Confirm/Autonomous) |

#### `server/routes/billing.ts` — Stripe Integration (v1.2)
| Endpoint | Key Logic |
|----------|-----------|
| POST `/api/billing/checkout` | Create Stripe Checkout Session → redirect URL |
| POST `/api/billing/portal` | Create Stripe Customer Portal → redirect URL |
| GET `/api/billing/status` | Subscription + usage summary (works without Stripe) |
| POST `/api/billing/webhook` | Raw body, sig verified; 4 event types; idempotency check |

#### `server/routes/health.ts`
- GET `/api/health` → `{ status, wsConnections, providers, storage, database, timestamp }`

#### Brain Upload (Phase 14 — added 2026-03-26)
| Module | Key Functions | Key Logic |
|--------|--------------|-----------|
| **`server/lib/extractDocumentText.ts`** | `extractDocumentText(buffer, mimeType)` | PDF (pdf-parse v2 class API) / DOCX / TXT / MD text extraction; 50k char limit truncation |
| **New endpoints** | `POST /api/projects/:id/brain/upload` | Multer v2 multipart/form-data; file validation (extension allowlist + 10MB); stores as `uploaded-pdf\|uploaded-docx\|uploaded-txt\|uploaded-md` doc types |
| | `DELETE /api/projects/:id/brain/documents/:docId` | Remove brain document by ID |
| **Schema extensions** | `executionRules.autonomyLevel` | `'observe' \| 'propose' \| 'confirm' \| 'autonomous'` enum |
| | `executionRules.inactivityTriggerMinutes` | 30–480 range for inactivity-based autonomy trigger |

### AI Pipeline (`server/ai/`, ~6,000 lines, 35+ modules)

| Module | Key Functions | Key Algorithms |
|--------|--------------|----------------|
| **openaiService.ts** | `generateStreamingResponse()`, `generateIntelligentResponse()` | Prompt architecture: system prompt → CHARACTER VOICE (voicePrompt, tendencies, neverSays) → PROFESSIONAL DEPTH (domain depth, critical thinking, pushback, collaboration) → DOMAIN INTELLIGENCE (reasoning pattern, output standards) → emotional signature → user behavior profile → conversation history (last 15) → enhanced prompt |
| **conductor.ts** | `evaluateConductorDecision()`, `buildRoleIdentity()` | Expert matching via `findBestAgentMatch()` (cosine similarity); route types: addressed_agent (@mention) → intent_specialist (keyword inference) → authority_default (Maya/PM); safety score calculation |
| **safety.ts** | `evaluateSafetyScore()`, `needsClarification()`, `hasExplicitCreationIntent()` | Risk scoring: baselines (hallucination 0.15, scope 0.1, execution 0.1); increases for absolute claims (+0.12), missing uncertainty (+0.1), scope conflicts (+0.18), prompt injection (+0.7+); thresholds: 0.35 peer review, 0.70 clarification |
| **forecast.ts** | `isStrategicTurn()`, `buildDecisionForecast()` | 3 scenarios (Fast-track/Balanced/Quality-first) with probability based on risk |
| **actionParser.ts** | `parseAction()`, `stripActionBlocks()`, `detectUserPermission()` | Regex extraction of `<!--HATCH_SUGGESTION:-->`, `<!--TASK_SUGGESTION:-->`, `<!--BRAIN_UPDATE:-->`; permission detection: granted/denied/pending |
| **mentionParser.ts** | `resolveMentionedAgent()`, `getAutocompleteSuggestions()` | Priority: @mention → role reference → pattern hints; role patterns: /developer/i, /designer/i, etc. |
| **expertiseMatching.ts** | `analyzeQuestion()`, `findBestAgentMatch()`, `calculateExpertiseConfidence()`, `initiateHandoff()`, `coordinateMultiAgentResponse()` | Cosine similarity on expertise keywords; BFS cycle detection in handoff chain; multi-agent consensus selection |
| **responsePostProcessing.ts** | `applyTeammateToneGuard()`, `detectEmotionalState()` | Removes markdown headers, bullet lists; enforces max 1 question; removes sycophantic openers; emotional state: excited/frustrated/curious/analytical/neutral |
| **personalityEvolution.ts** | `adaptPersonalityFromBehavior()`, `adaptPersonalityFromFeedback()`, `generatePersonalityPrompt()` | Analyzes user message frequency, verbosity, decision speed; adjusts voice prompt + tendency strength; persists adaptedTraits per user |
| **taskDetection.ts** | `extractTasksFromMessage()`, `extractTasksFallback()` | LLM-based extraction → keyword fallback ("task:", "TODO:", "do this:") |
| **trainingSystem.ts** | `recordLearningEvent()`, `generateEnhancedPrompt()` | In-memory feedback collection; in-context example generation |
| **roleProfiles.ts** | `roleProfiles[role]` | Expertise arrays, domain depth, critical thinking, collaboration style |
| **characterProfiles.ts** | `getCharacterProfile(role)` | voicePrompt, tendencies, neverSays, negativeHandling, emotionalSignature |
| **conversationCompactor.ts** | `compactConversation()`, `getCompactedContext()` | Groq (free) summarization of old messages; preserves recent 15 |
| **reasoningCache.ts** | `getReasoningHint()`, `cacheReasoningPattern()` | In-memory cache, 1hr TTL, project-scoped |
| **taskComplexityClassifier.ts** | `classifyMessageComplexity()`, `resolveMaxTokens()` | Heuristic: message length + question count → simple (150 tokens) / standard (500) / complex (800) |
| **returnBriefing.ts** | `generateReturnBriefing()` | Summarizes completed work while user inactive; delivered by Maya |

### Autonomy System (`server/autonomy/`, ~2,000 lines, 20+ modules)

| Module | Key Functions | Key Algorithms |
|--------|--------------|----------------|
| **execution/taskExecutionPipeline.ts** | `queueForBatch()`, `executeBatchedTasks()`, `executeTask()`, `getRoleRiskMultiplier()` | **Batching**: collect same-agent tasks (max 3), wait 5s, single LLM call, parse JSON array response, fallback to individual. **Safety pipeline**: score → role risk multiplier (infra 1.3x, creative 0.8x) → peer review if ≥0.35 → approval if ≥0.60 → trust update |
| **peerReview/peerReviewRunner.ts** | `shouldTriggerPeerReview()`, `runPeerReview()`, `evaluatePeerReviewRubric()` | Select 2 reviewers (different from primary); 7 role-specific lenses (engineering/design/data/strategy/marketing/QA/ops); synthesize revisions |
| **peerReview/peerReviewRubric.ts** | Review criteria definitions | Fixability heuristics per domain; missing question patterns |
| **handoff/handoffOrchestrator.ts** | `orchestrateHandoff()` | Find dependent tasks; max hops guard (MAX_HANDOFF_HOPS=5); BFS cycle detection; structured handoff context via `handoffProtocol` (.passes/.receives); queue next task execution |
| **handoff/handoffAnnouncement.ts** | `emitHandoffAnnouncement()` | In-character handoff message generation; WS broadcast |
| **trustScoring/trustScorer.ts** | `calculateTrustScore()`, `updateTrustMeta()` | **Formula**: `(completed / (completed + failed)) * min(1, total / 10)`. Maturity threshold: 10 tasks. Default 0.5 |
| **trustScoring/trustAdapter.ts** | `getAdjustedThresholds()` | Trust ≥0.7: relaxes peerReviewTrigger by +0.15; trust <0.3: raises by +0.20 |
| **events/eventLogger.ts** | `logAutonomyEvent()` | Fire-and-forget JSONB storage to autonomy_events table |
| **traces/traceStore.ts** | `createDeliberationTrace()`, `appendDeliberationRound()`, `finalizeDeliberationTrace()` | Deliberation lifecycle with UNIQUE trace_id |
| **integrity/conversationIntegrity.ts** | `assertConversationOrdering()`, `checkIdempotencyKey()`, `ensureMessageId()` | Monotonic ordering check; idempotency key dedup; auto-UUID generation |
| **config/policies.ts** | Constants: `BUDGETS`, `MAX_HANDOFF_HOPS`, `FEATURE_FLAGS` | maxBackgroundLlmCalls: 50/project/day; maxReviewers: 2; dailyAutonomyTaskLimit: 50 |
| **taskGraph/taskGraphEngine.ts** | `createTaskGraph()`, `getReadyTasks()` | DAG from task.metadata.dependsOn; topological sort for execution order |
| **triggers/autonomyTriggerResolver.ts** | `resolveAutonomyTrigger()` | Trigger when: pending tasks + autonomy enabled + inactivity ≥ 2hrs |
| **background/backgroundRunner.ts** | `backgroundRunner.start()`, `.stop()` | Polling loop for autonomy triggers; batch execution; completion briefings |

### LLM Providers (`server/llm/`, 6 providers)

| Module | Key Functions | Algorithm |
|--------|--------------|-----------|
| **providerResolver.ts** | `resolveRuntimeConfig()`, `buildProviderOrder()`, `generateChatWithRuntimeFallback()`, `streamChatWithRuntimeFallback()`, `runRuntimeStartupChecks()` | Multi-provider fallback chain; prod: Gemini→OpenAI; test: configurable; prior error recovery (quota→fallback) |
| **geminiProvider.ts** | `generateChat()`, `streamChat()`, `getHealth()` | Converts OpenAI-style messages to Gemini format; systemInstruction parameter |
| **openaiProvider.ts** | `generateChat()`, `streamChat()` | OpenAI SDK streaming deltas |
| **groqProvider.ts** | `generateChat()`, `streamChat()` | Free tier for simple messages, task extraction, compaction |
| **ollamaProvider.ts** | `generateChat()` | Local testing; falls back to mock on connection failure |
| **mockProvider.ts** | `generateChat()` | Deterministic responses; zero-cost; CI/unit tests |

### Storage (`server/storage.ts`, ~1,500+ lines)

**IStorage Interface (60+ methods):**
- **Users**: getUser, getUserByEmail, getUserByProviderSub, createUser, upsertOAuthUser
- **Projects**: getProjects, getProject, createProject, updateProject, deleteProject, initializeIdeaProject, initializeStarterPackProject
- **Teams**: getTeams, getTeamsByProject, createTeam, updateTeam, deleteTeam
- **Agents**: getAgents, getAgentsByProject, getAgentsByTeam, createAgent, updateAgent, deleteAgent
- **Conversations**: getConversationsByProject, createConversation, archiveConversation, unarchiveConversation, deleteConversation
- **Messages**: getMessagesByConversation (cursor pagination), getMessage, createMessage, setTypingIndicator, addMessageReaction, getMessageReactions, storeFeedback
- **Memory**: addConversationMemory, getConversationMemory, getProjectMemory, getRelevantProjectMemories (semantic search with minImportance)
- **Tasks**: getTask, getTasksByProject, getTasksByAssignee, createTask, updateTask, deleteTask
- **Billing**: upsertDailyUsage, getDailyUsage, getMonthlyUsage, updateUserTier, getUserTier, checkWebhookProcessed, markWebhookProcessed
- **Autonomy**: countAutonomyEventsForProjectToday, countAutonomyEventsByAgent, getProjectTimestamps, setProjectLastSeenAt, getAutonomyEventsSince

**Two implementations**: MemStorage (in-memory maps) + DatabaseStorage (PostgreSQL via Drizzle ORM)

### Auth (`server/auth/googleOAuth.ts`)
- `isGoogleAuthConfigured()`, `generateOAuthState()`, `generateOAuthNonce()`, `generateCodeVerifier()`, `generateCodeChallenge()` (SHA256+base64url), `buildGoogleAuthorizationUrl()`, `exchangeGoogleAuthorizationCode()` (code+PKCE→JWT→claims)

### Orchestration
- `resolveSpeakingAuthority()` — Project: Maya→PM→first agent; Team: lead→first member; 1-on-1: specific agent
- `filterAvailableAgents()` — Scope filtering (team vs project)

### Billing (`server/billing/`, 4 modules)
- `recordUsage()` — Cost calc from COST_TABLE (Gemini Flash $0.15/$0.60M, Pro $1.25/$5.00M, GPT-4o-mini $0.15/$0.60M, Groq $0/$0)
- `getDailyMessageCount()` — Cache-first, DB fallback
- `estimateCostCents()` — (prompt/1M * prompt_cost) + (completion/1M * completion_cost)
- `createCheckoutSession()`, `createPortalSession()` — Stripe SDK
- `handleStripeWebhook()` — Sig verify, 4 event types, idempotency check
- **Middleware**: `checkProjectLimit()` (Free: 3, Pro: unlimited), `checkAutonomyAccess()`, `checkMessageSafetyCap()` (Free: 500/day + 15/min)

---

## PART 3: SHARED MODULES

| Module | Key Exports |
|--------|-------------|
| `shared/schema.ts` | 14 Drizzle ORM tables: users, projects, teams, agents, conversations, messages, message_reactions, typing_indicators, tasks, autonomy_events, deliberation_traces, usage_daily_summaries, conversation_memory, stripe_webhooks |
| `shared/roleRegistry.ts` | 30 role definitions: voicePrompt, negativeHandling, criticalThinking, collaborationStyle, domainDepth |
| `shared/roleIntelligence.ts` | 30 intelligence profiles: reasoningPattern, outputStandards, peerReviewLens (7 categories), handoffProtocol (.passes/.receives), escalationRules, baseTraitDefaults |
| `shared/conversationId.ts` | `parseConversationId()`, `buildConversationId()` — canonical format |
| `shared/templates.ts` | Starter pack definitions (8 templates with team configs) |
| `shared/dto/wsSchemas.ts` | Zod schemas for all WS message types |

---

## PART 4: KEY ALGORITHMS SUMMARY

| Algorithm | Location | Description |
|-----------|----------|-------------|
| **Risk Scoring** | safety.ts | `aggregateRisk = max(hallucination, scope, execution)`; baselines 0.15/0.1/0.1; prompt injection +0.7+ |
| **Trust Scoring** | trustScorer.ts | `(completed / total) * min(1, total / 10)`; maturity threshold 10 tasks |
| **BFS Cycle Detection** | handoffOrchestrator.ts | Breadth-first search on agent handoff chain to prevent infinite loops |
| **Cosine Similarity Matching** | expertiseMatching.ts | Ranks agents by keyword overlap with user message |
| **Exponential Backoff** | websocket.ts | `min(1000 * 2^retryCount, 30000)`, max 10 retries |
| **Cursor Pagination** | storage.ts | Before/after cursor on messages, returns {messages, hasMore, nextCursor} |
| **Task Batching** | taskExecutionPipeline.ts | Collect same-agent tasks (max 3), wait 5s, single LLM call |
| **Conversation Compaction** | conversationCompactor.ts | Groq-based summarization of old messages, preserves recent 15 |
| **Adaptive Token Allocation** | taskComplexityClassifier.ts | Message complexity → simple (150) / standard (500) / complex (800) tokens |
| **LLM Multi-Provider Fallback** | providerResolver.ts | Chain: Gemini→OpenAI (prod); quota error→fallback→mock |
| **Trust-Adjusted Thresholds** | trustAdapter.ts | Trust ≥0.7: relax peerReview by +0.15; trust <0.3: raise by +0.20 |
| **Role Risk Multiplier** | taskExecutionPipeline.ts | Infra: 1.3x (escalate sooner), Creative: 0.8x (more autonomy) |
| **Topological Sort** | taskGraphEngine.ts | DAG from task dependencies, execution order |
| **Idempotency** | conversationIntegrity.ts | Client-sent idempotencyKey prevents duplicate message processing |
| **PKCE OAuth** | googleOAuth.ts | state + nonce + codeVerifier → SHA256 challenge → code exchange |

---

## PART 5: TEST & EVALUATION INVENTORY (60+ scripts)

### Pre-Merge Required
| Command | Tests | Purpose |
|---------|-------|---------|
| `npm run typecheck` | TypeScript compiler | Type safety |
| `npm run gate:safety` | Safety thresholds | Risk scoring correctness |
| `npm run test:integrity` | Conversation integrity | Message ordering + dedup |
| `npm run test:dto` | DTO contracts | API schema compliance |

### Unit Tests (no LLM)
- `test-voice-distinctiveness.ts` — 8 tests, 30 roles unique names/voices
- `test-agent-pushback.ts` — 46 tests, domain-specific pushback coverage
- `test-reasoning-patterns.ts` — 240 tests, roleIntelligence completeness
- `test-tone-guard.ts` — No markdown headers/bullets in responses
- `test-prompt-injection.ts` — Injection patterns blocked
- `test-conversationId.ts` — Canonical ID format validation
- `test-memory-persistence.ts` — JSONB round-trip
- `test-pagination.ts` — Cursor-based pagination correctness

### Integration Tests
- `eval-routing.ts` — Agent routing accuracy (10+ scenarios)
- `eval-bench.ts` — 14 metric categories, 50 prompts, A-F grading
- `eval-alive.ts` — System liveness (health + providers + WS)
- `test-execution-pipeline.ts` — Safety gates + peer review + approval

### Stress Tests
- `test-ws-race.ts` — Multiple simultaneous WS messages
- `test-ws-reconnect.ts` — Drop + resync
- `stress-test-conversation-bootstrap.ts` — 100+ conversations
- `stress-test-resolve-speaking-authority.ts` — 500 concurrent calls

### Full QA Suites
| Command | What It Runs |
|---------|-------------|
| `npm run qa:full` | lint → typecheck → build |
| `npm run qa:autonomy` | 14-test chain (DTO→integrity→injection→tone→routing→conductor→safety→performance→bench→alive) |
| `npm run benchmark:full` | Unified benchmark (14 categories, A-F) + markdown report |

---

## PART 6: KNOWN BUGS & UI ISSUES

### Prior Audit Bugs

| Bug | Location | Severity |
|-----|----------|----------|
| Stale closure in toggleSection | `useRightSidebarState.ts` | HIGH — saves preferences via setTimeout with captured stale state |
| "Core Team (0)" vs "Core Team (1)" count | `ProjectTree.tsx` / header | MEDIUM — sidebar filters Maya but header counts her |
| Individual Hatch cards show role twice | `ProjectTree.tsx` | LOW — subtitle should show character name, not role |

### Right Sidebar UI Issues (User-reported 2026-03-26)

| Issue | Description | User Intent |
|-------|-------------|-------------|
| Right sidebar UI "all messed up" | Visual/layout problems in the right sidebar after Phase 14 execution | Needs visual audit and fix |
| Approvals tab should merge into Activity | User wants Approvals folded into the Activity tab, not as a separate third tab | Merge: Activity + Approvals → single tab; keep Brain & Docs as second tab |
| Brain & Docs tab "messed up" | Brain tab UI broken or not meeting expectations after Phase 14 brain redesign | Needs visual audit and fix |
| Too much visual noise in Activity tab | Stats card (3 pills) + 5 filter chips + time filters + agent dropdown = information overload | Simplify/reduce filter density |

---

---

## PART 7: DEEP-DIVE — AI INTELLIGENCE SYSTEM (Every Function Signature, Constant, Regex)

### `server/ai/openaiService.ts` (656 lines)

**Functions:**
1. `generateStreamingResponse(userMessage: string, agentRole: string, context: ChatContext, sharedMemory?: string, abortSignal?: AbortSignal, onMetadata?: (m: LLMResponseMetadata) => void): AsyncGenerator<string>` — Streams LLM response with 15+ prompt sections injected: CHARACTER VOICE, ROLE EXPERTISE, EMOTIONAL RESONANCE, PRACTITIONER SKILLS, PROJECT CONTEXT, PROJECT MEMORY, OPEN THREADS, USER CONTEXT, HANDOFF, FIRST MESSAGE, CONVICTION, MAYA TEAM INTELLIGENCE, HATCH TASK INTELLIGENCE, HATCH BRAIN UPDATE INTELLIGENCE, REASONING HINT, ROLE BRAIN
2. `generateIntelligentResponse(userMessage, agentRole, context): Promise<ColleagueResponse>` — Non-streaming single-shot with same prompt architecture
3. `createPromptTemplate({role, userMessage, context, roleProfile, userBehaviorProfile?, messageAnalysis?}): {systemPrompt, userPrompt}` — Static prompt builder, conversation history slice (last 15)
4. `calculateConfidence(response, userMessage, roleProfile): number` — Base 0.5, +0.2 length>50, +0.2 role keywords, +0.1 addresses user. Clamped [0,1]

**Interfaces:** `ChatContext` (mode, projectName, projectId, conversationId, teamName, agentRole, agentId, conversationHistory[], userId, projectDirection, teamMembers, projectMemories, userDesignation, handoffFrom, createConversationMemory), `ColleagueResponse` (content, reasoning?, confidence, metadata?)

### `server/ai/conductor.ts` (155 lines)

**Functions:**
1. `inferRoleFromMessage(userMessage, agents): ExpertiseAgent | undefined` — 4 role priority rules: QA (qa/test/regression/safety/hallucination), Backend (api/websocket/idempotency/race/stream/timeout/schema/db/persistence/routing/latency/drift/reliability/budget), Designer (design/ux/ui/layout/typography/sidebar/interaction/mobile/visual/hierarchy/composer/overlap/spacing/scroll), PM (roadmap/strategy/scope/launch/mvp/owner/dependency/go-to-market/gtm/milestone). Fallback: Maya→PM→first
2. `inferDeliberationNeed(userMessage): boolean` — Regex: approval gate, rollback, fallback chain, cross-functional, risk, safety, hallucination, drift, task graph, isolation, forecast, manual override, go-to-market, integration test, race condition, idempotency
3. `buildRoleIdentity({projectId, roleTemplateId, agentId?}): RoleIdentity` — Key: `${projectId}:${roleTemplateId}:${agentId||"virtual"}`
4. `evaluateConductorDecision({userMessage, conversationMode, availableAgents, addressedAgentId?, projectName?})` — Routes: addressed_agent(@mention) > intent_specialist(confidence≥0.55) > authority_default. Reviewer count: 0/1/2 based on risk. Gate if executionRisk≥0.65

### `server/ai/safety.ts` (196 lines)

**Constants:**
- `SAFETY_THRESHOLDS`: peerReviewTrigger 0.35, doubleReviewTrigger 0.65, clarificationRequiredRisk 0.70, clarificationRequiredConfidence 0.45
- `AUTONOMOUS_SAFETY_THRESHOLDS`: peerReviewTrigger 0.35, clarificationRequiredRisk 0.60
- `ABSOLUTE_CLAIMS`: "guaranteed, always, never fails, 100%, certainly, definitely, no risk"
- `RISKY_EXECUTION`: "delete, drop table, production deploy, publish, send to all users"
- `EVASION_PATTERNS`: "without being detected", "(avoid|bypass|evade|circumvent|ignore|disable).{0,40}(tax|legal|compliance|security)"
- `SCOPE_CONFLICT`: "other project, another project, cross project, different project"
- `PROMPT_INJECTION_PATTERNS`: "ignore previous instructions, reveal system prompt, developer message, god mode, bypass policy, disable safeguards, jailbreak, tool output says"
- `EXPLICIT_CREATION_INTENTS`: "(create|add|make|build|set up|start|spin up).{0,30}(team|hatch|agent|task|project|channel|doc)"

**Functions:**
1. `evaluateSafetyScore({userMessage, draftResponse?, conversationMode, projectName?, executionContext?}): SafetyScore` — Baselines: hallucination 0.15, scope 0.1, execution 0.1 (0.05 for creation intents). Adjustments: +0.12/absolute claim, +0.1/no uncertainty markers (>180 chars), +0.1/future claims, +0.18/scope conflict, +0.82/0.74/0.72 for prompt injection, +0.12 scope mismatch, +0.15/risky exec, +0.15/evasion, +0.10 autonomous context. Confidence: 0.92-(aggregateRisk*0.75). All clamped [0,1]
2. `hasExplicitCreationIntent(userMessage): boolean`
3. `needsClarification(score): boolean` — True if any risk ≥0.70 OR confidence <0.45
4. `buildClarificationIntervention({projectName?, reasons[]}): string`

### `server/ai/personalityEvolution.ts` (434 lines)

**PersonalityEvolutionEngine class methods:**
1. `getPersonalityProfile(agentId, userId, role?)` — Init if missing, normalize bare agentId
2. `seedProfileFromDB(agentId, userId, adaptedTraits, meta, role?)` — No-op if already live
3. `adaptPersonalityFromBehavior(agentId, userId, userBehavior, messageAnalysis)` — Skips first 3 interactions, throttles to every 5th. Adjustments: anxious→empathy+0.1/directness-0.05, decisive→directness+0.1/verbosity-0.05, analytical→technicalDepth+0.1/verbosity+0.05, casual→formality-0.1/enthusiasm+0.05
4. `adaptPersonalityFromFeedback(agentId, userId, feedback, messageContent, agentResponse)` — Positive: reinforce extremes +0.02, negative: move toward center ±0.05
5. `generatePersonalityPrompt(agentId, userId)` — Checks trait thresholds (0.3, 0.7) for guidance
6. `getPersonalityStats(agentId, userId)` — Trait changes + interaction stats

**PersonalityTraits**: formality, verbosity, empathy, directness, enthusiasm, technicalDepth (all 0-1)

### `server/ai/responsePostProcessing.ts` (285 lines) — Tone Guard Pipeline

**Full pipeline in `applyTeammateToneGuard()`**: stripRoleIntroduction → removeAiIsms (14 patterns) → stripChatUnfriendlyFormatting (headers, bullets→prose, bold headers) → adaptLength (short: 2 sentences, medium: 5, long: uncapped) → applyAdaptiveClosing (soft closings by emotional state) → keepSingleQuestion (all ? after first→.)

**14 AI-isms removed:** "Certainly/Absolutely/Of course→empty", "As an AI→empty", "I'd/would be happy to→happy to", etc.
**Emotional states detected:** excited (!!|amazing|love it), frustrated (not working|broken|wtf), uncertain (not sure|maybe|idk), casual (ok|yeah|cool), focused (default)
**Soft closings by state:** excited→"What are you most hyped about?", uncertain→"What's the part you're least sure about?", casual→"" or "What else?"

### `server/ai/expertiseMatching.ts` (472 lines)

**Functions:**
1. `findBestAgentMatch(userMessage, agents)` — Greetings→PM 0.8. Scoring: domain+0.6, toolkit+0.2, signature+0.2. Min 0.1 confidence
2. `handoffTracker.detectCycle(fromAgentId, toAgentId, windowMs=300000)` — BFS through recent handoffs (5min window), returns {hasCycle, chain[]}
3. `processHandoffRequest(handoffRequest, availableAgents)` — Cycle check + confidence comparison

### `server/ai/taskComplexityClassifier.ts` (86 lines)

**Classification rules:**
- Simple: ACK emoji OR (≤5 words + greeting) OR (≤3 words + no action/question/technical)
- Complex: ≥2 multi-part markers OR >60 words OR (technical + analysis) OR (>15 words + analysis) OR (technical + creative) OR (>30 words + domain keyword)
- Standard: everything else

**Token allocation:** First message: 350, simple: 200, standard: 400, complex: 500

### `server/ai/colleagueLogic.ts` (261 lines)

**5 role-specific logic pipelines:**
- PM: `scorePriority` (urgent/critical keywords→score 9), `estimateTimeline` (count features→weeks=max(2, features*2))
- Backend: `analyzeDatabaseIssue` (slow query→indexes/caching/pooling/N+1), `securityAudit` (auth keywords→JWT/validation/rate-limit/HTTPS)
- UI Engineer: `analyzePerformance` (slow/laggy→bundle/lazy/virtualization/memo), `responsiveDesignCheck` (mobile→breakpoints)
- QA: `generateTestCases` (test/bug→5 test types), `assessRisk` (deploy/ship→4 risk factors)
- Designer: `analyzeUserFlow` (user/flow→reduce cognitive load/hierarchy/patterns/accessibility)

### `server/ai/tasks/organicExtractor.ts` (130 lines)

- `extractOrganicTasks()` — 30s cooldown per conversation; Groq (FREE) with Gemini fallback; deduplicates against existing tasks
- `extractJsonObject(text)` — Regex extracts first {...} JSON block

### `server/ai/conversationCompactor.ts` (159 lines)

- `COMPACTION_THRESHOLD: 8`, `TAIL_SIZE: 4`, `FALLBACK_TAIL_SIZE: 10`
- Groq summarization, fire-and-forget, 300 token max, "3-4 sentences preserving decisions/actions/context"
- Stores summary as conversationMemory with importance 8

### `server/ai/reasoningCache.ts` (180 lines)

- 4 categories (technical: 18 terms, planning: 12, creative: 12, analytical: 13)
- LRU eviction at MAX_CACHE_SIZE (200), 1hr TTL
- Returns hint: "In a previous similar context, the approach was: {structure}"

### `server/ai/actionParser.ts` (121 lines)

**3 action block patterns:** `<!--HATCH_SUGGESTION:-->`, `<!--TASK_SUGGESTION:-->`, `<!--BRAIN_UPDATE:-->`
**Permission detection:** 17 grant phrases ("yes, yep, sure, ok, do it, add it, let's go, go for it, sounds good, great, perfect, create it, go ahead, proceed, absolutely, approve, agreed"), 12 deny phrases ("no, nope, not yet, wait, stop, cancel, skip, don't, ignore, dismiss, forget it, never mind"). Deny checked first (shorter=stronger)

### `server/ai/mentionParser.ts` (141 lines)

**3-step resolution:** @mention (regex: `/@([A-Za-z][A-Za-z0-9 _-]*)/) → role reference (4 phrase patterns: "ask/let/have the [role]", "can the [role]", "talk to the [role]", "get [role] to") → 7 ROLE_REFERENCE_PATTERNS fallback hints

---

## PART 8: DEEP-DIVE — AUTONOMY SYSTEM (Every Function, Every Constant)

### `server/autonomy/execution/taskExecutionPipeline.ts`

**Constants:** BATCH_MAX=3, BATCH_WAIT_MS=5000
**Global state:** `pendingBatches: Map<string, PendingBatch>`

**Functions:**
1. `getRoleRiskMultiplier(role, taskDescription): number` — Infrastructure: 1.3x, Legal/Financial: 1.25x, Creative: 0.8x, Default: 1.0x
2. `queueForBatch(input): Promise<{status}>` — Groups same-agent tasks; fires when full (3) or timeout (5s); polling with 100ms checks + timeout safety (BATCH_WAIT_MS+2000ms)
3. `executeBatchedTasks(inputs): Promise<Array<{status}>>` — Single LLM call for batch (800 token budget); JSON array output `[{taskIndex, output}]`; fallback to individual on parse failure
4. `executeTaskWithOutput(input, output): Promise<{status}>` — Safety → trust-adjusted thresholds → role multiplier → clarification gate (any risk≥clarificationRequired) → peer review gate (maxRisk≥peerReviewTrigger, 2 reviewers) → auto-complete path
5. `executeTask(input): Promise<{status}>` — Generate text + full safety pipeline (same as executeTaskWithOutput)
6. `getAgentTrustScore(personality): number` — Extract from personality.trustMeta.trustScore, default 0.0
7. `updateAgentTrustScore(storage, agentId, success): Promise<void>` — Fetch→calculate→update personality JSONB. Non-critical (catches errors)
8. `handleTaskJob(job, deps): Promise<void>` — Cost cap check → pause check → batch execution → handoff chain (structured context via handoffProtocol) → usage recording. Error: mark blocked, decrement trust
9. `startTaskWorker(deps): Promise<void>` — Registers pg-boss worker on 'autonomous_task_execution'

### `server/autonomy/peerReview/peerReviewRunner.ts`

1. `shouldTriggerPeerReview({confidence, riskScore, userMessage, ...}): {triggered, reasons[]}` — Triggers on: risk≥0.35, confidence<0.55, "are you sure", factual patterns, proposal turn, safety sensitive, canon contradiction
2. `synthesizeRevisions({draftResponse, reviews, highRisk}): {revised, clarificationRequired}` — Dedup fix suggestions (max 5); high risk→clarification; append numbered quality checks
3. `runPeerReview(input): Promise<PeerReviewDecision>` — Trigger check → select reviewers (max 2, exclude primary) → evaluate rubrics → detect hallucination (high risk across reviews) → synthesize → handle overrides → finalize trace

### `server/autonomy/peerReview/peerReviewRubric.ts`

- `FACTUAL_CLAIM_PATTERN`: `/\b(according to|research shows|always|never|guaranteed|proven|statistically|exactly \d+%|forecast)\b/i`
- `generateRoleSpecificChecks(reviewerRole, draft, user, lens)` — 7 lens categories (Engineering: edge cases/error handling/scalability; Design: UX/accessibility; Data: statistical validity/bias; Strategy: trade-offs/stakeholders; Marketing: audience/brand; QA: testability/acceptance criteria; Ops: process impact/dependencies). Max 2 questions + 2 suggestions each
- `evaluatePeerReviewRubric(input): PeerReviewRubric` — Safety score → canon checks (keyword extraction from hints) → factual claims → launch/deploy safety → scope safety → action/owner checks → role-specific checks → hallucination risk (high if aggregateRisk≥0.7 OR contradictions≥2, medium if ≥0.35 OR missingQuestions>0)

### `server/autonomy/handoff/handoffOrchestrator.ts`

- `orchestrateHandoff(input): Promise<HandoffResult>` — Max hops guard (MAX_HANDOFF_HOPS=5) → find dependent tasks (status='todo', dependsOn=completedTask.id) → conductor routing → BFS cycle detection → structured handoff context (from.passesFormat, to.expectsFormat, output, taskCompleted) → update task metadata → queue execution → record handoff

### `server/autonomy/trustScoring/trustScorer.ts`

- `MATURITY_THRESHOLD = 10`
- `calculateTrustScore({tasksCompleted, tasksFailed}): number` — Formula: `(completed/total) * min(1, total/10)`. Example: 3 completions, 0 failures = 1.0 * 0.3 = 0.3
- `updateTrustMeta(current, success): TrustMeta` — Increment completed/failed → recalculate → update timestamp

### `server/autonomy/trustScoring/trustAdapter.ts`

- `MAX_PEER_REVIEW_BOOST = 0.15`, `MAX_CLARIFICATION_BOOST = 0.15`
- `getAdjustedThresholds(trustScore): AdjustedThresholds` — peerReviewTrigger = 0.35 + trust * 0.15; clarificationRequiredRisk = 0.60 + trust * 0.15. Example: trust 0.5 → peerReview 0.425

### `server/autonomy/config/policies.ts`

**All constants:** maxBackgroundLlmCallsPerProjectPerDay: 50, maxReviewers: 2, dailyAutonomyTaskLimit: 50, MAX_HANDOFF_HOPS: 5, FEATURE_FLAGS (backgroundExecution, peerReviewEnabled, trustScoringEnabled), BUDGETS, autonomyLevels (observe/propose/confirm/autonomous)

---

## PART 9: DEEP-DIVE — FRONTEND STATE MACHINES & HANDLERS

### `useRightSidebarState.ts` — 14 Reducer Actions

Actions: SET_LOADING, SET_ERROR, SET_ACTIVE_VIEW, TOGGLE_SECTION, UPDATE_CORE_DIRECTION, UPDATE_EXECUTION_RULES, UPDATE_TEAM_CULTURE, SET_RECENTLY_SAVED, CLEAR_RECENTLY_SAVED, UPDATE_PREFERENCES, UPDATE_LAST_SAVED, SET_ACTIVE_TAB, LOAD_PREFERENCES, RESET_STATE

**12 useCallback actions:** savePreferences, updateCoreDirection, updateExecutionRules, updateTeamCulture, toggleSection, setRecentlySaved (auto-clear 3s), clearRecentlySaved, updatePreferences, resetPreferences, setLoading, setError, setActiveTab

**4 useEffects:** load localStorage, update active view from selection, sync project data, CustomEvent listener for `project_brain_updated` with 2.5s recently-saved indicators

### `websocket.ts` — WebSocket Connection

**Exponential backoff:** `min(1000 * 2^retryCount, 30000)`, max 10 retries
**6 refs:** reconnectTimeout, socket, shouldReconnect, onMessage/onConnect/onDisconnect/onError callbacks, retryCount, joinedConversations Set
**Conversation join replay** after reconnect from joinedConversationsRef
**Zod validation** on outbound messages via wsClientMessageSchema

### `index.css` — 11 CSS Keyframe Animations

1. `coachmark-pulse` — box-shadow 0-6px
2. `gradient-shift` — background-position 0-100%
3. `wave-bounce` — translateY 0-5px
4. `ai-task-ring` — box-shadow 1-3px
5. `flash-save` — border-color + shadow fade (0.6s)
6. `brain-glow-pulse` — box-shadow 0-12px
7. `ai-thinking-ring` — box-shadow 0-15px
8. `agent-working-ring` — rotate 360deg
9. `shimmer` — horizontal background-position shift
10. `online-pulse` — box-shadow 0-4px
11. `cursor-blink` — opacity toggle 0.5s

**40+ CSS custom properties:** `--hatchin-dark`, `--hatchin-panel`, `--hatchin-card`, `--hatchin-surface`, `--hatchin-border`, `--hatchin-text`, `--hatchin-blue`, `--hatchin-green`, `--hatchin-orange` + glass effects + premium layout + scrollbar

### `ProjectTree.tsx` — 9 Event Handlers

handleDoubleClick, handleEditSubmit, handleEditCancel, handleKeyDown (Enter/Escape), handleContextMenuToggle, handleRenameProject, handleDeleteProject, handleDeleteTeam, handleDeleteAgent. Plus outside-click useEffect for menu dismissal.

### `LeftSidebar.tsx` — Undo System + 20+ Handlers

**Undo mechanism:** Stores deleted entity data (project/team/agent + related children) → shows popup for 5s → `handleUndoDelete()` restores in sequence (project→teams with new IDs→agents with mapped team IDs) using async/await with setTimeout delays
**Keyboard shortcuts:** Ctrl+K (focus search), Escape (clear search)
**Scrollbar:** `scheduleProjectScrollbarHide()` hides after 500ms, shows temporarily on scroll/hover

### `MessageBubble.tsx` — Rendering Pipeline

`toDisplayText()` → `getBubbleStyles()` (dark/light) → `formatRelativeTime()` → `extractWidget()` (JSON from markdown fence) → `renderWidget()` (timeline_widget / feature_list / team_breakdown) → ReactMarkdown with remark-gfm + rehype-highlight

---

## PART 10: COMPLETE REGEX PATTERNS MASTER LIST (40+ patterns)

| Pattern | File | Use |
|---------|------|-----|
| `/@([A-Za-z][A-Za-z0-9 _-]*)` | mentionParser.ts | @mention extraction |
| `^(hi\|hey\|hello\|yo\|sup\|thanks\|...\|noted)\s*[.!?]*$` | taskComplexityClassifier.ts | Greeting detection |
| `^(👍\|👎\|✅\|❌\|🔥\|...\|❤️\|💜)\s*$` | taskComplexityClassifier.ts | ACK emoji |
| `^(explain\|describe\|build\|...\|break down)` | taskComplexityClassifier.ts | Action verb |
| `^(what\|who\|where\|...\|whom)` | taskComplexityClassifier.ts | Question starter |
| `\b(api\|database\|...\|token\|config\|model)\b` | taskComplexityClassifier.ts | Technical keyword |
| `\b(analyze\|compare\|...\|validate)\b` | taskComplexityClassifier.ts | Analysis keyword |
| `\b(brainstorm\|ideate\|...\|aesthetic)\b` | taskComplexityClassifier.ts | Creative keyword |
| `(\d+\.\|[-•]\s\|firstly\|...\|part \d)` | taskComplexityClassifier.ts | Multi-part marker |
| `^#{1,6}\s+.+$` | responsePostProcessing.ts | Markdown header removal |
| `^(\s*[-*+•]\s+.+\n?){2,}` | responsePostProcessing.ts | Bullet list conversion |
| `\*\*[A-Z][^*]{1,50}:\*\*\s*` | responsePostProcessing.ts | Bold header removal |
| `^\s*(?:here...as\|acting as)\s+(?:an?\|the)\s+[^,.:\n]{2,80}` | responsePostProcessing.ts | Role intro removal |
| `\b(?:as\|acting as)\s+(?:an?\|the)\s+(?:product manager\|...\|qa lead)\b` | responsePostProcessing.ts | Inline role phrase |
| `next step\s*:\s*share your top priority[^.]*\.` | responsePostProcessing.ts | Forced next step removal |
| `<!--HATCH_SUGGESTION:([\s\S]*?)-->` | actionParser.ts | HATCH_SUGGESTION block |
| `<!--TASK_SUGGESTION:([\s\S]*?)-->` | actionParser.ts | TASK_SUGGESTION block |
| `<!--BRAIN_UPDATE:([\s\S]*?)-->` | actionParser.ts | BRAIN_UPDATE block |
| `\bwithout being detected\b\|\bnot be detected\b` | safety.ts | Evasion: detection |
| `\b(avoid\|bypass\|...\|disable)\b.{0,40}\b(tax\|legal\|compliance\|security)\b` | safety.ts | Evasion: regulatory |
| `\b(ignore previous instructions\|...\|jailbreak)\b` | safety.ts | Prompt injection |
| `\b(create\|add\|...\|spin up)\b.{0,30}\b(team\|hatch\|...\|doc)\b` | safety.ts | Explicit creation intent |
| `\b(team\|hatch\|agent\|task)\b.{0,20}\b(called\|named\|for)\b` | safety.ts | Creation intent (alt) |
| `\b(according to\|research shows\|always\|never\|guaranteed\|proven\|statistically\|exactly \d+%\|forecast)\b` | peerReviewRubric.ts | Factual claim pattern |

---

## PART 11: PREVIOUSLY MISSING MODULES (Added after completeness verification)

### Infrastructure (`server/db.ts`, `server/vite.ts`)

**`server/db.ts`:**
- `export const pool` — Neon PostgreSQL connection pool (`@neondatabase/serverless` with WebSocket constructor)
- `export const db` — Drizzle ORM instance with schema. Enforces `DATABASE_URL` required at startup

**`server/vite.ts`:**
- `log(message, source?)` — Timestamped log with source tag
- `setupVite(app, server)` — Vite HMR middleware for dev
- `serveStatic(app)` — Serves `dist/public` with SPA fallback to `index.html`

### Tool System (`server/tools/`)

**`server/tools/toolRouter.ts`:**
- `type ToolKind` — `'none' | 'web' | 'code-analysis' | 'file-retrieval'`
- `estimateUncertainty(input): number` — Scores uncertainty from message content
- `routeTools({role, message, complexity, riskScore, roundsUsed, webCallsUsed}): ToolRouteDecision` — Routes to web search, code analysis, or file retrieval based on content, complexity, escalation level, and budget

**`server/tools/cache/cacheStore.ts`:**
- `hydrateCacheStore()` — Loads cache from JSON baseline file on startup
- `getCached<T>(key): T | null` — Lookup with TTL check, tracks hits
- `setCached<T>(key, value, ttlMs)` — Store with expiry
- `getCacheMetrics(): {size, activeKeys, totalHits}` — Cache stats
- `resetCacheStore()` — Clear all entries

**`server/tools/cache/ttlPolicy.ts`:**
- `resolveTopicTTL(topic): number` — Dynamic TTL: 60min for regulation/policy/pricing/security topics, 24h for general topics

### Autonomous Knowledge Loop (`server/knowledge/akl/`)

**`server/knowledge/akl/runner.ts`:**
- `runAutonomousKnowledgeLoop({projectId, conversationId, role, userMessage, draftResponse, confidence, provider, mode, highStakes}): Promise<AKLRunResult>` — Detects knowledge gaps → runs web research → creates UpdateCards → validates governance → promotes to canon → logs autonomy events
- Returns `{gapDetected, updateCard?, promoted, reason}`

**`server/knowledge/akl/gapDetector.ts`:**
- `detectKnowledgeGap({userMessage, confidence, lastUpdateAgeHours?}): KnowledgeGap` — Detects if response has low confidence (<0.62), recency-sensitive topics, or stale updates (>72h)
- Returns `{detected, reason, topic, recencySensitive}`

### Validation & Invariants

**`server/schemas/messageIngress.ts`:**
- `messageIngressEnvelopeSchema` — Zod schema for `send_message_streaming` with conversationId format validation
- `validateMessageIngress(rawData): {success, envelope?, error?, mode?, projectId?, contextId?, addressedAgentId?}` — Validates canonical message envelope, extracts mode/projectId/contextId from conversationId (project:/team:/agent:). Dev throws, prod returns error

**`server/invariants/assertPhase1.ts`:**
- `assertPhase1Invariants({type, agentId?, messageType?, conversationId?, mode?, projectId?, contextId?})` — 3 invariants: (1) no fake "system" agent, (2) conversation existence, (3) routing consistency. Dev throws, prod logs warning

**`server/utils/configSnapshot.ts`:**
- `type SnapshotRunType` — `'baseline_snapshot' | 'eval_run' | 'live_scenario_run' | 'evidence_export' | 'startup'`
- `writeConfigSnapshot(runType): Promise<SnapshotWriteResult>` — Captures 50+ config fields, computes SHA256 hash, diffs against previous, stores JSONL history
- `readConfigSnapshot(): Promise<{snapshot, hash}>` — Reads latest snapshot

### Billing & Tier Gating (v1.2)

**`server/middleware/tierGate.ts`:**
- `resolveEffectiveTier(userId): Promise<TierName>` — Resolves Free/Pro with grace period auto-downgrade
- `requirePro(req, res, next)` — Express middleware, returns 403 if not Pro
- `checkMessageSafetyCap(userId): Promise<{allowed, reason?, tier}>` — Enforces Free: 500/day + 15/min, Pro: 2000/day + 30/min

**`server/billing/usageTracker.ts`:**
- `type UsageSource` — `'chat' | 'autonomy' | 'task_extraction' | 'peer_review'`
- `recordUsage(storage, userId, provider, model, modelTier, tokenUsage, source)` — Cost calc from COST_TABLE (Gemini Flash $0.15/$0.60M, Pro $1.25/$5.00M, Groq $0/$0)
- `getDailyMessageCount(storage, userId): number` — Cache-first, DB fallback
- `getDailyAutonomyCount(storage, userId): number` — Daily autonomy task count

**`server/billing/stripeClient.ts`:**
- `getStripe(): Stripe` — Singleton, lazy-loads from STRIPE_SECRET_KEY
- `isStripeConfigured(): boolean` — Gracefully disabled without key

**`server/billing/checkoutService.ts`:**
- `createCheckoutSession(userId, userEmail, plan: 'monthly' | 'annual'): Promise<string>` — Creates/gets Stripe customer, creates checkout session, returns URL
- `createPortalSession(userId): Promise<string>` — Creates customer portal session, returns URL

**`server/billing/webhookHandler.ts`:**
- `handleWebhookEvent(rawBody, signature): Promise<{processed, eventType}>` — Verifies Stripe sig, idempotency check, handles 4 events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Shared DTO Contracts

**`shared/dto/apiSchemas.ts`:**
- `healthResponseSchema` — Zod schema for `/api/health` response (50+ fields)
- `autonomyEventSchema` — Zod schema for autonomy events
- `deliberationTraceSchema` — Zod schema for deliberation traces

**`shared/dto/errors.ts`:**
- `type ErrorCode` — 10 error codes: `INVALID_ENVELOPE`, `OPENAI_RATE_LIMITED`, `OLLAMA_UNAVAILABLE`, etc.
- `interface ApiError` — `{code, message, details?}`

### Frontend Utilities

**`client/src/lib/testModeTagging.ts`:**
- `deriveTestModeTag({mode?, provider?, model?}): TestModeTag` — Derives test mode tag from env, returns `{enabled, label, provider?, model?}`

### Onboarding Components (detailed)

**`client/src/components/WelcomeModal.tsx`:**
- `WelcomeModal({isOpen, onClose, onGetStarted})` — Welcome screen with animated egg orb, "Your AI team just woke up" messaging

**`client/src/components/OnboardingSteps.tsx`:**
- `ChatPreview()` — Typing animation + Maya reply preview
- `AgentHatch()` — Egg hatches into 3 agents (spring animation)
- `BrainFill()` — Project brain auto-fill visualization
- `OnboardingSteps({isOpen, onClose, onComplete})` — 3-step onboarding: chat → hatch → brain

**`client/src/components/PathSelectionModal.tsx`:**
- `PathSelectionModal({isOpen, onClose, onStartWithIdea, onUseStarterPack, onFigureItOut})` — 3-path choice: idea (Maya help), starter pack (templates), figure it out (custom)

### Chat Visualization Components (detailed)

**`client/src/components/chat/HandoffCard.tsx`:**
- `HandoffCard({fromAgentName, fromAgentRole?, toAgentName, toAgentRole?, taskTitle, timestamp})` — From-agent avatar → arrow → To-agent avatar + task title + relative time

**`client/src/components/chat/DeliberationCard.tsx`:**
- `DeliberationCard({agentNames[], roundCount, status: 'ongoing' | 'resolved', summary?, onDismiss?})` — Multi-agent coordination indicator with expandable summary

### AI Modules (detailed additions)

**`server/ai/promptTemplate.ts`:**
- `interface UserProfile` — `{likelyRole?, tone?, preferredPace?, messageLength?, emotionalState?}`
- `interface PromptBuilderProps` — 29 fields: agentName, roleTitle, personality, expertise, context, user profile, emotional state
- `buildSystemPrompt(props): string` — Multi-section dynamic prompt: personality → expertise → context → user profile → emotional calibration

**`server/ai/forecast.ts`:**
- `isStrategicTurn(userMessage): boolean` — Detects strategic questions (approval gate, rollback, cross-functional, risk)
- `buildDecisionForecast({userMessage, safetyScore, projectName?}): DecisionForecast[]` — 3 scenarios: fast-track (probability based on low risk), balanced, quality-first. Each with lead indicators + mitigation

**`server/ai/returnBriefing.ts`:**
- `generateReturnBriefing({projectId, userId, lastBriefedAt, storage, broadcastToConversation, generateText}): Promise<BriefingResult>` — Summarizes autonomy work (completed tasks, handoffs, approvals) since last user session. Filters events, resolves agent names, LLM-generates with fallback template. Returns `{hasBriefing, messageId?}`

### Confirmed Non-Existent Files

- **`server/ai/graph.ts`** — Referenced in CLAUDE.md but DELETED. LangGraph routing distributed across conductor.ts and other modules
- **`client/src/devtools/autonomyDashboard/`** — Referenced in CLAUDE.md but does NOT exist. Debug UI not yet built

---

## SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| Frontend files | 156 |
| Backend files | ~130 |
| Total TypeScript files | ~286 |
| Frontend components | 80+ |
| Backend functions | 230+ |
| REST endpoints | 40+ |
| WebSocket event types | 30+ |
| Database tables | 14 |
| Test scripts | 60+ |
| CSS custom properties | 40+ |
| CSS keyframe animations | 11 |
| Regex patterns | 40+ |
| Role definitions | 30 |
| Intelligence profiles | 30 |
| AI-ism patterns removed | 14 |
| Safety risk categories | 5 (absolute claims, evasion, scope, injection, execution) |
| Peer review lens categories | 7 (engineering, design, data, strategy, marketing, QA, ops) |

## Completeness Verification

**Verified 2026-03-26**: All 30 potentially missing files checked. 15 modules added (Part 11). 2 files confirmed non-existent (graph.ts deleted, devtools/autonomyDashboard not built). Inventory now covers every existing TypeScript module in the codebase.

---

*Last updated: 2026-03-26 | Verified complete across 286 TypeScript files*
