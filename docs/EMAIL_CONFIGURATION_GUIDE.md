# Email Configuration Guide for IGA Prep

## Overview
This guide explains how to configure custom SMTP for IGA Prep to send confirmation emails from your company domain instead of the default Supabase email.

## Why Configure Custom SMTP?

1. **Branding**: Emails will come from your company domain (e.g., `noreply@igaprep.com`)
2. **Deliverability**: Better email deliverability and avoid spam filters
3. **Rate Limits**: Higher sending limits for user growth
4. **Professional Appearance**: More professional appearance for users

## Recommended Email Services

### 1. Resend (Recommended)
- **Best for**: Startups and modern apps
- **Pros**: Excellent deliverability, simple setup, modern APIs
- **Pricing**: 100,000 emails/month free, then $0.10/1,000 emails
- **Setup**: 5 minutes

### 2. AWS SES
- **Best for**: Large scale applications
- **Pros**: Very cost-effective at scale, reliable
- **Pricing**: 62,000 emails/month free (if from EC2), then $0.10/1,000 emails
- **Setup**: 15-30 minutes

### 3. SendGrid
- **Best for**: Enterprise features
- **Pros**: Advanced analytics, good deliverability
- **Pricing**: 100 emails/day free, then $15/month for 40,000 emails
- **Setup**: 10 minutes

## Quick Setup with Resend (Recommended)

### Step 1: Create Resend Account
1. Go to [Resend.com](https://resend.com)
2. Sign up for an account
3. Verify your email address

### Step 2: Verify Your Domain
1. Go to Settings → Domains
2. Add your domain (e.g., `igaprep.com`)
3. Add the DNS records provided by Resend to your domain registrar
4. Wait for domain verification (usually 5-30 minutes)

### Step 3: Get SMTP Credentials
1. Go to Settings → API Keys
2. Create a new API key
3. Note down your SMTP credentials:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: Your API key

### Step 4: Configure Supabase

#### Option A: Via Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Email Templates
3. Scroll down to "Custom SMTP"
4. Enable "Use custom SMTP"
5. Enter your SMTP credentials:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP User: resend
   SMTP Password: your-api-key
   Sender Email: noreply@igaprep.com
   Sender Name: IGA Prep
   ```
6. Click "Save"

#### Option B: Via API
```bash
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "mailer_secure_email_change_enabled": true,
    "mailer_autoconfirm": false,
    "smtp_admin_email": "noreply@igaprep.com",
    "smtp_host": "smtp.resend.com",
    "smtp_port": 587,
    "smtp_user": "resend",
    "smtp_pass": "your-api-key",
    "smtp_sender_name": "IGA Prep"
  }'
```

### Step 5: Update Environment Variables
Add to your `.env` file:
```env
# Email Configuration
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-api-key
SMTP_FROM_EMAIL=noreply@igaprep.com
SMTP_SENDER_NAME=IGA Prep
```

### Step 6: Test Email Configuration
1. Go to Authentication → Email Templates in Supabase
2. Click "Test Email Settings"
3. Enter a test email address
4. Check if you receive the test email

## Email Templates

### Confirmation Email Template
The default confirmation email works well, but you can customize it:

1. Go to Authentication → Email Templates
2. Edit the "Confirm signup" template
3. Use variables like `{{ .ConfirmationURL }}` and `{{ .Email }}`

### Recommended Template Content
```html
<h2>Welcome to IGA Prep!</h2>
<p>Hi {{ .Email }},</p>
<p>Welcome! We're excited to help you create an account. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Thanks,<br>The IGA Prep Team</p>
```

## Rate Limits and Scaling

### Default Limits (After Custom SMTP)
- **Emails per hour**: 30 (default, can be increased)
- **Daily limit**: Based on your email service provider

### To Increase Limits
1. Go to Authentication → Rate Limits in Supabase
2. Adjust "Emails sent per hour" based on your needs
3. Consider your email provider's limits

### Recommended Settings
- **Development**: 30 emails/hour
- **Production**: 300-1000 emails/hour (based on expected growth)
- **High Growth**: Contact Supabase for enterprise limits

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending
- Check SMTP credentials are correct
- Verify domain is properly configured
- Check rate limits in Supabase dashboard

#### 2. Emails Going to Spam
- Ensure SPF, DKIM, and DMARC records are set up
- Use a reputable email service
- Avoid spam-like content in emails

#### 3. Domain Verification Issues
- DNS records can take time to propagate
- Ensure you've added all required records
- Check with your domain registrar if issues persist

### Testing Email Flow
1. Use a test email account (not your main email)
2. Check spam folders during testing
3. Monitor email logs in your email service dashboard

## Best Practices

### 1. Security
- Never commit SMTP credentials to git
- Use environment variables for all credentials
- Rotate API keys regularly

### 2. Deliverability
- Set up proper DNS records (SPF, DKIM, DMARC)
- Use consistent sender information
- Monitor bounce rates and spam complaints

### 3. Monitoring
- Set up email analytics in your email service
- Monitor Supabase logs for delivery issues
- Set up alerts for high bounce rates

### 4. Compliance
- Include unsubscribe links in marketing emails
- Follow GDPR and CAN-SPAM regulations
- Honor unsubscribe requests promptly

## Production Checklist

Before going live with custom email:

- [ ] Domain verified with email service
- [ ] SMTP credentials configured in Supabase
- [ ] Email templates customized and tested
- [ ] Rate limits set appropriately
- [ ] DNS records (SPF, DKIM, DMARC) configured
- [ ] Test emails sent and received successfully
- [ ] Monitoring and alerts set up
- [ ] Backup email service configured (optional)

## Environment Variables Reference

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-api-key
SMTP_FROM_EMAIL=noreply@igaprep.com
SMTP_SENDER_NAME=IGA Prep

# Application Configuration
NEXT_PUBLIC_APP_URL=https://igaprep.com
NEXT_PUBLIC_APP_NAME=IGA Prep
ADMIN_EMAIL=admin@igaprep.com
```

## Support

If you encounter issues:

1. **Supabase Documentation**: https://supabase.com/docs/guides/auth/auth-smtp
2. **Resend Documentation**: https://resend.com/docs
3. **Supabase Support**: Available through your dashboard
4. **Community Forums**: https://github.com/supabase/supabase/discussions

---

This guide should help you set up professional email delivery for IGA Prep. Custom SMTP configuration is essential for production applications to ensure reliable email delivery and professional branding.
