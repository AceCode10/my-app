# Priority Implementation Plan

**Created:** January 18, 2026  
**Goal:** Complete remaining features with focus on efficiency and user experience  
**Philosophy:** Simple, lovely, and functional

---

## Executive Summary

Based on the implementation checklist, there are **15 incomplete features** across the application. This plan prioritizes them by **user impact** and **business value**, focusing on what makes the app more useful and delightful for students and teachers.

---

## Feature Classification

### 🔴 Not Implemented (❌)
| Feature | Impact | Complexity |
|---------|--------|------------|
| Question Versioning | Low | Medium |
| i18n Support | Medium | High |

### 🟡 Partial Implementation
| Feature | Impact | Complexity |
|---------|--------|------------|
| Notes Download (PDF) | Medium | Low |
| Section Headers in Tests | Low | Low |
| Quick Quiz (Auto-generated) | High | Medium |
| Auto-Approve Class Option | Low | Low |
| Announcements System | High | Low |
| Audit Logs | Low | Medium |
| Platform Analytics | Medium | Medium |
| Offline Notes (PWA) | Medium | Medium |
| WCAG Accessibility | Medium | Medium |

### 🔄 Placeholder (Deferred)
| Feature | Impact | Complexity |
|---------|--------|------------|
| Usage Limits Enforcement | High | Medium |
| Payment Integration | High | High |
| Email Notifications | Medium | Medium |
| Social OAuth | Low | Low |
| GDPR Data Deletion | Low | Medium |

---

## Priority Tiers

### 🥇 TIER 1: High Impact, Quick Wins (1-2 days each)
*Features that significantly improve UX with minimal effort*

| # | Feature | Why Priority | Est. Time |
|---|---------|--------------|-----------|
| 1 | **Quick Quiz Enhancement** | Students want instant practice without setup | 4-6 hrs |
| 2 | **Announcements System** | Teachers need to communicate with classes | 3-4 hrs |
| 3 | **Auto-Approve Class Option** | Reduces teacher admin burden | 1-2 hrs |
| 4 | **Notes PDF Download** | Complete existing partial feature | 2-3 hrs |

### 🥈 TIER 2: Core Business Features (2-3 days each)
*Features that enable monetization and scale*

| # | Feature | Why Priority | Est. Time |
|---|---------|--------------|-----------|
| 5 | **Usage Limits Enforcement** | Required for freemium model to work | 6-8 hrs |
| 6 | **Platform Analytics Dashboard** | Admins need visibility into usage | 6-8 hrs |
| 7 | **Email Notifications** | User engagement and retention | 4-6 hrs |

### 🥉 TIER 3: Polish & Compliance (3-5 days each)
*Features that improve quality and meet requirements*

| # | Feature | Why Priority | Est. Time |
|---|---------|--------------|-----------|
| 8 | **WCAG Accessibility** | Inclusivity and compliance | 8-12 hrs |
| 9 | **Offline Notes (PWA)** | Better mobile experience | 6-8 hrs |
| 10 | **Audit Logs Enhancement** | Security and accountability | 4-6 hrs |

### ⏸️ TIER 4: Deferred (Future Sprints)
*Features that can wait or require external dependencies*

| # | Feature | Why Deferred | Prerequisite |
|---|---------|--------------|--------------|
| 11 | Payment Integration | Needs Stripe account setup | Business decision |
| 12 | Social OAuth | Nice-to-have, not critical | Provider setup |
| 13 | i18n Support | Significant effort, English-first market | Content translation |
| 14 | Question Versioning | Admin-only, low user impact | Schema changes |
| 15 | GDPR Data Deletion | Legal requirement, can be manual initially | Legal review |

---

## Detailed Implementation Plans

---

### 1. Quick Quiz Enhancement 🎯
**Current State:** Basic auto-generated quizzes exist but are limited  
**Target State:** Smart quiz generation based on user's weak topics

#### Implementation Steps:
```
1. Analyze user's attempt history to identify weak topics
   - Query: Get topics where user scored < 70%
   - File: src/lib/quiz/smart-quiz-generator.ts (new)

2. Create quiz configuration UI
   - Options: Number of questions (5/10/15), Difficulty, Time limit
   - File: src/components/quiz/quick-quiz-config.tsx (new)

3. Implement smart question selection algorithm
   - 60% from weak topics, 30% from medium, 10% random
   - Avoid recently answered questions (last 7 days)
   - File: src/lib/quiz/question-selector.ts (new)

4. Add "Quick Quiz" button to student dashboard
   - One-click start with sensible defaults
   - File: src/app/(dashboard)/student/page.tsx (edit)

5. Track quick quiz completions for analytics
   - File: src/lib/gamification/xp-service.ts (edit)
```

#### Database Changes: None required (uses existing tables)

#### UI Mockup:
```
┌─────────────────────────────────────┐
│  🎯 Quick Quiz                      │
│                                     │
│  Questions: [5] [10] [15]           │
│  Focus: [Weak Topics ▼]             │
│  Time: [No Limit ▼]                 │
│                                     │
│  [Start Quiz →]                     │
└─────────────────────────────────────┘
```

---

### 2. Announcements System 📢
**Current State:** Basic implementation exists  
**Target State:** Full teacher→class announcement with read tracking

#### Implementation Steps:
```
1. Create announcements table (if not exists)
   - Fields: id, class_id, teacher_id, title, content, priority, created_at
   - File: supabase/migrations/YYYYMMDD_announcements.sql (new)

2. Build announcement composer UI
   - Rich text editor (simple), priority selector, class selector
   - File: src/components/teacher/announcement-composer.tsx (new)

3. Add announcements to teacher class view
   - "Post Announcement" button in class header
   - File: src/app/(dashboard)/teacher/classes/[id]/page.tsx (edit)

4. Display announcements on student class view
   - Pinned at top, dismissible after reading
   - File: src/app/(dashboard)/student/classes/[id]/page.tsx (edit)

5. Track read status
   - Table: announcement_reads (user_id, announcement_id, read_at)
   - Show unread count badge
```

#### Database Changes:
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'normal', 'important', 'urgent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcement_reads (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);
```

---

### 3. Auto-Approve Class Option ✅
**Current State:** All join requests require manual approval  
**Target State:** Teachers can toggle auto-approve per class

#### Implementation Steps:
```
1. Add auto_approve column to classes table
   - File: supabase/migrations/YYYYMMDD_class_auto_approve.sql (new)

2. Add toggle in class settings
   - File: src/app/(dashboard)/teacher/classes/[id]/settings/page.tsx (edit)

3. Modify join logic to check auto_approve flag
   - If true: status = 'active' immediately
   - If false: status = 'pending' (current behavior)
   - File: src/app/(dashboard)/student/classes/page.tsx (edit)

4. Show auto-approve status in class card
   - Badge: "Auto-approve ON"
   - File: src/components/teacher/class-card.tsx (edit)
```

#### Database Changes:
```sql
ALTER TABLE classes ADD COLUMN auto_approve BOOLEAN DEFAULT false;
```

---

### 4. Notes PDF Download 📄
**Current State:** Download button exists but may not work fully  
**Target State:** Clean PDF export of notes with formatting

#### Implementation Steps:
```
1. Audit existing PDF download functionality
   - Check: src/components/notes/ for download logic

2. Implement server-side PDF generation
   - Use: @react-pdf/renderer or puppeteer
   - File: src/app/api/notes/[id]/pdf/route.ts (new or edit)

3. Style PDF output
   - Match app branding, include headers/footers
   - File: src/lib/pdf/note-template.tsx (new)

4. Add download progress indicator
   - Show loading state while generating
   - File: src/components/notes/download-button.tsx (edit)
```

---

### 5. Usage Limits Enforcement 🔒
**Current State:** Tiers defined but not enforced  
**Target State:** Actual limits on free tier, upgrade prompts

#### Implementation Steps:
```
1. Define limit constants
   - File: src/lib/subscription/limits.ts (new)
   ```typescript
   export const TIER_LIMITS = {
     free: {
       topicalQuestionsPerWeek: 3,
       aiExplanationsPerDay: 0,
       canJoinClasses: false,
       canAccessPapers: true, // view only
     },
     essential: {
       topicalQuestionsPerWeek: Infinity,
       aiExplanationsPerDay: 20,
       canJoinClasses: true,
       canAccessPapers: true,
     },
     pro: {
       topicalQuestionsPerWeek: Infinity,
       aiExplanationsPerDay: Infinity,
       canJoinClasses: true,
       canAccessPapers: true,
     }
   };
   ```

2. Create usage tracking table
   - Track: questions_answered_this_week, ai_explanations_today
   - File: supabase/migrations/YYYYMMDD_usage_tracking.sql (new)

3. Build limit checking middleware
   - File: src/lib/subscription/check-limits.ts (new)

4. Add limit checks to protected actions
   - Topical questions: src/app/(dashboard)/student/practice/
   - AI explanations: src/components/quiz/ai-explanation.tsx

5. Create upgrade prompt component
   - Friendly, non-intrusive modal
   - File: src/components/subscription/upgrade-prompt.tsx (new)

6. Reset weekly/daily counters
   - Supabase Edge Function or cron job
   - File: supabase/functions/reset-usage-limits/ (new)
```

#### Database Changes:
```sql
CREATE TABLE user_usage (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  questions_this_week INT DEFAULT 0,
  ai_explanations_today INT DEFAULT 0,
  week_start DATE DEFAULT CURRENT_DATE,
  day_start DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6. Platform Analytics Dashboard 📊
**Current State:** Basic metrics only  
**Target State:** Comprehensive admin dashboard with key metrics

#### Implementation Steps:
```
1. Define key metrics
   - Daily/Weekly/Monthly Active Users
   - Questions answered, Notes viewed, Papers completed
   - Conversion rate (free → paid)
   - Top subjects, Popular topics

2. Create analytics queries
   - File: src/lib/admin/analytics-queries.ts (new)

3. Build dashboard UI
   - Charts using recharts (already installed)
   - File: src/app/(dashboard)/admin/analytics/page.tsx (new or edit)

4. Add date range selector
   - Last 7 days, 30 days, 90 days, Custom
   - File: src/components/admin/date-range-picker.tsx (new)

5. Export functionality
   - CSV download of metrics
   - File: src/app/api/admin/analytics/export/route.ts (new)
```

---

### 7. Email Notifications 📧
**Current State:** Placeholder only  
**Target State:** Transactional emails for key events

#### Implementation Steps:
```
1. Set up email provider
   - Options: Resend, SendGrid, or Supabase built-in
   - File: src/lib/email/provider.ts (new)

2. Create email templates
   - Welcome email
   - Assignment due reminder
   - Results released
   - Streak at risk
   - File: src/lib/email/templates/ (new directory)

3. Implement email triggers
   - On signup: Welcome email
   - 24h before due: Reminder
   - On results release: Notification
   - File: src/lib/email/triggers.ts (new)

4. Add email preferences to settings
   - User can opt-out of non-essential emails
   - File: src/app/(dashboard)/student/settings/page.tsx (edit)
```

---

### 8. WCAG Accessibility ♿
**Current State:** Partial compliance  
**Target State:** WCAG 2.1 AA compliant

#### Implementation Steps:
```
1. Audit with axe-core
   - Run automated accessibility tests
   - Document all issues

2. Fix critical issues
   - Missing alt text on images
   - Color contrast issues
   - Keyboard navigation
   - Focus indicators

3. Add ARIA labels
   - Interactive elements
   - Dynamic content regions
   - Form fields

4. Test with screen reader
   - VoiceOver (Mac), NVDA (Windows)
   - Document any issues

5. Add skip links
   - "Skip to main content" link
   - File: src/components/layout/skip-link.tsx (new)
```

---

### 9. Offline Notes (PWA) 📱
**Current State:** Service worker exists but limited  
**Target State:** Notes available offline after viewing

#### Implementation Steps:
```
1. Audit existing service worker
   - File: public/sw.js

2. Implement note caching strategy
   - Cache notes on first view
   - Serve from cache when offline
   - File: src/lib/pwa/note-cache.ts (new)

3. Add offline indicator
   - Show when user is offline
   - File: src/components/ui/offline-indicator.tsx (new)

4. Sync when back online
   - Queue any actions taken offline
   - Sync progress when connection restored

5. Add "Save for Offline" button
   - Explicit user action to cache note
   - File: src/components/notes/save-offline-button.tsx (new)
```

---

### 10. Audit Logs Enhancement 📝
**Current State:** Basic logging  
**Target State:** Comprehensive action logging for admins

#### Implementation Steps:
```
1. Define auditable actions
   - User: login, logout, profile update
   - Admin: role change, content publish, user suspend
   - Teacher: class create, assignment create, grade submit

2. Create audit log table (if not exists)
   - File: supabase/migrations/YYYYMMDD_audit_logs.sql

3. Implement logging middleware
   - File: src/lib/audit/logger.ts (new)

4. Build audit log viewer
   - Filterable by user, action type, date
   - File: src/app/(dashboard)/admin/audit-logs/page.tsx (new)

5. Add retention policy
   - Auto-delete logs older than 90 days
   - Supabase scheduled function
```

---

## Implementation Timeline

```
Week 1: Quick Wins (Tier 1)
├── Day 1-2: Quick Quiz Enhancement
├── Day 3: Announcements System
├── Day 4: Auto-Approve + Notes PDF
└── Day 5: Testing & Polish

Week 2: Core Business (Tier 2)
├── Day 1-2: Usage Limits Enforcement
├── Day 3-4: Platform Analytics Dashboard
└── Day 5: Email Notifications Setup

Week 3: Polish & Compliance (Tier 3)
├── Day 1-2: WCAG Accessibility Audit & Fixes
├── Day 3-4: Offline Notes (PWA)
└── Day 5: Audit Logs Enhancement

Week 4: Testing & Refinement
├── Day 1-2: End-to-end testing
├── Day 3: Bug fixes
├── Day 4: Performance optimization
└── Day 5: Documentation & deployment
```

---

## Success Metrics

| Feature | Success Metric |
|---------|----------------|
| Quick Quiz | 50% of students use it weekly |
| Announcements | 80% read rate within 24h |
| Usage Limits | 5% free→paid conversion |
| Analytics | Admins check daily |
| Email | 30% open rate |
| Accessibility | 0 critical axe-core issues |
| Offline | 20% of notes saved offline |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Usage limits frustrate users | Generous free tier, clear upgrade path |
| Email deliverability issues | Use reputable provider, monitor bounce rates |
| PWA complexity | Start simple, iterate based on feedback |
| Accessibility scope creep | Focus on critical issues first |

---

## Dependencies & Prerequisites

| Feature | Dependencies |
|---------|--------------|
| Email Notifications | Email provider account (Resend/SendGrid) |
| Payment Integration | Stripe account, business verification |
| Offline Notes | HTTPS required (already have) |
| Analytics | None (uses existing data) |

---

## Recommendation

**Start with Tier 1 features** - they provide the highest user value with the lowest implementation cost. The Quick Quiz and Announcements features will immediately improve the daily experience for both students and teachers.

**Defer Tier 4 features** until the core experience is polished. Payment integration, i18n, and social OAuth are "nice to have" but don't affect the core learning experience.

---

*This plan prioritizes making the app delightful to use over feature completeness. A simple, working feature is better than a complex, buggy one.*
