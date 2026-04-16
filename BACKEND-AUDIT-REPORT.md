# Backend Code Review Audit Report

**Date:** 2026-04-03
**Auditor:** Claude Code (Opus 4.6)
**Scope:** All backend code in `/server`, `/shared`, and security-relevant `/client/src` files

---

## Summary

- **Total files reviewed:** 42
- **Critical issues (P0):** 3
- **Major issues (P1):** 7
- **Minor issues (P2):** 9
- **Observations (P3):** 8

---

## P0 -- Critical (fix before launch)

### 1. Dev training endpoints bypass production guard via `DEV=true` env var

- **File:** `server/routes.ts:78-83`
- **Issue:** The `/api/dev/*` block guard checks `if (isProd && process.env.DEV !== 'true')`. Setting `DEV=true` in a production environment re-enables all dev training endpoints (`/api/dev/training/personality`, `/api/dev/training/example`, `/api/dev/training/stats`), allowing any authenticated user to mutate agent training data in production.
- **Risk:** An attacker who discovers the env var trick or a misconfigured deployment could inject arbitrary training data, poisoning agent behavior for all users.
- **Fix:** Remove the `DEV !== 'true'` escape hatch entirely. Dev endpoints should never be reachable in production regardless of env vars. Consider removing them from the production build entirely or gating behind an admin role.

### 2. Raw SQL in `webhookHandler.ts` -- user lookup outside ORM

- **File:** `server/billing/webhookHandler.ts:141-145`
- **Issue:** `findUserByCustomerId` uses a raw `dbPool.query()` to look up users by `stripe_customer_id`. While the query is parameterized (safe from injection), it bypasses the Drizzle ORM and `IStorage` abstraction entirely. More critically, this function is called from webhook handlers that receive Stripe customer IDs -- if the `stripe_customer_id` column doesn't exist or has a different name, the query silently fails with no user found, allowing subscription state to drift.
- **Risk:** Billing state corruption if schema diverges. The raw query also can't be tested via `MemStorage`, meaning this code path has no coverage in memory-mode tests.
- **Fix:** Add `getUserByCustomerId(customerId: string)` to the `IStorage` interface and implement it with Drizzle ORM in `DatabaseStorage`.

### 3. Autonomy dashboard accessible in production

- **File:** `client/src/App.tsx:105-108`
- **Issue:** The route `/dev/autonomy` rendering `AutonomyDashboard` is protected only by `AuthGuard` (login required), not by any admin/dev role check. Any logged-in user can access the autonomy debug dashboard in production, exposing internal system state, event logs, and potentially other users' autonomy traces if the dashboard doesn't filter by user.
- **Risk:** Information disclosure of internal system behavior. Could reveal agent routing logic, risk scores, and deliberation traces to regular users.
- **Fix:** Gate the route behind `NODE_ENV !== 'production'` or an admin role check. Alternatively, strip the route from the production build via Vite env-based conditional.

---

## P1 -- Major

### 4. `getProjects()` fetches ALL projects for ownership checks

- **Files:** `server/routes/teams.ts:21-23`, `server/routes/tasks.ts:40-42`, `server/routes/agents.ts:25-27`, `server/routes/messages.ts:18-20`, `server/routes/autonomy.ts:58-60`
- **Issue:** The `getOwnedProjectIds()` helper calls `storage.getProjects()` which fetches every project from the database, then filters in JS. This is called on nearly every authenticated request in these route modules.
- **Risk:** Performance degradation at scale. With 10,000 users and 50,000 projects, every team/agent/task/message API call scans the full projects table. This is an O(N) query where O(1) is possible.
- **Fix:** Use `storage.getProjectsByUserId(userId)` which already exists and is indexed. The `projects.ts` route file already does this correctly -- the other modules should follow suit.

### 5. `storage.ts` has ~30 raw SQL queries bypassing Drizzle ORM

- **Files:** `server/storage.ts:1959-2019`, `server/autonomy/events/eventLogger.ts:129,205,305`, `server/autonomy/traces/traceStore.ts:73,125,160,195-215`
- **Issue:** The codebase standard says "never raw SQL in application code" but there are approximately 30 raw `pool.query()` calls in storage.ts, eventLogger.ts, and traceStore.ts. While all are parameterized (no SQL injection risk), they:
  1. Cannot be tested with `MemStorage`
  2. Bypass Drizzle's type safety
  3. Are fragile to schema changes
- **Risk:** Schema changes could silently break these queries without TypeScript catching them. Integration testing gaps.
- **Fix:** Migrate the most critical ones (autonomy event counting, project timestamps, webhook processed checks) to Drizzle ORM queries. Lower-priority ones can be tracked in a backlog.

### 6. Rate limit counter in `tierGate.ts` uses in-memory Map, leaks on multi-instance

- **File:** `server/middleware/tierGate.ts:33,98-116`
- **Issue:** The per-minute rate limiter uses an in-memory `Map<string, { count, windowStart }>`. This means:
  1. If the server crashes or restarts, all rate limit state is lost
  2. If scaled to multiple instances, each instance tracks independently -- a user could send 15 msgs/min to each of N instances for 15*N effective rate
  3. The cleanup only triggers when `minuteTracker.size > 1000`, and only clears entries older than 2 minutes. Under sustained load with many unique users, the map grows unbounded until the 1000-entry threshold.
- **Risk:** Rate limiting is ineffective at multi-node scale. Memory leak risk under heavy load.
- **Fix:** For now this is acceptable for single-node MVP. Document that this must move to Redis when scaling horizontally. Consider a time-windowed approach (sliding window) for cleaner memory management.

### 7. `chat.ts` is 3,257 lines -- a god file

- **File:** `server/routes/chat.ts`
- **Issue:** Despite the routes.ts split, `chat.ts` is 3,257 lines handling WebSocket lifecycle, streaming, message processing, brain updates, autonomy triggers, task detection, deliverable detection, and return briefings. This makes it extremely difficult to review for security issues, debug, or modify safely.
- **Risk:** Hidden bugs due to complexity. Difficult to reason about error handling paths. Nested async callbacks make resource cleanup (streaming connections, abort signals) error-prone.
- **Fix:** Extract into focused modules: `wsConnectionManager.ts`, `streamingHandler.ts`, `brainUpdateHandler.ts`, `messageProcessor.ts`. Each should be <500 lines.

### 8. WebSocket `send_message_streaming` does not verify conversation ownership for every message

- **File:** `server/routes/chat.ts:666-700`
- **Issue:** While `join_conversation` verifies ownership (line 536), the `send_message_streaming` handler only validates the message envelope format, not that the user still owns the conversation. A client could join a conversation they own, then after the project is transferred/deleted, continue sending messages to it because ownership is only checked at join time.
- **Risk:** Low in current single-user model, but becomes a real authorization bypass if multi-user collaboration is added.
- **Fix:** Re-validate conversation ownership on each `send_message_streaming` event, or track authorized conversations per socket and invalidate on ownership changes.

### 9. `detectUserPermission` in `actionParser.ts` has overly broad matching

- **File:** `server/ai/actionParser.ts:102-120`
- **Issue:** The `PERMISSION_GRANTED_PHRASES` list includes very common words like "add", "create", "great", "ok". The matching logic uses `msg.includes(phrase)` which means a message like "I don't think we should add that" would match "add" and return `'granted'`. While denial phrases are checked first, the denial list doesn't cover all negation patterns.
- **Risk:** Agents could auto-create teams/tasks when the user didn't intend to grant permission, if the agent's prior message asked for confirmation.
- **Fix:** Require word-boundary matching (`\badd\b`) and consider requiring the grant phrase to appear near the start of the message or as a standalone sentence.

### 10. No CSRF protection on state-changing API routes

- **Files:** All POST/PUT/PATCH/DELETE routes in `server/routes/`
- **Issue:** The application relies on session cookies (`sameSite: 'lax'`) for authentication but has no CSRF token validation. While `sameSite: 'lax'` protects against simple cross-site POST attacks, it does not protect against all scenarios (e.g., top-level navigations with forms, or if the `sameSite` attribute is not honored by all browsers).
- **Risk:** Medium. A crafted page could potentially trigger state-changing actions (create project, delete team, approve task) on behalf of a logged-in user.
- **Fix:** Add a CSRF token to the session and validate it on all mutation requests, or switch to `sameSite: 'strict'` (may break OAuth callback flow).

---

## P2 -- Minor

### 11. `getOwnedProjectIds` helper is duplicated across 5+ route modules

- **Files:** `server/routes/teams.ts:21-23`, `agents.ts:25-27`, `messages.ts:18-20`, `tasks.ts:40-42`, `autonomy.ts:58-60`
- **Issue:** Identical `getOwnedProjectIds`, `getOwnedProject`, and `conversationOwnedByUser` helper functions are copy-pasted across every route module.
- **Fix:** Extract to a shared `server/utils/ownershipHelpers.ts` module.

### 12. Safety score has no unit test for risk score accumulation overflow

- **File:** `server/ai/safety.ts:92-128`
- **Issue:** Multiple risk boosts are additive (e.g., `hallucinationRisk += 0.12` for each absolute claim). A message containing 5 absolute claims would get `0.15 + 5*0.12 = 0.75` before clamping. While clamping to 1.0 (line 156-158) prevents overflow, the behavior of accumulating many small boosts is not tested.
- **Fix:** Add unit tests for compound risk scenarios to verify the intended threshold behavior.

### 13. `personalityEvolution.ts` singleton leaks memory over time

- **File:** `server/ai/personalityEvolution.ts:38`
- **Issue:** The `personalityProfiles` Map grows with every unique agent-user pair and is never evicted. The `learningHistory` array per profile is capped at 50 entries (line 427), but profiles themselves are never removed.
- **Risk:** On a server running for weeks with many users, this map grows unbounded.
- **Fix:** Add LRU eviction or TTL-based cleanup. Profiles are seeded from DB on cache miss, so eviction is safe.

### 14. `actionParser.ts` only parses the FIRST action block

- **File:** `server/ai/actionParser.ts:54-67`
- **Issue:** `parseAction()` returns on the first match. If an LLM response contains both a `TASK_SUGGESTION` and a `BRAIN_UPDATE`, only the first one found is processed.
- **Fix:** Consider returning an array of all parsed actions, or document this as intentional single-action-per-response design.

### 15. Webhook handler casts Stripe types due to SDK version mismatch

- **File:** `server/billing/webhookHandler.ts:88-89`
- **Issue:** `(subscription as any).current_period_end` indicates the Stripe SDK types don't match the expected API response shape. This `as any` cast will silently pass `undefined` if the field name changes in a Stripe API version bump.
- **Fix:** Pin the Stripe API version in the client configuration and add a null check with logging.

### 16. Cost table in `usageTracker.ts` may become stale

- **File:** `server/billing/usageTracker.ts:6-10`
- **Issue:** The `COST_TABLE` hardcodes per-model pricing. When Google/OpenAI change pricing (which happens regularly), this table silently becomes inaccurate.
- **Fix:** Add a comment with last-verified date and set a calendar reminder to check quarterly. Consider making it configurable via env vars for rapid updates.

### 17. `getTeams()` and `getAgents()` in route modules fetch ALL records

- **Files:** `server/routes/teams.ts:40-44`, `server/routes/agents.ts:49-56`
- **Issue:** The `GET /api/teams` and `GET /api/agents` endpoints call `storage.getTeams()` / `storage.getAgents()` which fetch ALL teams/agents globally, then filter by ownership in JS. Same N+1 concern as P1-4.
- **Fix:** Add `getTeamsByUserId()` and `getAgentsByUserId()` to storage, or always require a projectId query parameter.

### 18. Gemini provider swallows stream errors silently

- **File:** `server/llm/providers/geminiProvider.ts:148-150`
- **Issue:** The streaming generator catches errors but only logs them without re-throwing. If a Gemini stream fails mid-response, the generator silently completes with partial content.
- **Risk:** Users see truncated responses with no error indicator.
- **Fix:** Re-throw the error after logging, or yield a special error token that the streaming handler can detect.

### 19. Usage tracker cache doesn't handle server restarts correctly

- **File:** `server/billing/usageTracker.ts:25,44-49`
- **Issue:** The `dailyMessageCache` is in-memory. On first request after server restart, the cache is empty, so `getDailyMessageCount` reads from DB. But `recordUsage` initializes the cache to `count: 1` on first call, even though the DB may already have a higher count. Subsequent reads from cache will undercount until the next cache miss.
- **Risk:** Free-tier users could exceed their daily cap slightly after a server restart.
- **Fix:** In `recordUsage`, read the current DB count before incrementing if the cache key doesn't exist, or always read-through on cache miss for writes too.

---

## P3 -- Observations / Nice-to-have

### 20. OAuth state/nonce stored in session, not DB

- **File:** `server/auth/googleOAuth.ts`
- **Observation:** OAuth state, nonce, and code verifier are stored in the express session. This is standard and works, but if session storage has issues, the OAuth callback will fail silently. The implementation is clean and follows OIDC best practices (PKCE, state, nonce validation, issuer validation, audience check, expiry check, email verification check).

### 21. `conductorDecision` returns `inferredPrimary` over `findBestAgentMatch` result

- **File:** `server/ai/conductor.ts:91-93`
- **Observation:** `inferRoleFromMessage` (keyword regex) takes priority over `findBestAgentMatch` (expertise scoring). This means simple keyword matching overrides the more sophisticated expertise scoring. This may be intentional for reliability but could cause unexpected routing when keywords are ambiguous.

### 22. Trust scoring formula could be gamed

- **File:** `server/autonomy/trustScoring/trustScorer.ts:35-48`
- **Observation:** An agent gains trust purely from task completion count. Since the system auto-creates and auto-completes low-risk tasks, an agent could quickly build trust and unlock higher autonomy thresholds through many trivial completions. Consider weighting by task risk level.

### 23. `handoffOrchestrator.ts` only processes first dependent task

- **File:** `server/autonomy/handoff/handoffOrchestrator.ts:43-44`
- **Observation:** `dependentTasks[0]` is selected, ignoring other dependent tasks. If a completed task has multiple dependents, only one gets queued. This is likely intentional (serial execution) but could leave tasks stranded if the chain design assumes parallel handoffs.

### 24. No timeout on batch timer cleanup in `taskExecutionPipeline.ts`

- **File:** `server/autonomy/execution/taskExecutionPipeline.ts:113-131`
- **Observation:** The `pendingBatches` Map holds timers and resolvers. If a batch timer fires but the execution fails, resolvers are called with `{ status: 'failed' }`. However, if the process is interrupted between timer creation and timer firing, the Promise resolvers leak. This is mostly academic for a single-node setup.

### 25. `responsePostProcessing` adds random closing questions

- **File:** `server/ai/responsePostProcessing.ts:186-211`
- **Observation:** The closing question is randomly selected, which means identical inputs can produce different outputs. This makes testing non-deterministic. Consider seeding the random selection in test mode.

### 26. `mentionParser.ts` Step 1.5 iterates all agents for name matching

- **File:** `server/ai/mentionParser.ts:96-115`
- **Observation:** For every message, 5 regex patterns are compiled and tested per agent. With 30 agents, that's 150 regex compilations per message. Consider pre-compiling the patterns once or caching them.

### 27. LLM prompt in `openaiService.ts` is very large

- **File:** `server/ai/openaiService.ts:332-358`
- **Observation:** The system prompt concatenates 15+ sections (character voice, role expertise, emotional resonance, practitioner skills, project context, project memory, open threads, user designation, handoff, first message, conviction, reasoning hint, assigned tasks, Maya instructions, task intelligence). This could easily exceed 4000 tokens, eating into the response budget. The skills section is only injected for the first 3 turns (good optimization).

### 28. `policies.ts` thresholds are all configurable via env vars

- **File:** `server/autonomy/config/policies.ts:24-29`
- **Observation:** All safety thresholds (peer review trigger, clarification risk, etc.) are configurable via environment variables. While flexible, this means a misconfigured env var could disable safety gates entirely (e.g., `PEER_REVIEW_TRIGGER=1.0` would effectively disable peer review). Consider adding validation bounds.

---

## Security Checklist

- [x] Every route has auth guard (global middleware at `routes.ts:69-74` + per-route ownership checks)
- [x] All inputs Zod-validated (projects, teams, agents, tasks, messages, billing, deliverables all use Zod)
- [x] No SQL injection risk (all raw SQL uses parameterized queries)
- [ ] **No secrets logged** -- MOSTLY CLEAN. One `console.warn` mentions OPENAI_API_KEY by name in a warning message (not the value). No actual secrets logged.
- [ ] **devTrainingTools disabled in prod** -- PARTIALLY. Blocked by `/api/dev/*` guard BUT bypassed with `DEV=true` env var (P0-1)
- [ ] **autonomyDashboard hidden in prod** -- NO. Accessible to any logged-in user (P0-3)
- [x] Session cookies are httpOnly, secure (prod), sameSite: lax
- [x] Helmet middleware adds security headers
- [x] Rate limiting on global + AI endpoints
- [x] Google OAuth uses PKCE
- [x] Session regeneration on login (prevents session fixation)
- [x] Ownership verified before mutations (read and write)
- [x] User ID always from session, never from client body
- [x] `STORAGE_MODE=db` assertion in production
- [x] Stripe webhook signature verification
- [x] Stripe webhook idempotency (duplicate event check)
- [ ] **CSRF protection** -- NOT PRESENT (P1-10)
- [x] Dev login endpoint blocked in production
- [x] Body size limit set (2MB)
- [x] File upload restricted to allowed extensions, 10MB limit

---

## Architecture Notes

**Well-designed patterns observed:**
- Clean OAuth implementation with full OIDC compliance
- Proper streaming lifecycle management with abort signals
- Safety scoring with multiple risk dimensions and trust-adjusted thresholds
- Role-aware risk multipliers for autonomy
- Idempotency keys on WebSocket messages
- Conversation ID canonicalization preventing format drift
- Fire-and-forget patterns for non-critical operations (memory extraction, usage tracking)
- Graceful Stripe degradation (billing routes work without Stripe keys)

**Debt to address before scaling:**
1. Extract common ownership helpers from route modules
2. Replace `getProjects()` calls with `getProjectsByUserId()`
3. Migrate raw SQL to Drizzle ORM
4. Split `chat.ts` into focused modules
5. Move rate limiting to Redis for multi-node support
6. Add CSRF tokens
7. Lock down dev/autonomy dashboard in production
