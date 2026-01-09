# 🚀 Deployment Guide - IGCSE Simplified

## Prerequisites

Before deploying, ensure you have:
- ✅ Node.js 18+ installed
- ✅ A Supabase account and project
- ✅ A deployment platform account (Vercel recommended)
- ✅ Git repository set up

---

## Step 1: Environment Setup

### 1.1 Create Environment File

Copy the example environment file:
```bash
cp .env.example .env.local
```

### 1.2 Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Project Settings → API
3. Copy the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 1.3 Configure Application

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=IGCSE Simplified
NODE_ENV=production
ADMIN_EMAIL=your-admin@email.com
```

### 1.4 Validate Environment

Run the validation script:
```bash
npm run validate-env
```

---

## Step 2: Database Setup

### 2.1 Run Migrations

Apply all database migrations to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Run each migration file in supabase/migrations/ in order
```

### 2.2 Create Initial Admin User

After your first user signs up, promote them to admin:

```sql
UPDATE users 
SET role = 'super_admin'
WHERE email = 'your-admin@email.com';
```

### 2.3 Verify Database

Check that all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- users
- subjects
- topics
- questions
- papers
- paper_questions
- classes
- enrollments
- tests
- assignments
- attempts
- user_progress
- audit_logs
- exam_boards
- (and more...)

---

## Step 3: Build and Test Locally

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Build the Application

```bash
npm run build
```

Expected output: ✅ Build completed successfully

### 3.3 Test Production Build

```bash
npm run start
```

Visit http://localhost:3000 and test:
- ✅ Homepage loads
- ✅ Login/signup works
- ✅ Admin panel accessible (after promotion)
- ✅ Student dashboard works
- ✅ Teacher dashboard works

---

## Step 4: Deploy to Vercel

### 4.1 Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 4.2 Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build`
   - **Output Directory:** .next

### 4.3 Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
ADMIN_EMAIL
NODE_ENV=production
```

### 4.4 Deploy

Click "Deploy" and wait for deployment to complete.

### 4.5 Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

---

## Step 5: Post-Deployment Verification

### 5.1 Smoke Tests

Visit your deployed application and verify:

- [ ] Homepage loads without errors
- [ ] Can create new account
- [ ] Email verification works (if configured)
- [ ] Can login with credentials
- [ ] User profile displays correctly
- [ ] Can select exam board during onboarding
- [ ] Student dashboard loads
- [ ] Can browse subjects
- [ ] Can view notes
- [ ] Can take practice quiz
- [ ] Admin panel accessible (for admin users)
- [ ] Teacher dashboard accessible (for teacher users)

### 5.2 Performance Check

Use [PageSpeed Insights](https://pagespeed.web.dev/) to check:
- Performance score > 80
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s

### 5.3 Security Check

Verify security headers are present:
```bash
curl -I https://your-domain.com
```

Should include:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`

---

## Step 6: Initial Content Setup

### 6.1 Login as Admin

Use the email you promoted to `super_admin`.

### 6.2 Create Subjects

1. Go to `/admin/subjects`
2. Add subjects (e.g., Mathematics, Physics, Chemistry)
3. For each subject, add topics

### 6.3 Upload Content

1. **Notes:** Go to `/admin/notes` and create notes for topics
2. **Questions:** Go to `/admin/questions` and add practice questions
3. **Past Papers:** Go to `/admin/papers` and upload past papers

### 6.4 Create Test Teacher Account

1. Go to `/admin/users`
2. Find a user or create one
3. Promote to `teacher` role
4. Test teacher features

---

## Troubleshooting

### Build Fails

**Error:** Missing environment variables
```bash
# Solution: Check .env.local file
npm run validate-env
```

**Error:** TypeScript errors
```bash
# Solution: Fix type errors or temporarily disable
# In next.config.js: typescript.ignoreBuildErrors = true
```

### Database Connection Issues

**Error:** Cannot connect to Supabase
```bash
# Solution: Verify credentials
# Check NEXT_PUBLIC_SUPABASE_URL and KEY are correct
```

**Error:** RLS policy blocking queries
```sql
-- Solution: Check RLS policies in Supabase dashboard
-- Ensure policies allow authenticated users
```

### Authentication Issues

**Error:** Users can't login
- Check Supabase Auth settings
- Verify email confirmation is disabled (or email service configured)
- Check redirect URLs in Supabase Auth settings

**Error:** Role-based access not working
```sql
-- Verify user roles
SELECT id, email, role FROM users;

-- Update role if needed
UPDATE users SET role = 'teacher' WHERE email = 'user@example.com';
```

### Performance Issues

**Slow page loads:**
1. Check React Query cache settings
2. Verify database indexes exist
3. Check Supabase connection pooling
4. Enable Vercel Edge caching

**High database usage:**
1. Review slow queries in Supabase dashboard
2. Add missing indexes
3. Optimize N+1 queries

---

## Monitoring

### Error Tracking (Optional)

Set up Sentry for error monitoring:

1. Create Sentry account
2. Add environment variables:
```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

### Analytics (Optional)

Add Google Analytics or Plausible:
```env
NEXT_PUBLIC_GA_ID=your-ga-id
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Database Monitoring

Monitor in Supabase dashboard:
- Database size
- Connection count
- Slow queries
- API usage

---

## Rollback Procedure

If deployment fails or has critical issues:

### 1. Revert Deployment

**Vercel:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### 2. Revert Database (if needed)

```sql
-- Rollback last migration
-- (Only if migration caused issues)
-- Contact Supabase support for assistance
```

### 3. Notify Users

If downtime occurred:
1. Post announcement on homepage
2. Send email to registered users (if configured)
3. Update status page

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check user signups
- Review performance metrics

**Weekly:**
- Review audit logs
- Check database size
- Update content

**Monthly:**
- Review analytics
- Plan feature updates
- Database optimization
- Security updates

### Backup Strategy

**Supabase Automatic Backups:**
- Daily backups (retained 7 days on free tier)
- Point-in-time recovery available on paid plans

**Manual Backups:**
```bash
# Export database
supabase db dump > backup-$(date +%Y%m%d).sql

# Export storage
# Use Supabase dashboard or API
```

---

## Support

### Documentation
- `/docs/QUICK_REFERENCE.md` - Admin guide
- `/docs/COMPREHENSIVE_OPTIMIZATION_REPORT.md` - Performance details
- `/instructions.md` - Full SRS

### Common Issues
- Check GitHub Issues
- Review Supabase documentation
- Check Next.js documentation

### Getting Help
1. Check documentation first
2. Review error logs
3. Search GitHub issues
4. Contact support team

---

## Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Build succeeds locally
- [ ] All smoke tests pass
- [ ] Security headers verified
- [ ] Performance acceptable
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team trained on admin panel

---

**Deployment Status:** Ready for Production ✅

**Last Updated:** December 28, 2024
