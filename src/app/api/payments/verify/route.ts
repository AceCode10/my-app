import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Lenco API base URL - sandbox vs production
const LENCO_API_BASE = process.env.NEXT_PUBLIC_LENCO_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox.lenco.co/access/v2'
  : 'https://api.lenco.co/access/v2';

// Parse plan and billing cycle from reference format: {plan}_{cycle}_{userId}_{timestamp}_{random}
function parseReference(reference: string): { plan: string; billingCycle: string; userId: string } | null {
  if (!reference) return null;
  const parts = reference.split('_');
  if (parts.length < 5) return null;
  return {
    plan: parts[0],
    billingCycle: parts[1],
    userId: parts[2],
  };
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // SECURITY: Verify the reference belongs to this user
    const refInfo = parseReference(reference);
    if (!refInfo || refInfo.userId !== user.id) {
      return NextResponse.json({ error: 'Invalid reference' }, { status: 403 });
    }

    // Verify payment with Lenco API (server-side only, never expose secret key)
    const lencoResponse = await fetch(
      `${LENCO_API_BASE}/collections/status/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.LENCO_SECRET_KEY}`,
        },
      }
    );

    if (!lencoResponse.ok) {
      console.error('[Verify] Lenco API error:', lencoResponse.status, lencoResponse.statusText);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 502 });
    }

    const lencoData = await lencoResponse.json();

    if (!lencoData.status) {
      return NextResponse.json(
        { error: lencoData.message || 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = lencoData.data;

    // Payment still processing
    if (payment.status !== 'successful') {
      return NextResponse.json({
        status: 'pending',
        message: 'Payment is still processing',
      });
    }

    // Use service_role client for subscription updates (bypasses RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const expirationDays = refInfo.billingCycle === 'yearly' ? 365 : 30;
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

    // IDEMPOTENCY: Check if already processed
    const { data: existingTx } = await serviceClient
      .from('payment_transactions')
      .select('id, status')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx?.status === 'successful') {
      return NextResponse.json({ status: 'success', message: 'Payment already verified' });
    }

    // Update user subscription
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        subscription_tier: refInfo.plan,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        subscription_updated_at: now,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Verify] Failed to update subscription:', updateError);
    }

    // Log or update transaction
    if (existingTx) {
      await serviceClient
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
      await serviceClient
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          user_email: user.email?.toLowerCase() || '',
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

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified and subscription activated',
    });

  } catch (error: any) {
    console.error('[Verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
