# Unified Milestone: LLM Intelligence + Billing + Monetization

## Context

**Three inputs merged into one milestone:**
1. **Paperclip** (competitor) — conversation compaction, structured agent memory, tool-use architecture
2. **Ruflo** (competitor) — tiered model routing, reasoning cache, prompt optimization (ideas valid, their code is stubs)
3. **BILLING-PLAN.md** (our existing plan) — Stripe billing, Free/Pro tiers, usage capping, frontend UI

**Why merge:** Token tracking, model routing, and cost budgets appear in both plans. Building them separately creates duplicate work. The billing system *needs* token tracking; the cost optimization *needs* tier awareness. Ship as one coherent milestone.

**Current state:** No token tracking, no billing, no tiers, no caching. Gemini Flash for everything. Groq provider exists but unused (FREE). ~$0.002/message cost.

**Target:** Free/Pro tiers with Stripe, 35-50% LLM cost reduction, usage visibility.

**Migration decision:** Existing users get **15-day Pro grace period** on launch, then auto-downgrade to Free. Gives them time to upgrade or adjust.

---

## Phase 0: Pre-Flight — Groq Quality Eval (Before anything ships)

### 0.1 Groq vs Gemini Comparison Eval

**New script:** `scripts/eval-groq-quality.ts`

Run 50 task extraction prompts through both Groq (`llama-3.3-70b-versatile`) and Gemini Flash. Compare:
- JSON parse success rate
- Task field completeness (title, assignee, priority present)
- Semantic accuracy (manual spot-check on 10 samples)

**Pass criteria:** Groq must achieve ≥90% of Gemini's quality on structured extraction. If it fails, skip Groq routing for chat (keep for task extraction only where structured output is simpler).

---

## Phase 1: Foundation — Token Tracking + Schema (Week 1)

### 1.1 Database Schema for Billing + Usage

**File:** `shared/schema.ts`

**Extend `conversationMemory.memoryType`** union to include `"compaction_summary"`:
```
Current: "context" | "summary" | "key_points" | "decisions"
New:     "context" | "summary" | "key_points" | "decisions" | "compaction_summary"
```

Add to `users` table:
```
tier: text('tier').notNull().default('free')              -- 'free' | 'pro'
stripeCustomerId: text('stripe_customer_id')               -- nullable
stripeSubscriptionId: text('stripe_subscription_id')       -- nullable
subscriptionStatus: text('subscription_status').notNull().default('none')
subscriptionPeriodEnd: timestamp('subscription_period_end')
graceExpiresAt: timestamp('grace_expires_at')              -- nullable, for 15-day migration grace
```

New `usage_daily_summary` table:
```
userId, date, totalMessages, totalPromptTokens, totalCompletionTokens,
totalTokens, estimatedCostCents, standardModelMessages, premiumModelMessages,
autonomyExecutions — UNIQUE(userId, date)
```

**File:** `server/storage.ts` — add IStorage methods:
- `upsertDailyUsage(userId, date, increments)` — atomic increment
- `getDailyUsage(userId, date)` — for limit checks
- `getMonthlyUsage(userId, yearMonth)` — for dashboard
- `updateUserTier(userId, tier, stripeData?)` — tier + Stripe IDs
- `getUserTier(userId)` — returns tier + status

Run `npm run db:push`.

### 1.2 Token Usage Extraction from LLM Providers

**File:** `server/llm/providerTypes.ts`
```typescript
interface TokenUsage { promptTokens: number; completionTokens: number; totalTokens: number }
// Add tokenUsage?: TokenUsage to LLMResponseMetadata
// Add modelTier?: 'standard' | 'premium' to LLMRequest
```

**Files:**
- `server/llm/providers/geminiProvider.ts` — extract `result.response.usageMetadata`
- `server/llm/providers/openaiProvider.ts` — extract `completion.usage`
- `server/llm/providers/groqProvider.ts` — same as OpenAI

### 1.3 Usage Tracker Service

**New file:** `server/billing/usageTracker.ts`

- `recordUsage(userId, provider, model, modelTier, tokenUsage, source)` — fire-and-forget DB upsert
- `getDailyMessageCount(userId)` — in-memory cache + DB fallback, resets midnight UTC
- `getDailyAutonomyCount(userId)` — same pattern
- Cost calculation via pricing lookup table per provider/model

**Wire into:**
- `server/routes/chat.ts` — after `streaming_completed`, call `recordUsage`
- `server/autonomy/execution/taskExecutionPipeline.ts` — after LLM call

---

## Phase 2: Smart LLM Routing (Week 2)

### 2.1 Model Tier Routing (Flash vs Pro)

**File:** `server/llm/providerResolver.ts`

Add `resolveModelForTier(baseCfg, tier)`:
- `standard` → Gemini 2.5 Flash (current default)
- `premium` → Gemini 2.5 Pro (for autonomy/peer review — Pro users only)

**Wire `modelTier: 'premium'` into:**
- `server/autonomy/execution/taskExecutionPipeline.ts` — background task execution
- `server/autonomy/peerReview/peerReviewRunner.ts` — peer review calls
- `server/ai/openaiService.ts` — deliberation synthesis

Normal chat stays `standard`.

**New env:** `GEMINI_PRO_MODEL=gemini-2.5-pro`

### 2.2 Route Task Extraction to Groq (FREE)

**File:** `server/llm/providerResolver.ts` — add `generateWithPreferredProvider(request, preferredProviderId)`

**Files:**
- `server/ai/taskExtractor.ts` — use Groq instead of default chain
- `server/ai/tasks/organicExtractor.ts` — same

Groq free tier: 30 RPM, 14,400 RPD — fine for task extraction. Silent fallback to Gemini on failure.

**Required env:** `GROQ_API_KEY` — free at console.groq.com. Add to `.env.example`.

**Savings:** ~10-15% of total Gemini spend eliminated (free).

### 2.3 Message Complexity Classifier

**New file:** `server/ai/taskComplexityClassifier.ts`

Heuristic (no LLM call):
- `simple` → Groq: message < 30 chars, greetings, acks, yes/no
- `standard` → Gemini Flash: default
- `complex` → Gemini Flash + higher maxTokens: multi-part, technical, analysis

Err toward `standard` (conservative). Safety gates run post-response regardless.

### 2.4 Adaptive maxTokens

**File:** `server/ai/openaiService.ts`

Replace hardcoded 500 with complexity-based:
- Simple → 200, Question → 300, Standard → 400, Complex → 500, First message → 350

### 2.5 System Prompt Reduction

**File:** `server/ai/openaiService.ts`

1. Merge `PROFESSIONAL DEPTH` + `DOMAIN INTELLIGENCE` → single `ROLE EXPERTISE` section
2. `PRACTITIONER SKILLS` only for first 3 messages (then drop — LLM has internalized)
3. Trim `CONVICTION` from 3 sentences to 1
4. Trim `HATCH BRAIN UPDATE INTELLIGENCE` from 8 lines to 4
5. Trim `MAYA TEAM INTELLIGENCE` from 15 lines to 8

**Savings:** ~500-800 tokens/call (~15-20% of system prompt)

---

## Phase 3: Tier Gating + Feature Gates (Week 3)

### 3.1 Tier Gate Middleware

**New file:** `server/middleware/tierGate.ts`

- `requirePro(req, res, next)` — 403 + `{ error, code: 'PRO_REQUIRED', upgradeUrl }` for free users
- `checkMessageLimit(req, res, next)` — 25/day free, 500/day pro
- `checkProjectLimit(req, res, next)` — 2 free, unlimited pro

### 3.2 Populate Tier in Session

**File:** `server/index.ts` (line ~170) — add `userTier?: string` to `SessionData` interface:
```typescript
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    userTier?: string;  // ADD THIS
    // ... existing fields
  }
}
```

**File:** `server/routes.ts` (line ~170, OAuth callback) — after `upsertOAuthUser()`:
```typescript
req.session.userTier = user.tier || 'free';
```

Update `GET /api/auth/me` to return `tier`, `subscriptionStatus`, `dailyMessagesUsed`, `dailyMessageLimit`.

### 3.3 Apply Gates

| Route | Gate | File |
|-------|------|------|
| WS `send_message_streaming` | `checkMessageLimit` | `server/routes/chat.ts` |
| `POST /api/projects` | `checkProjectLimit` | `server/routes/projects.ts` |
| Autonomy triggers | `requirePro` | `server/routes/autonomy.ts` |
| Background execution | `requirePro` | `taskExecutionPipeline.ts` |

### 3.4 Autonomy Budgets Per Tier

**File:** `server/autonomy/config/policies.ts`
```typescript
getTierBudgets(tier): { maxBackgroundLlmCallsPerProjectPerDay: tier === 'pro' ? 50 : 0 }
```

### 3.5 WebSocket Events for Usage

**File:** `shared/dto/wsSchemas.ts` — add Zod schemas for new events (30+ events exist already):
```typescript
// Add alongside existing event schemas:
z.object({ type: z.literal('upgrade_required'), reason: z.string(), currentUsage: z.number(), limit: z.number(), upgradeUrl: z.string() })
z.object({ type: z.literal('usage_warning'), reason: z.literal('approaching_limit'), currentUsage: z.number(), limit: z.number(), percentUsed: z.number() })
```

### 3.6 Kill Switch

**Env var:** `FEATURE_BILLING_GATES=true` (default `true` in prod, `false` in dev)

When `false`, all tier gates (`requirePro`, `checkMessageLimit`, `checkProjectLimit`) pass through — every user treated as Pro. Critical safety valve if a gating bug blocks chat at launch.

**File:** `server/middleware/tierGate.ts` — check `process.env.FEATURE_BILLING_GATES !== 'false'` at top of each gate function

### 3.7 Existing User Migration

**One-time migration script:** `scripts/migrate-existing-users-grace.ts`

- Sets `graceExpiresAt = NOW() + 15 days` for all existing users
- Sets `tier = 'pro'` temporarily
- `tierGate.ts` checks: if `tier === 'pro'` AND `subscriptionStatus === 'none'` AND `graceExpiresAt < NOW()`, auto-downgrade to `free`
- Grace period banner in frontend: "Your Pro trial ends in X days"

---

## Phase 4: Stripe Integration (Week 4)

### 4.1 Stripe Backend

**New files:**
- `server/billing/stripeClient.ts` — `new Stripe(process.env.STRIPE_SECRET_KEY)`
- `server/billing/checkoutService.ts` — `createCheckoutSession()`, `createPortalSession()`
- `server/billing/webhookHandler.ts` — handle webhook events

### 4.2 Billing Routes

**New file:** `server/routes/billing.ts`
```
POST /api/billing/checkout     → Stripe Checkout Session URL
POST /api/billing/portal       → Customer Portal URL
GET  /api/billing/status       → subscription + usage summary
POST /api/billing/webhook      → Stripe webhook (no auth, raw body, sig verified)
```

### 4.3 Wire into Server

**File:** `server/routes.ts` — register billing routes, add webhook to auth exemption

**File:** `server/index.ts` — CRITICAL: raw body parser must go BEFORE `express.json()` (currently at line 181). Insert at ~line 180:
```typescript
// Stripe webhook needs raw body for signature verification — must be before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }));
// Then the existing json parser:
app.use(express.json({ limit: '2mb' }));
```
If raw body parser is after `express.json()`, Stripe signature verification will fail silently.

### 4.4 Webhook Handlers (with idempotency)

**Idempotency:** Store `stripe_event_id` in a `processed_webhooks` table (or check `autonomy_events`). Before processing any webhook, check if event ID was already handled. Stripe can resend webhooks multiple times.

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `tier: 'pro'`, `subscriptionStatus: 'active'`, clear `graceExpiresAt` |
| `customer.subscription.updated` | Sync status |
| `customer.subscription.deleted` | Set `tier: 'free'`, `subscriptionStatus: 'cancelled'` |
| `invoice.payment_failed` | `subscriptionStatus: 'past_due'`, 7-day grace |

**New envs:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`

### 4.5 Stripe Test Mode

Add to `.env.example`:
```
# Use sk_test_... keys for development. Never use sk_live_... locally.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

Dev workflow: Use Stripe CLI (`stripe listen --forward-to localhost:5001/api/billing/webhook`) to test webhooks locally.

---

## Phase 5: Frontend — Billing UI (Week 5)

### 5.1 Auth Hook Update
**File:** `client/src/hooks/useAuth.ts` — add `tier`, `subscriptionStatus`, `dailyMessagesUsed`, `dailyMessageLimit` to User type

### 5.2 UpgradeModal
**New file:** `client/src/components/UpgradeModal.tsx`
- Triggered by `upgrade_required` WS event, autonomy attempt on free tier, 3rd project attempt
- Shows tier comparison + pricing + "Upgrade" button → `POST /api/billing/checkout` → Stripe redirect

### 5.3 UsageBar
**New file:** `client/src/components/UsageBar.tsx`
- "12/25 messages today" progress bar in CenterPanel header or LeftSidebar

### 5.4 Pricing Section on Landing Page
**File:** `client/src/pages/LandingPage.tsx` — two-card Free vs Pro comparison

### 5.5 Account/Billing Page
**New file:** `client/src/pages/AccountPage.tsx`
**Route:** `/account` in `App.tsx`
- Current plan, monthly usage chart (Recharts), "Manage Subscription" → Stripe Portal

### 5.6 WS Upgrade Event Handler
**File:** `client/src/hooks/useRealTimeUpdates.ts` — handle `upgrade_required` → show UpgradeModal

---

## Phase 6: Deep Cost Optimization (Week 6-7) — Competitor Learnings

### 6.1 Conversation Compaction (from Paperclip)

**New file:** `server/ai/conversationCompactor.ts`

- Every 8 messages, summarize messages 1-6 → 3-4 sentence summary via Groq (free)
- Store in `conversation_memory` table (type: `'compaction_summary'`)
- Context becomes: `[summary] + [last 4 verbatim messages]`
- Feature-flagged: `FEATURE_CONVERSATION_COMPACTION=false` default

**Files:** `server/routes/chat.ts`, `server/ai/openaiService.ts`, `server/storage.ts`

### 6.2 Reasoning Pattern Cache (from Ruflo, done properly)

**New file:** `server/ai/reasoningCache.ts`

- After high-confidence responses, cache reasoning pattern `{ role, category, structure }`
- On similar questions, inject hint into system prompt (not a response cache)
- 3-5% savings + quality consistency

### 6.3 Batch Background Tasks (from Ruflo concept)

**Files:** `taskExecutionPipeline.ts`, background runner

- Group 2-3 same-agent tasks → 1 LLM call with multi-task structured output
- System prompt amortized across tasks, max batch: 3

---

## Pricing Summary

### Tier Structure
| | Free ("Hatcher") | Pro ($19/mo or $190/yr) |
|---|---|---|
| Messages/day | 25 | 500 |
| Projects | 2 | Unlimited |
| Agents | All 30 | All 30 |
| Model | Flash only | Flash + Pro (autonomy) |
| Autonomy | Disabled | Full (50 exec/day) |

### Unit Economics
- Pro user LLM cost: ~$5-12/mo → $19 subscription = 35-75% margin
- Cost optimization target: 35-50% reduction via routing + compaction + Groq

---

## Savings Breakdown (Cost Optimization Only)

| Optimization | Savings | Phase |
|-------------|---------|-------|
| Task extraction → Groq (free) | 10-15% | 2 |
| System prompt reduction | 5-8% | 2 |
| Complexity-tiered routing | 10-15% | 2 |
| Adaptive maxTokens | 3-5% | 2 |
| Conversation compaction | 8-12% | 6 |
| Reasoning cache | 3-5% | 6 |
| Batch background tasks | 3-5% of bg | 6 |
| **Compound total** | **35-50%** | |

---

## Dependencies

```
Phase 1 (schema + tracking) ← required by → Phase 2 (routing), Phase 3 (gating)
Phase 2 (model routing) ← required by → Phase 3 (tier-aware routing)
Phase 3 (tier gates) ← required by → Phase 4 (Stripe updates tier)
Phase 4 (Stripe) ← required by → Phase 5 (frontend billing UI)
Phase 6 (deep optimization) — independent, can run in parallel with Phases 4-5
```

---

## Critical Files

| File | Changes |
|------|---------|
| `shared/schema.ts` | Billing columns on users + usage_daily_summary table |
| `server/storage.ts` | Usage + tier IStorage methods |
| `server/llm/providerTypes.ts` | TokenUsage, modelTier types |
| `server/llm/providers/geminiProvider.ts` | Extract usageMetadata |
| `server/llm/providerResolver.ts` | resolveModelForTier(), generateWithPreferredProvider() |
| `server/ai/openaiService.ts` | Prompt reduction, adaptive maxTokens, compaction support |
| `server/autonomy/config/policies.ts` | getTierBudgets() |
| `server/routes/chat.ts` | Message limit check, usage recording |
| `server/routes.ts` | Billing routes, tier in session |
| `server/index.ts` | Raw body parser for Stripe webhook |
| **NEW** `server/billing/usageTracker.ts` | Usage recording + aggregation |
| **NEW** `server/billing/stripeClient.ts` | Stripe SDK init |
| **NEW** `server/billing/checkoutService.ts` | Checkout + portal sessions |
| **NEW** `server/billing/webhookHandler.ts` | Stripe event handling |
| **NEW** `server/routes/billing.ts` | Billing API routes |
| **NEW** `server/middleware/tierGate.ts` | Tier enforcement |
| **NEW** `server/ai/taskComplexityClassifier.ts` | Heuristic complexity routing |
| **NEW** `server/ai/conversationCompactor.ts` | Context compaction |
| **NEW** `server/ai/reasoningCache.ts` | Pattern caching |
| **NEW** `client/src/components/UpgradeModal.tsx` | Upgrade prompt UI |
| **NEW** `client/src/components/UsageBar.tsx` | Usage progress bar |
| **NEW** `client/src/pages/AccountPage.tsx` | Account + billing page |

---

## Verification

1. `npm run db:push` succeeds, `npm run typecheck` passes
2. **Groq eval:** `npx tsx scripts/eval-groq-quality.ts` → ≥90% quality match vs Gemini
3. **Token tracking:** send message → check `usage_daily_summary` populates
4. **Model routing:** chat uses Flash, autonomy uses Pro (verify in logs)
5. **Groq routing:** task extraction goes to Groq (check logs for provider name)
6. **80% warning:** send 20th message on free tier → `usage_warning` WS event fires
7. **Free limits:** 26th message → `upgrade_required` WS event → UpgradeModal shows
8. **Project limit:** 3rd project blocked for free user
9. **Autonomy gate:** free user can't trigger background execution
10. **Kill switch:** set `FEATURE_BILLING_GATES=false` → all gates pass through, unlimited access
11. **Grace period:** existing user has Pro access, grace banner shows countdown
12. **Stripe checkout:** "Upgrade" → Stripe → payment → webhook → tier = pro → limits lifted
13. **Stripe cancel:** portal → cancel → webhook → tier = free → limits enforced
14. **Webhook idempotency:** send same webhook twice → second is ignored (no double state change)
15. **Compaction:** conversation with 10+ messages → context size drops 60%+
16. `npm run qa:full` passes, `npm run gate:safety` passes
