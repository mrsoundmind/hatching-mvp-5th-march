import type { Express } from 'express';
import { z } from 'zod';
import { isStripeConfigured } from '../billing/stripeClient.js';
import { createCheckoutSession, createPortalSession } from '../billing/checkoutService.js';
import { handleWebhookEvent } from '../billing/webhookHandler.js';
import { storage } from '../storage.js';
import { getDailyMessageCount } from '../billing/usageTracker.js';

export function registerBillingRoutes(app: Express) {
  /**
   * GET /api/billing/status — Current subscription + usage summary
   * Always registered — does NOT require Stripe (reads from DB only)
   */
  app.get('/api/billing/status', async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const tier = user.tier || 'free';
      const dailyMessages = await getDailyMessageCount(storage, userId);

      // Get monthly usage
      const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthlyUsage = await storage.getMonthlyUsage(userId, yearMonth);
      const totalTokens = monthlyUsage.reduce((sum, d) => sum + (d.totalTokens ?? 0), 0);
      const totalCostCents = monthlyUsage.reduce((sum, d) => sum + (d.estimatedCostCents ?? 0), 0);

      return res.json({
        tier,
        subscriptionStatus: user.subscriptionStatus || 'none',
        subscriptionPeriodEnd: user.subscriptionPeriodEnd,
        graceExpiresAt: user.graceExpiresAt,
        stripeConfigured: isStripeConfigured(),
        usage: {
          dailyMessages,
          monthlyTokens: totalTokens,
          monthlyCostCents: totalCostCents,
          daysInMonth: monthlyUsage.length,
        },
      });
    } catch (err) {
      console.error('[Billing] Status error:', err);
      return res.status(500).json({ error: 'Failed to get billing status' });
    }
  });

  // Guard: Stripe-dependent routes return proper JSON errors if Stripe isn't configured
  if (!isStripeConfigured()) {
    console.log('[Billing] Stripe not configured — checkout/portal/webhook routes return graceful errors');
    app.post('/api/billing/checkout', (_req, res) => {
      res.status(503).json({ error: 'Billing is not available. Please contact support.' });
    });
    app.post('/api/billing/portal', (_req, res) => {
      res.status(503).json({ error: 'Billing portal is not available. Please contact support.' });
    });
    return;
  }

  /**
   * POST /api/billing/checkout — Create Stripe Checkout Session
   */
  app.post('/api/billing/checkout', async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const schema = z.object({ plan: z.enum(['monthly', 'annual']).default('monthly') });
      const { plan } = schema.parse(req.body || {});

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const url = await createCheckoutSession(userId, user.email, plan);
      return res.json({ url });
    } catch (err) {
      console.error('[Billing] Checkout error:', err);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  /**
   * POST /api/billing/portal — Create Stripe Customer Portal Session
   */
  app.post('/api/billing/portal', async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const url = await createPortalSession(userId);
      return res.json({ url });
    } catch (err) {
      console.error('[Billing] Portal error:', err);
      return res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  /**
   * POST /api/billing/webhook — Stripe webhook (no auth, raw body, sig verified)
   * IMPORTANT: This route must use raw body parser, NOT express.json()
   */
  app.post('/api/billing/webhook', async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Webhook body must be raw — check middleware ordering' });
    }

    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const result = await handleWebhookEvent(req.body, signature);
      return res.json({ received: true, ...result });
    } catch (err: any) {
      console.error('[Billing] Webhook error:', err.message);
      return res.status(400).json({ error: 'Webhook verification failed' });
    }
  });
}
