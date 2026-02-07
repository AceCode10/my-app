import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('x-lenco-signature');

    // Verify webhook signature (if Lenco provides one)
    // You may need to implement signature verification based on Lenco's documentation
    // For now, we'll proceed without signature verification

    const event = JSON.parse(body);

    console.log('Lenco webhook received:', event);

    // Handle successful payment
    if (event.event === 'collection.successful') {
      const payment = event.data;
      
      const supabase = await createClient();
      
      // Update user subscription
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: getSubscriptionTier(payment.amount),
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', payment.customer?.email?.toLowerCase());

      if (updateError) {
        console.error('Failed to update subscription from webhook:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      // Log the payment transaction
      const { error: logError } = await supabase
        .from('payment_transactions')
        .insert({
          user_email: payment.customer?.email?.toLowerCase(),
          amount: payment.amount,
          currency: payment.currency,
          reference: payment.reference,
          lenco_reference: payment.lencoReference,
          status: payment.status,
          payment_type: payment.type,
          fee: payment.fee,
          created_at: payment.completedAt || new Date().toISOString(),
        });

      if (logError) {
        console.error('Failed to log payment transaction:', logError);
        // Don't fail the webhook if logging fails
      }

      console.log(`Payment processed successfully for ${payment.customer?.email}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function getSubscriptionTier(amount: number): 'essential' | 'pro' {
  // Convert amount to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Based on your pricing: Essential ($7.99-$9.99), Pro ($9.99-$12.99)
  if (numAmount >= 9.99) {
    return 'pro';
  }
  return 'essential';
}
