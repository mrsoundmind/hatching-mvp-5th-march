import Stripe from 'stripe';
import { getStripe } from './stripeClient.js';
import { storage } from '../storage.js';

/**
 * Verify and process a Stripe webhook event.
 * Returns true if processed, false if skipped (duplicate or unhandled).
 */
export async function handleWebhookEvent(
  rawBody: Buffer,
  signature: string,
): Promise<{ processed: boolean; eventType: string }> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  // Idempotency check
  const alreadyProcessed = await storage.checkWebhookProcessed(event.id);
  if (alreadyProcessed) {
    return { processed: false, eventType: event.type };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Unhandled event type — mark as processed to avoid reprocessing
      break;
  }

  // Mark as processed for idempotency
  await storage.markWebhookProcessed(event.id, event.type);
  return { processed: true, eventType: event.type };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.hatchinUserId;
  if (!userId) {
    console.warn('[Billing] checkout.session.completed missing hatchinUserId in metadata:', session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  await storage.updateUserTier(userId, 'pro', {
    customerId: customerId ?? undefined,
    subscriptionId: subscriptionId ?? undefined,
    subscriptionStatus: 'active',
    graceExpiresAt: null, // Clear grace period on real subscription
  });

  console.log(`[Billing] User ${userId} upgraded to Pro`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await findUserByCustomerId(
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? '',
  );
  if (!userId) return;

  const status = subscription.status;
  // Stripe API returns current_period_end but v20+ SDK types moved it — cast to access
  const rawPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000) : undefined;

  if (status === 'active' || status === 'trialing') {
    await storage.updateUserTier(userId, 'pro', {
      subscriptionStatus: 'active',
      periodEnd,
    });
  } else if (status === 'past_due') {
    await storage.updateUserTier(userId, 'pro', {
      subscriptionStatus: 'past_due',
      periodEnd,
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await findUserByCustomerId(
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? '',
  );
  if (!userId) return;

  await storage.updateUserTier(userId, 'free', {
    subscriptionStatus: 'cancelled',
    subscriptionId: undefined,
    graceExpiresAt: null,
  });

  console.log(`[Billing] User ${userId} downgraded to Free (subscription cancelled)`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id ?? '';
  const userId = await findUserByCustomerId(customerId);
  if (!userId) return;

  // Give 7-day grace on payment failure
  const graceDate = new Date();
  graceDate.setDate(graceDate.getDate() + 7);

  await storage.updateUserTier(userId, 'pro', {
    subscriptionStatus: 'past_due',
    graceExpiresAt: graceDate,
  });

  console.log(`[Billing] User ${userId} payment failed — 7-day grace until ${graceDate.toISOString()}`);
}

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  // Look up user by stripe_customer_id
  const { pool: dbPool } = await import('../db.js');
  const result = await dbPool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1',
    [customerId],
  );
  return result.rows[0]?.id ?? null;
}
