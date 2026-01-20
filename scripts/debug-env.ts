#!/usr/bin/env tsx

/**
 * Debug Environment Variables
 * Check what environment variables are actually loaded
 */

import { config } from 'dotenv';

console.log('🔍 Debugging environment variables...\n');

// Load environment variables
console.log('Loading .env.local...');
config({ path: '.env.local', debug: true });

console.log('\nLoading .env...');
config({ path: '.env', debug: true, override: false });

console.log('\n📋 Current environment variables:');

// Check all possible API key variables
const apiKeyVars = [
  'RESEND_API_KEY',
  'SMTP_PASSWORD', 
  'RESEND_API_TOKEN'
];

apiKeyVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length - 5)}`);
  } else {
    console.log(`❌ ${varName}: Not found`);
  }
});

// Check email variables
const emailVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_FROM_EMAIL',
  'SUPPORT_EMAIL',
  'ADMIN_EMAIL',
  'TEST_EMAIL'
];

console.log('\n📧 Email configuration:');
emailVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: Not found`);
  }
});

// Test if we can read the .env file directly
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve('.env');
  const envContent = readFileSync(envPath, 'utf8');
  console.log('\n📄 .env file content (first 200 chars):');
  console.log(envContent.substring(0, 200) + '...');
  
  // Check if RESEND_API_KEY is in the file
  if (envContent.includes('RESEND_API_KEY=')) {
    console.log('✅ RESEND_API_KEY found in .env file');
  } else {
    console.log('❌ RESEND_API_KEY not found in .env file');
  }
} catch (error) {
  console.log('❌ Could not read .env file:', error);
}

console.log('\n🎯 Recommendation:');
console.log('Make sure RESEND_API_KEY is set in your .env file like this:');
console.log('RESEND_API_KEY=re_xxxxxxxxxxxxxxxx');
