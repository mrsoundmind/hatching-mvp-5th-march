import { getStripe } from './stripeClient.js';
import { storage } from '../storage.js';

/**
 * Create a Stripe Checkout Session for upgrading to Pro.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  plan: 'monthly' | 'annual' = 'monthly',
): Promise<string> {
  const stripe = getStripe();

  const priceId = plan === 'annual'
    ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
    : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${plan} plan`);
  }

  // Get or create Stripe customer
  const user = await storage.getUser(userId);
  let customerId = user?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { hatchinUserId: userId },
    });
    customerId = customer.id;
    await storage.updateUserTier(userId, user?.tier as 'free' | 'pro' ?? 'free', {
      customerId,
    });
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5001';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    metadata: { hatchinUserId: userId },
  });

  return session.url!;
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 */
export async function createPortalSession(userId: string): Promise<string> {
  const stripe = getStripe();
  const user = await storage.getUser(userId);

  if (!user?.stripeCustomerId) {
    throw new Error('No Stripe customer found for this user');
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5001';

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/account`,
  });

  return session.url;
}
