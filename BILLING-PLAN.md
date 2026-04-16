# LLM Strategy + Billing + Usage Capping

> **Status**: Planning complete — ready for implementation
> **Date**: 2026-03-23
> **Branch**: reconcile-codex

## Context

Hatchin has no billing, no user tiers, no usage tracking, and no payment integration. Every user gets unlimited access to all features. The LLM cost is ~$0.002/message on Gemini Flash, which is sustainable for beta but not at scale.

**Goal**: Ship a complete monetization system — smart LLM routing (Flash vs Pro), Stripe billing, usage capping for free/paid tiers, and the frontend UI to support it all.

**Decisions made**:
- LLM: Gemini 2.5 Flash (default) + Gemini 2.5 Pro (complex/autonomy tasks for paid users)
- Payment: Stripe (ship now)
- Timeline: Ready to charge real money

---

## Tier & Pricing Strategy

### Free Tier — "Hatcher"
| Limit | Value | Rationale |
|-------|-------|-----------|
| Messages/day | **25** | ~$1.50/mo LLM cost per active user. Enough to experience the product (3-4 conversations) |
| Projects | **2** | Can try one real project + experiment |
| Agents | **All 30 roles** | Don't cripple the core experience — let users fall in love with the team |
| Model | Gemini Flash only | Cheap but good enough for chat |
| Autonomy | **Disabled** | No background execution, handoffs, peer review — this is the conversion lever |

### Pro Tier — "$19/month" (or $190/year = ~$15.80/mo)
| Limit | Value | Rationale |
|-------|-------|-----------|
| Messages/day | **500** | Plenty for power users (~$3-6/mo LLM cost on Flash) |
| Projects | **Unlimited** | Remove friction |
| Agents | All 30 roles | Same as free |
| Model | Flash + **Gemini Pro for autonomy** | Complex tasks (execution, peer review, deliberation) use the 10x better model |
| Autonomy | **Full** | Background execution, handoffs, peer review, auto-tasks |
| Autonomy executions/day | **50** | Up from 5 — generous but bounded |

**Unit economics**: Pro user costs ~$5-12/mo in LLM spend → $19/mo subscription = 35-75% margin.

**Why $19/mo**: Below ChatGPT Plus ($20), above Notion AI ($10). Hatchin is more than a copilot (full multi-agent team) but not a general-purpose AI. $19 feels accessible for individuals.

**Why gate autonomy, not agents**: Agent roles are the hook. Autonomy is the addiction. Free users see agents talk smart; paid users see agents *work*.

---

## Implementation Plan

### Phase 1: Database Schema + Usage Tracking Foundation

**1.1 Add billing columns to `users` table**
**File**: `shared/schema.ts` (line 6-21)

Add to the `users` table:
```
tier: text('tier').notNull().default('free')           -- 'free' | 'pro'
stripeCustomerId: text('stripe_customer_id')            -- nullable, unique
stripeSubscriptionId: text('stripe_subscription_id')    -- nullable
subscriptionStatus: text('subscription_status').notNull().default('none')  -- 'active' | 'past_due' | 'cancelled' | 'none'
subscriptionPeriodEnd: timestamp('subscription_period_end')  -- nullable
```

**1.2 Create `usage_daily_summary` table**
**File**: `shared/schema.ts` (new table)

```
usage_daily_summary:
  id: varchar PK (gen_random_uuid)
  userId: varchar FK -> users.id
  date: text (YYYY-MM-DD)
  totalMessages: integer default 0
  totalPromptTokens: integer default 0
  totalCompletionTokens: integer default 0
  totalTokens: integer default 0
  estimatedCostCents: integer default 0
  standardModelMessages: integer default 0
  premiumModelMessages: integer default 0
  autonomyExecutions: integer default 0

  Unique: (userId, date)
  Index: (userId, date)
```

**1.3 Add IStorage methods**
**File**: `server/storage.ts`

Add to `IStorage` interface + implement in both `MemStorage` and `DatabaseStorage`:
- `upsertDailyUsage(userId, date, increments)` — atomic increment
- `getDailyUsage(userId, date)` — for limit checks
- `getMonthlyUsage(userId, yearMonth)` — for dashboard
- `updateUserTier(userId, tier, stripeData?)` — update tier + Stripe IDs
- `getUserTier(userId)` — returns tier + subscription status

**1.4 Run migration**
```bash
npm run db:push
```

---

### Phase 2: Smart LLM Model Routing

**2.1 Add `modelTier` to LLM request type**
**File**: `server/llm/providerTypes.ts`

```typescript
// Add to LLMRequest:
modelTier?: 'standard' | 'premium';

// Add to LLMResponseMetadata:
tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
```

**2.2 Extract token counts from Gemini responses**
**File**: `server/llm/providers/geminiProvider.ts`

In `generateChat()` (line 80-93): After `chat.sendMessage()`, read `result.response.usageMetadata` and include `tokenUsage` in metadata.

In `streamChat()` (line 112-138): After stream completes, read `result.response` for `usageMetadata`. Return via metadata callback or yield a final metadata event.

**2.3 Route premium tier to Gemini Pro**
**File**: `server/llm/providerResolver.ts`

In `resolveRuntimeConfig()` (line 55): When provider is `gemini` and request has `modelTier: 'premium'`, use `process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro'` instead of Flash.

Add new function:
```typescript
export function resolveModelForTier(baseCfg: RuntimeConfig, tier: 'standard' | 'premium'): string {
  if (tier === 'premium' && baseCfg.provider === 'gemini') {
    return process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';
  }
  return baseCfg.model;
}
```

**2.4 Wire premium model into autonomy pipeline**
Pass `modelTier: 'premium'` in these callers:
- `server/autonomy/execution/taskExecutionPipeline.ts` — task execution LLM calls
- `server/autonomy/peerReview/peerReviewRunner.ts` — peer review LLM calls
- `server/ai/openaiService.ts` — deliberation synthesis calls

Normal chat messages stay `modelTier: 'standard'` (default).

**New env var**: `GEMINI_PRO_MODEL=gemini-2.5-pro`

---

### Phase 3: Usage Tracking Middleware

**3.1 Create usage tracker**
**New file**: `server/billing/usageTracker.ts`

Responsibilities:
- `recordUsage(userId, provider, model, modelTier, tokenUsage, source)` — fire-and-forget DB insert + increment daily summary
- `getDailyMessageCount(userId)` — fast check (in-memory cache backed by DB, resets at midnight UTC)
- `getDailyAutonomyCount(userId)` — same for autonomy executions
- Cost calculation: lookup table mapping model → $/1M input, $/1M output

**3.2 Wire usage recording into chat handler**
**File**: `server/routes/chat.ts`

After streaming completes (where `streaming_completed` event is emitted), call:
```typescript
usageTracker.recordUsage(userId, metadata.provider, metadata.model, 'standard', metadata.tokenUsage, 'chat');
```

**3.3 Wire usage recording into autonomy pipeline**
**File**: `server/autonomy/execution/taskExecutionPipeline.ts`

After each autonomy LLM call, record with `source: 'autonomy'`.

---

### Phase 4: Feature Gating

**4.1 Create tier gate middleware**
**New file**: `server/middleware/tierGate.ts`

Functions:
- `requirePro(req, res, next)` — returns 403 + `{ error, code: 'PRO_REQUIRED', upgradeUrl }` for free users
- `checkMessageLimit(req, res, next)` — checks daily count vs tier limit (25 free, 500 pro)
- `checkProjectLimit(req, res, next)` — checks project count (2 free, unlimited pro)

**4.2 Populate tier in session on login**
**File**: `server/routes.ts` (OAuth callback, ~line 160)

After `upsertOAuthUser()`, read the user's `tier` from DB and store in `req.session.userTier`.

Also update `GET /api/auth/me` to return `tier`, `subscriptionStatus`, `dailyMessagesUsed`, `dailyMessageLimit`.

**4.3 Apply gates to routes**

| Route | Gate | File |
|-------|------|------|
| WebSocket `send_message_streaming` | `checkMessageLimit` | `server/routes/chat.ts` (~line 800) |
| `POST /api/projects` | `checkProjectLimit` | `server/routes/projects.ts` |
| Autonomy trigger endpoints | `requirePro` | `server/routes/autonomy.ts` |
| Background execution start | `requirePro` | `server/autonomy/execution/taskExecutionPipeline.ts` |

**4.4 Update autonomy budgets per tier**
**File**: `server/autonomy/config/policies.ts`

```typescript
export function getTierBudgets(tier: 'free' | 'pro') {
  return {
    maxBackgroundLlmCallsPerProjectPerDay: tier === 'pro' ? 50 : 0,
    maxConcurrentAutonomousTasks: tier === 'pro' ? 3 : 0,
  };
}
```

**4.5 WebSocket upgrade event**
When limit is hit, emit new WS event:
```typescript
{ type: 'upgrade_required', reason: 'daily_message_limit', currentUsage: 25, limit: 25, upgradeUrl: '/account' }
```

---

### Phase 5: Stripe Integration

**5.1 Install Stripe**
```bash
npm install stripe
```

**5.2 Create billing module**
**New files**:
- `server/billing/stripeClient.ts` — initialize `new Stripe(process.env.STRIPE_SECRET_KEY)`
- `server/billing/checkoutService.ts` — `createCheckoutSession(userId, priceId)`, `createPortalSession(customerId)`
- `server/billing/webhookHandler.ts` — handle Stripe webhook events

**5.3 Create billing routes**
**New file**: `server/routes/billing.ts`

```
POST /api/billing/checkout     — create Stripe Checkout Session, return URL
POST /api/billing/portal       — create Customer Portal session, return URL
GET  /api/billing/status       — return subscription state + usage summary
POST /api/billing/webhook      — Stripe webhook (no auth, raw body, signature verified)
```

**5.4 Register billing routes**
**File**: `server/routes.ts`

- Import and call `registerBillingRoutes(app)`
- Add `/billing/webhook` to auth exemption list (line 68): `req.path.startsWith('/auth') || req.path === '/system/storage-status' || req.path === '/billing/webhook'`

**5.5 Raw body parser for webhooks**
**File**: `server/index.ts`

Before the global `express.json()` middleware, add:
```typescript
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
```

**5.6 Webhook event handling**

| Stripe Event | Action |
|---|---|
| `checkout.session.completed` | Create Stripe customer link, update user `tier: 'pro'`, `subscriptionStatus: 'active'` |
| `customer.subscription.updated` | Sync status changes (downgrade, plan change) |
| `customer.subscription.deleted` | Set `tier: 'free'`, `subscriptionStatus: 'cancelled'` |
| `invoice.payment_failed` | Set `subscriptionStatus: 'past_due'`, keep Pro access for 7-day grace period |

**New env vars**:
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

---

### Phase 6: Frontend

**6.1 Extend auth hook with tier data**
**File**: `client/src/hooks/useAuth.ts`

Add to User type: `tier`, `subscriptionStatus`, `dailyMessagesUsed`, `dailyMessageLimit`

**6.2 Create UpgradeModal**
**New file**: `client/src/components/UpgradeModal.tsx`

Triggered by:
- `upgrade_required` WS event (daily limit hit)
- Attempting to enable autonomy on free tier
- Attempting to create 3rd project on free tier

Shows: tier comparison table, pricing, "Upgrade to Pro" button → calls `POST /api/billing/checkout` → redirects to Stripe.

**6.3 Create UsageBar**
**New file**: `client/src/components/UsageBar.tsx`

Thin progress bar: "12/25 messages today" (free) or "45/500 messages today" (pro). Shown in CenterPanel header or LeftSidebar.

**6.4 Add pricing section to LandingPage**
**File**: `client/src/pages/LandingPage.tsx`

Two cards side-by-side: Free vs Pro with feature lists and CTAs. Insert after the existing USP panels section.

**6.5 Create Account/Billing page**
**New file**: `client/src/pages/AccountPage.tsx`
**Route**: `/account` in `App.tsx`

Shows: current plan, usage this month (Recharts chart), "Manage Subscription" button → Stripe Portal, "Upgrade" button for free users.

**6.6 Handle WS upgrade event**
**File**: `client/src/hooks/useRealTimeUpdates.ts`

Add handler for `upgrade_required` event type → trigger UpgradeModal.

---

## Critical Files Summary

| File | Change |
|------|--------|
| `shared/schema.ts` | Add billing columns to users, new usage_daily_summary table |
| `server/storage.ts` | Add IStorage methods for usage + tier management |
| `server/llm/providerTypes.ts` | Add `modelTier` to LLMRequest, `tokenUsage` to metadata |
| `server/llm/providers/geminiProvider.ts` | Extract `usageMetadata` from Gemini API responses |
| `server/llm/providerResolver.ts` | Add `resolveModelForTier()` for Flash vs Pro routing |
| `server/autonomy/execution/taskExecutionPipeline.ts` | Pass `modelTier: 'premium'`, check tier budgets |
| `server/autonomy/config/policies.ts` | Add `getTierBudgets()` |
| `server/routes.ts` | Register billing routes, add webhook auth exemption, populate tier in session |
| `server/routes/chat.ts` | Add message limit check, wire usage recording |
| `server/index.ts` | Add raw body parser for Stripe webhook |
| **NEW** `server/billing/usageTracker.ts` | Usage recording + daily aggregation |
| **NEW** `server/billing/stripeClient.ts` | Stripe SDK init |
| **NEW** `server/billing/checkoutService.ts` | Checkout + portal session creation |
| **NEW** `server/billing/webhookHandler.ts` | Stripe webhook event handling |
| **NEW** `server/routes/billing.ts` | Billing API routes |
| **NEW** `server/middleware/tierGate.ts` | Tier enforcement middleware |
| **NEW** `client/src/components/UpgradeModal.tsx` | Upgrade prompt UI |
| **NEW** `client/src/components/UsageBar.tsx` | Usage progress bar |
| **NEW** `client/src/pages/AccountPage.tsx` | Account + billing management page |
| `client/src/hooks/useAuth.ts` | Add tier fields to User type |
| `client/src/hooks/useRealTimeUpdates.ts` | Handle `upgrade_required` WS event |
| `client/src/pages/LandingPage.tsx` | Add pricing section |
| `client/src/App.tsx` | Add `/account` route |

## Verification

1. **Schema**: `npm run db:push` succeeds, `npm run typecheck` passes
2. **Model routing**: Send a chat message → uses Flash. Trigger autonomy task → uses Pro (check logs for model name)
3. **Usage tracking**: Send messages → check `usage_daily_summary` table populates correctly
4. **Free tier limits**: Create free account → send 26th message → see `upgrade_required` event + UpgradeModal
5. **Project limit**: Free user → create 3rd project → blocked with upgrade prompt
6. **Autonomy gate**: Free user → try to enable autonomy → blocked with upgrade prompt
7. **Stripe checkout**: Click "Upgrade to Pro" → redirected to Stripe → complete payment → webhook fires → tier updated to 'pro' → limits lifted
8. **Stripe portal**: Pro user → "Manage Subscription" → opens Stripe portal → can cancel → webhook fires → downgraded to free
9. **Payment failure**: Simulate failed payment → `past_due` status → 7-day grace → then downgrade
10. **Existing tests**: `npm run qa:full` passes, `npm run gate:safety` passes
