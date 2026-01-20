#!/usr/bin/env tsx

/**
 * Test Email Script for IGA Prep
 * Tests different sender addresses with Resend
 */

import { config } from 'dotenv';
import { emailService } from '../src/lib/email-service';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function testEmails() {
  console.log('🧪 Testing email service with different sender addresses...\n');

  const testEmail = process.env.TEST_EMAIL || 'your-test-email@example.com';

  if (testEmail === 'your-test-email@example.com') {
    console.log('❌ Please set TEST_EMAIL in your environment variables');
    console.log('Example: TEST_EMAIL=your-actual-email@gmail.com');
    process.exit(1);
  }

  // Test 1: noreply@igaprep.com (Welcome email)
  console.log('1️⃣ Testing noreply@igaprep.com - Welcome Email');
  const result1 = await emailService.sendWelcomeEmail(testEmail, 'Test User');
  console.log(result1.success ? '✅ Success' : `❌ Failed: ${result1.error}`);

  // Test 2: support@igaprep.com (Support response)
  console.log('\n2️⃣ Testing support@igaprep.com - Support Response');
  const result2 = await emailService.sendSupportResponse(
    testEmail,
    'Test Support Ticket',
    'This is a test support response from our team.'
  );
  console.log(result2.success ? '✅ Success' : `❌ Failed: ${result2.error}`);

  // Test 3: admin@igaprep.com (Admin notification)
  console.log('\n3️⃣ Testing admin@igaprep.com - Admin Notification');
  const result3 = await emailService.sendAdminNotification(
    'Test Admin Alert',
    'This is a test admin notification from the system.'
  );
  console.log(result3.success ? '✅ Success' : `❌ Failed: ${result3.error}`);

  // Test 4: Custom from address
  console.log('\n4️⃣ Testing notifications@igaprep.com - Custom Email');
  const result4 = await emailService.sendEmail({
    to: testEmail,
    from: 'notifications@igaprep.com',
    subject: 'Test from Notifications',
    html: '<p>This is a test email sent from notifications@igaprep.com</p>',
  });
  console.log(result4.success ? '✅ Success' : `❌ Failed: ${result4.error}`);

  console.log('\n✨ Email testing complete!');
  console.log('📧 Check your inbox (and spam folder) for all test emails.');
}

// Run the test
if (require.main === module) {
  testEmails().catch(console.error);
}

export { testEmails };
