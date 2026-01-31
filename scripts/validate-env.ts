#!/usr/bin/env node

/**
 * Environment Validation Script
 * Run this before deployment to ensure all required environment variables are set
 */

import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  // Required Supabase Configuration
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (value) => {
      try {
        const url = new URL(value);
        return url.hostname.includes('supabase.co');
      } catch {
        return false;
      }
    },
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    required: true,
    description: 'Supabase publishable/anon key',
    validator: (value) => value.startsWith('eyJ'),
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    description: 'Supabase service role key (for admin operations)',
    validator: (value) => value.startsWith('eyJ'),
  },
  // Required Application Configuration
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'Application URL',
    validator: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Node environment',
    validator: (value) => ['development', 'production', 'test'].includes(value),
  },
  {
    name: 'ADMIN_EMAIL',
    required: false,
    description: 'Initial admin email address',
    validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },
  // AI Services (optional but recommended)
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI features (question extraction, etc.)',
    validator: (value) => value.startsWith('sk-'),
  },
  {
    name: 'GEMINI_API_KEY',
    required: false,
    description: 'Google Gemini API key for AI features',
    validator: (value) => value.startsWith('AIza'),
  },
  // Email Configuration (optional)
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for email notifications',
    validator: (value) => value.startsWith('re_'),
  },
  {
    name: 'SMTP_HOST',
    required: false,
    description: 'SMTP host for email sending',
    validator: (value) => value.length > 0,
  },
];

function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...\n');

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        errors.push(`❌ Missing required variable: ${envVar.name}`);
        console.log(`❌ ${envVar.name}: MISSING (required)`);
        console.log(`   ${envVar.description}\n`);
      } else {
        warnings.push(`⚠️  Optional variable not set: ${envVar.name}`);
        console.log(`⚠️  ${envVar.name}: NOT SET (optional)`);
        console.log(`   ${envVar.description}\n`);
      }
      continue;
    }

    if (envVar.validator && !envVar.validator(value)) {
      errors.push(`❌ Invalid value for: ${envVar.name}`);
      console.log(`❌ ${envVar.name}: INVALID`);
      console.log(`   ${envVar.description}\n`);
      continue;
    }

    console.log(`✅ ${envVar.name}: OK`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED\n');
    errors.forEach((error) => console.log(error));
    console.log('\nPlease check your .env.local file and ensure all required variables are set correctly.');
    console.log('Refer to .env.example for the complete list of variables.\n');
  } else if (warnings.length > 0) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS\n');
    warnings.forEach((warning) => console.log(warning));
    console.log('\nOptional variables are not set. The application will work but some features may be limited.\n');
  } else {
    console.log('✅ ALL CHECKS PASSED\n');
    console.log('Environment is properly configured for deployment.\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Run validation
const result = validateEnvironment();
process.exit(result.valid ? 0 : 1);
