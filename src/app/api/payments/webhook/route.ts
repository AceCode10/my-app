import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Use service_role client for webhook processing (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify webhook signature per Lenco docs:
// webhook_hash_key = SHA256(SECRET_KEY)
// signature = HMAC-SHA512(body, webhook_hash_key)
// Header: X-Lenco-Signature
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.LENCO_SECRET_KEY) {
    return false;
  }

  const webhookHashKey = crypto
    .createHash('sha256')
    .update(process.env.LENCO_SECRET_KEY)
    .digest('hex');

  const expectedSignature = crypto
    .createHmac('sha512', webhookHashKey)
    .update(body)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// Parse plan and billing cycle from reference format: {plan}_{cycle}_{userId}_{timestamp}_{random}
function parseReference(reference: string): { plan: string; billingCycle: string; userId: string } | null {
  if (!reference) return null;
  const parts = reference.split('_');
  if (parts.length < 5) return null;
  return {
    plan: parts[0],       // 'essential' or 'pro'
    billingCycle: parts[1], // 'monthly' or 'yearly'
    userId: parts[2],
  };
}

export async function POST(request: NextRequest) {
  // Respond quickly with 200 to acknowledge receipt (Lenco retries if no 200 within timeout)
  // But still process the event
  try {
    const body = await request.text();
    const signature = request.headers.get('x-lenco-signature');

    // SECURITY: Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('[Webhook] Invalid signature - rejecting');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('[Webhook] Event received:', event.event);

    // Handle collection.successful event (from Lenco payment widget)
    if (event.event === 'collection.successful') {
      await handleCollectionSuccessful(event.data);
    }

    // Handle transaction.successful event (general transactions)
    if (event.event === 'transaction.successful') {
      console.log('[Webhook] Transaction successful:', event.data?.id);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    // Still return 200 to prevent Lenco from retrying on our processing errors
    // We'll handle failed processing via our own re-query service
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

async function handleCollectionSuccessful(payment: any) {
  const supabase = createServiceClient();
  const reference = payment.reference;

  // IDEMPOTENCY: Check if this reference was already processed
  const { data: existing } = await supabase
    .from('payment_transactions')
    .select('id, status')
    .eq('reference', reference)
    .maybeSingle();

  if (existing?.status === 'successful') {
    console.log(`[Webhook] Reference ${reference} already processed - skipping`);
    return;
  }

  // Parse plan info from reference
  const refInfo = parseReference(reference);

  if (!refInfo) {
    console.error(`[Webhook] Could not parse reference: ${reference}`);
    return;
  }

  const now = new Date().toISOString();
  const expirationDays = refInfo.billingCycle === 'yearly' ? 365 : 30;
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

  // Update user subscription
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_tier: refInfo.plan,
      subscription_status: 'active',
      subscription_expires_at: expiresAt,
      subscription_updated_at: now,
    })
    .eq('id', refInfo.userId);

  if (updateError) {
    console.error('[Webhook] Failed to update subscription:', updateError);
    // Don't return - still try to log the transaction
  }

  // Upsert transaction record (update if pending record exists from verify, insert if not)
  if (existing) {
    await supabase
      .from('payment_transactions')
      .update({
        status: 'successful',
        lenco_reference: payment.lencoReference,
        payment_type: payment.type,
        fee: payment.fee,
        verified_at: now,
        updated_at: now,
      })
      .eq('reference', reference);
  } else {
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: refInfo.userId,
        user_email: payment.customer?.email?.toLowerCase() || '',
        plan: refInfo.plan,
        billing_cycle: refInfo.billingCycle,
        amount: payment.amount,
        currency: payment.currency || 'USD',
        reference,
        lenco_reference: payment.lencoReference,
        status: 'successful',
        payment_type: payment.type,
        fee: payment.fee,
        verified_at: now,
      });
  }

  console.log(`[Webhook] Payment processed for user ${refInfo.userId}, plan: ${refInfo.plan}`);
}
