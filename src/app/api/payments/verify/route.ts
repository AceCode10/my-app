import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Lenco
    const response = await fetch(
      `https://api.lenco.co/access/v2/collections/status/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.LENCO_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Lenco verification failed:', response.statusText);
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 500 }
      );
    }

    const lencoData = await response.json();

    if (!lencoData.status) {
      return NextResponse.json(
        { error: lencoData.message || 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = lencoData.data;

    // Check if payment is successful
    if (payment.status !== 'successful') {
      return NextResponse.json({
        status: 'pending',
        message: 'Payment is still processing',
        payment,
      });
    }

    // Update user subscription in database
    const supabase = await createClient();
    
    // Extract user info from payment reference or customer data
    // You might need to store user ID in the reference or fetch from customer email
    const userEmail = payment.customer?.email;
    
    if (userEmail) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: 'essential', // or 'pro' based on amount
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          updated_at: new Date().toISOString(),
        })
        .eq('email', userEmail.toLowerCase());

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        // Don't fail the payment verification if DB update fails
        // You might want to retry this later or handle it differently
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified successfully',
      payment,
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
