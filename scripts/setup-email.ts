#!/usr/bin/env tsx

/**
 * Email Configuration Setup Script
 uses Supabase Management API to configure custom SMTP
 * requires SUPABASE_ACCESS_TOKEN and PROJECT_REF environment variables
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN environment variable is required');
  console.log('Get your access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

if (!PROJECT_REF) {
  console.error('❌ Could not extract PROJECT_REF from NEXT_PUBLIC_SUPABASE_URL');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL is set in your environment');
  process.exit(1);
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_admin_email: string;
  smtp_sender_name: string;
}

async function configureEmail(config: EmailConfig) {
  console.log('🔧 Configuring email settings for Supabase project:', PROJECT_REF);
  
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  
  const payload = {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: config.smtp_admin_email,
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port.toString(),
    smtp_user: config.smtp_user,
    smtp_pass: config.smtp_pass,
    smtp_sender_name: config.smtp_sender_name,
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to configure email: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('✅ Email configuration updated successfully!');
    console.log('📧 From email:', config.smtp_admin_email);
    console.log('📧 Sender name:', config.smtp_sender_name);
    
    return result;
  } catch (error) {
    console.error('❌ Error configuring email:', error);
    throw error;
  }
}

async function testEmailConfiguration() {
  console.log('\n🧪 Testing email configuration...');
  
  // This would require additional API calls or manual testing through the dashboard
  console.log('📝 To test email configuration:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Authentication → Email Templates');
  console.log('3. Click "Test Email Settings"');
  console.log('4. Enter a test email address');
  console.log('5. Check if you receive the test email');
}

async function main() {
  console.log('🚀 I like to check your environment variables for email configuration...\n');

  // Check for required environment variables
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM_EMAIL',
    'SMTP_SENDER_NAME'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\nPlease add these to your .env file and run again.');
    process.exit(1);
  }

  const emailConfig: EmailConfig = {
    smtp_host: process.env.SMTP_HOST!,
    smtp_port: parseInt(process.env.SMTP_PORT!),
    smtp_user: process.env.SMTP_USER!,
    smtp_pass: process.env.SMTP_PASSWORD!,
    smtp_admin_email: process.env.SMTP_FROM_EMAIL!,
    smtp_sender_name: process.env.SMTP_SENDER_NAME!,
  };

  console.log('📋 Email configuration:');
  console.log(`   Host: ${emailConfig.smtp_host}`);
  console.log(`   Port: ${emailConfig.smtp_port}`);
  console.log(`   User: ${emailConfig.smtp_user}`);
  console.log(`   From: ${emailConfig.smtp_admin_email}`);
  console.log(`   Name: ${emailConfig.smtp_sender_name}`);

  try {
    await configureEmail(emailConfig);
    await testEmailConfiguration();
    
    console.log('\n✨ Setup complete! Your emails will now be sent from your custom domain.');
    console.log('📖 For more information, see: docs/EMAIL_CONFIGURATION_GUIDE.md');
  } catch (error) {
    console.error('\n💥 Setup failed. Please check the error above and try again.');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { configureEmail, testEmailConfiguration };
