#!/usr/bin/env tsx

/**
 * Direct Email Test - Hardcode API key temporarily
 */

const RESEND_API_KEY = 're_YOUR_ACTUAL_API_KEY_HERE'; // Replace with your key
const TEST_EMAIL = 'your-email@gmail.com'; // Replace with your email

async function testDirectEmail() {
  console.log('🧪 Testing direct email with Resend API...\n');

  if (RESEND_API_KEY === 're_YOUR_ACTUAL_API_KEY_HERE') {
    console.log('❌ Please update the API key in this script');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IGA Prep <noreply@igaprep.com>',
        to: [TEST_EMAIL],
        subject: 'Test Email from IGA Prep',
        html: '<h1>Success!</h1><p>This email was sent from your custom domain.</p>',
      }),
    });

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      const result = await response.json();
      console.log('Email ID:', result.id);
    } else {
      const error = await response.json();
      console.log('❌ Failed to send email:', error);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

testDirectEmail();
