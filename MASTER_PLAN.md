# IGCSE Simplified: Master Implementation Plan

**Version:** 1.0  
**Date:** October 22, 2025  
**Status:** Ready for Execution

---

## Executive Summary

This plan migrates the partially-built IGCSE Simplified app from Firebase to Supabase and completes all features per `instructions.md`. 

**Current State:**
- ✅ Next.js 15 + Tailwind + shadcn/ui setup
- ✅ Basic Supabase auth scaffolding
- ⚠️ Firebase code in `/src` (to be removed)
- ⚠️ Incomplete features

**Goals:**
- Complete Supabase migration (Auth, Postgres, Storage, Realtime)
- Implement all spec features with minimal complexity
- Production-ready in 6-8 weeks

**Key Constraints:**
- Simplicity & efficiency first
- No AI for content generation/grading
- Freemium usage limits enforced

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2) - 33 hours
**Deliverable:** Clean Supabase backend, Firebase removed, auth working

- Set up Supabase projects (dev/staging/prod)
- Deploy complete database schema with RLS
- Migrate auth to Supabase Auth
- Remove all Firebase dependencies
- Set up Storage buckets
- Create seed data scripts

**📄 Details:** [01_FOUNDATION.md](./docs/implementation/01_FOUNDATION.md)

---

### Phase 2: Core Content & Student Features (Weeks 3-4) - 64 hours
**Deliverable:** Students can browse, read notes, take quizzes

- Subject/Topic hierarchy & navigation
- Notes CRUD (admin) & viewing (students)
- Question bank management (admin CMS)
- Quiz player with autosave
- Auto-grading engine
- Flashcard system
- Student dashboard

**📄 Details:** [02_CORE_FEATURES.md](./docs/implementation/02_CORE_FEATURES.md)

---

### Phase 3: Teacher Features (Weeks 5-6) - 66 hours
**Deliverable:** Teachers can create classes, build tests, assign work

- Class management (create, join codes, roster)
- Test Builder UI & composition
- PDF export (Playwright)
- Assignment system
- Manual grading interface
- Teacher analytics
- Direct messaging

**📄 Details:** [03_TEACHER_FEATURES.md](./docs/implementation/03_TEACHER_FEATURES.md)

---

### Phase 4: Admin & Gamification (Week 7) - 48 hours
**Deliverable:** Full admin CMS, gamification live

- Admin dashboard & user management
- Paper upload & question mapping
- Content moderation workflow
- XP, streaks, badges system
- Public leaderboard
- Announcements & notifications
- Subscription tier enforcement

**📄 Details:** [04_ADMIN_GAMIFICATION.md](./docs/implementation/04_ADMIN_GAMIFICATION.md)

---

### Phase 5: Testing & Deployment (Week 8) - 37 hours
**Deliverable:** Production-ready with CI/CD

- RLS policy testing
- E2E test suite (Playwright)
- Performance optimization
- Sentry error monitoring
- CI/CD pipeline (GitHub Actions)
- Documentation

**📄 Details:** [05_TESTING_DEPLOYMENT.md](./docs/implementation/05_TESTING_DEPLOYMENT.md)

---

## Critical Reference Documents

### Migration & Architecture
- **[MIGRATION_GUIDE.md](./docs/migration/MIGRATION_GUIDE.md)** - Complete Firebase → Supabase migration
- **[DATABASE_SCHEMA.sql](./docs/migration/DATABASE_SCHEMA.sql)** - Full Postgres schema with indexes
- **[RLS_POLICIES.sql](./docs/migration/RLS_POLICIES.sql)** - Row-level security policies
- **[DATA_MAPPING.md](./docs/migration/DATA_MAPPING.md)** - Firestore → Postgres mapping

### Development
- **[API_CONTRACTS.md](./docs/api/API_CONTRACTS.md)** - All endpoints with request/response examples
- **[CODE_EXAMPLES.md](./docs/code/CODE_EXAMPLES.md)** - Copy-paste TypeScript snippets
- **[COMPONENT_GUIDE.md](./docs/code/COMPONENT_GUIDE.md)** - UI components & patterns
- **[SUPABASE_CLIENT.md](./docs/code/SUPABASE_CLIENT.md)** - Client setup & usage patterns

### Security & Operations
- **[SECURITY_GUIDE.md](./docs/security/SECURITY_GUIDE.md)** - Auth, RLS, input validation
- **[STORAGE_GUIDE.md](./docs/security/STORAGE_GUIDE.md)** - File uploads, signed URLs, buckets
- **[MONITORING.md](./docs/operations/MONITORING.md)** - Logging, metrics, alerts
- **[DEPLOYMENT.md](./docs/operations/DEPLOYMENT.md)** - CI/CD, environments, rollback

### Testing
- **[TEST_PLAN.md](./docs/testing/TEST_PLAN.md)** - Unit, integration, E2E test cases
- **[ACCEPTANCE_CRITERIA.md](./docs/testing/ACCEPTANCE_CRITERIA.md)** - Feature acceptance checklist

---

## Quick Start Guide

### 1. Environment Setup (Day 1)
```bash
# Install dependencies
npm install

# Create Supabase projects
# - Dev: igcse-simplified-dev
# - Staging: igcse-simplified-staging  
# - Prod: igcse-simplified-prod

# Set environment variables
cp .env.example .env.local
# Add Supabase credentials
```

### 2. Database Setup (Day 1-2)
```bash
# Run schema migration
psql -h <supabase-host> -U postgres -f docs/migration/DATABASE_SCHEMA.sql

# Apply RLS policies
psql -h <supabase-host> -U postgres -f docs/migration/RLS_POLICIES.sql

# Seed initial data
npm run seed:dev
```

### 3. Remove Firebase (Day 2)
```bash
# Remove Firebase packages
npm uninstall firebase

# Delete Firebase code
rm -rf src/firebase
rm firestore.rules
rm firebase-debug.log

# Update imports (see MIGRATION_GUIDE.md)
```

### 4. Start Development (Day 3+)
```bash
npm run dev
# Follow phase-by-phase implementation
```

---

## Key Assumptions

1. **Admin is content source of truth** - Teachers assemble from admin bank only
2. **Auto-grading scope** - MCQ, True/False, numeric (with tolerance), fill-blank only
3. **No AI involvement** - Manual grading for essays, no AI suggestions
4. **Payment deferred** - Placeholder UI only, Stripe integration later
5. **Public leaderboard** - Global XP ranking with opt-out option
6. **Single Supabase project per environment** - No multi-tenancy

---

## Open Questions & Decisions Needed

### Before Phase 1
- [ ] **Supabase plan tier?** (Free tier for dev, Pro for prod recommended)
- [ ] **Storage bucket structure?** Proposal: `notes-media`, `question-media`, `papers`, `user-avatars`
- [ ] **Email provider for auth?** (Supabase built-in vs SendGrid/Resend)

### Before Phase 2
- [ ] **Markdown renderer?** Proposal: `react-markdown` + `rehype-sanitize`
- [ ] **Rich text editor for admin?** Proposal: `tiptap` or `lexical`

### Before Phase 3
- [ ] **PDF generation approach?** Proposal: Playwright headless (cost: ~$0.001/PDF)
- [ ] **Job queue for async tasks?** Proposal: Supabase Edge Functions + pg_cron

### Before Phase 5
- [ ] **Monitoring vendor?** Proposal: Sentry (errors) + Supabase Dashboard (DB metrics)
- [ ] **Deployment target?** Proposal: Vercel (Next.js) + Supabase (backend)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firebase data migration fails | High | Export to JSON, transform, bulk insert with validation |
| RLS policies too complex | Medium | Test with sample data, use policy helper functions |
| PDF generation slow/expensive | Medium | Queue system, cache generated PDFs, optimize templates |
| Autosave floods database | Medium | Throttle to 1 save/10s per user, use debouncing |
| Storage costs exceed budget | Low | Implement file size limits, compress images |

---

## Success Metrics

### Technical
- [ ] All Firebase code removed
- [ ] 100% RLS policy coverage on tables
- [ ] <1.5s p95 page load time
- [ ] <150ms p50 API response time
- [ ] 99.9% uptime SLA

### Functional
- [ ] All 60+ FRs from instructions.md implemented
- [ ] Admin can upload questions with examiner comments
- [ ] Teachers can build & assign tests
- [ ] Students can take timed tests with autosave
- [ ] Auto-grading works for objective questions
- [ ] Leaderboard updates in real-time

### Quality
- [ ] 80%+ test coverage
- [ ] Zero critical security vulnerabilities
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile-responsive on all pages

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Answer open questions** - Make key technical decisions
3. **Set up Supabase projects** - Create dev/staging/prod instances
4. **Begin Phase 1** - Start with database schema deployment

**Ready to proceed?** Start with [01_FOUNDATION.md](./docs/implementation/01_FOUNDATION.md)
