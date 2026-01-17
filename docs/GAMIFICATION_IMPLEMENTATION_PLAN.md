# 🎮 IGCSE Simplified - Comprehensive Gamification Implementation Plan

## Executive Summary

This document outlines a complete gamification system inspired by Duolingo, designed to create an engaging, addictive, and educationally effective experience for IGCSE students. The system focuses on **immediate feedback**, **real-time animations**, **audio cues**, and **social competition**.

---

## 📊 Current State Analysis

### Existing Infrastructure ✅
| Component | Status | Location |
|-----------|--------|----------|
| XP System | Basic | `src/lib/gamification/xp-service.ts` |
| Streak System | Basic | `src/lib/gamification/streak-service.ts` |
| Badge System | Basic | `src/lib/gamification/badge-service.ts` |
| Leaderboard | Basic | `src/components/gamification/leaderboard.tsx` |
| Notifications | Basic | `src/lib/notifications/notification-service.ts` |
| Database Schema | Complete | `supabase/migrations/20241228_gamification_schema_fixed.sql` |

### Gaps Identified ❌
1. **No micro-animations** for XP gains, level-ups, badge unlocks
2. **No sound effects** for achievements and interactions
3. **No confetti/particle effects** for celebrations
4. **No daily goals** system
5. **No leagues/divisions** system (weekly competition tiers)
6. **No achievement toasts** with animations
7. **No streak freeze purchase** with gems/currency
8. **No hearts/lives** system (optional)
9. **No daily challenges** or quests
10. **Limited real-time updates** (only basic broadcasts)

---

## 🛠️ Recommended Technology Stack

### Animation Framework: **Framer Motion** ⭐ (Primary Choice)

```bash
npm install framer-motion
```

**Why Framer Motion?**
- React-native integration (works seamlessly with Next.js)
- Declarative animations with simple API
- Gesture support (drag, tap, hover)
- Layout animations for smooth transitions
- Exit animations for unmounting components
- Performance optimized with GPU acceleration
- Large community and excellent documentation

**Alternative Considered:**
- `react-spring` - Good but more complex API
- `GSAP` - Powerful but not React-first
- CSS animations - Limited control, harder to sequence

### Particle/Confetti Effects: **canvas-confetti** ✅ (Already Installed)

```bash
# Already in package.json
"canvas-confetti": "^1.9.3"
```

**Why canvas-confetti?**
- Lightweight (< 6KB gzipped)
- High performance (uses Canvas API)
- Customizable particles
- No dependencies

### Sound Effects: **Howler.js** ⭐ (Recommended)

```bash
npm install howler
```

**Why Howler.js?**
- Cross-browser audio support
- Sprite support (single file with multiple sounds)
- Volume/fade controls
- Works on mobile (handles autoplay restrictions)
- Memory efficient

**Alternative:** `use-sound` hook - simpler but less features

### Real-time Updates: **Supabase Realtime** ✅ (Already Available)

Already integrated. Will enhance usage for:
- Live leaderboard updates
- Real-time XP notifications
- Cross-device streak sync

### State Management: **Zustand** (Recommended for Gamification State)

```bash
npm install zustand
```

**Why Zustand?**
- Lightweight (< 1KB)
- No boilerplate
- Works great with React 19
- Persistent storage support
- Perfect for global gamification state

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GAMIFICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   XP Store  │  │ Streak Store│  │ Badge Store │            │
│  │  (Zustand)  │  │  (Zustand)  │  │  (Zustand)  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│                 ┌────────▼────────┐                           │
│                 │  Gamification   │                           │
│                 │    Provider     │                           │
│                 └────────┬────────┘                           │
│                          │                                     │
│  ┌───────────────────────┼───────────────────────┐            │
│  │                       │                       │            │
│  ▼                       ▼                       ▼            │
│ ┌──────────┐      ┌──────────┐           ┌──────────┐        │
│ │Animation │      │  Sound   │           │  Toast   │        │
│ │ Manager  │      │ Manager  │           │ Manager  │        │
│ └──────────┘      └──────────┘           └──────────┘        │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                     UI COMPONENTS                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ XPGainOverlay   │  │ LevelUpModal    │  │ BadgeUnlock   │ │
│  │ (Framer Motion) │  │ (Framer Motion) │  │ (Framer+Sound)│ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ StreakCelebrate │  │ LeaderboardLive │  │ DailyGoals    │ │
│  │ (Confetti+Sound)│  │ (Real-time)     │  │ (Progress)    │ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Enhancements

### New Tables Required

```sql
-- 1. Daily Goals System
CREATE TABLE daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    xp_goal INTEGER DEFAULT 50,
    xp_earned INTEGER DEFAULT 0,
    questions_goal INTEGER DEFAULT 10,
    questions_answered INTEGER DEFAULT 0,
    time_goal_minutes INTEGER DEFAULT 15,
    time_spent_minutes INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 2. Leagues/Divisions System
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legend'
    tier INTEGER NOT NULL, -- 1-7
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    min_xp_weekly INTEGER NOT NULL, -- XP needed to promote
    demotion_threshold INTEGER NOT NULL, -- XP below which you demote
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id),
    week_start DATE NOT NULL,
    week_xp INTEGER DEFAULT 0,
    rank_in_league INTEGER,
    promotion_zone BOOLEAN DEFAULT false,
    demotion_zone BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- 3. Achievements/Quests System
CREATE TABLE daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_type TEXT NOT NULL, -- 'complete_quiz', 'earn_xp', 'maintain_streak', 'perfect_score'
    quest_title TEXT NOT NULL,
    quest_description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    xp_reward INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gems/Currency System (for streak freezes, power-ups)
CREATE TABLE user_currency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gems INTEGER DEFAULT 0,
    lifetime_gems_earned INTEGER DEFAULT 0,
    last_free_gems_claimed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE gem_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned', 'spent', 'purchased'
    source TEXT NOT NULL, -- 'daily_goal', 'streak_milestone', 'badge', 'purchase', 'streak_freeze'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Power-ups/Items Shop
CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'streak_freeze', 'xp_boost', 'hint'
    gem_cost INTEGER NOT NULL,
    duration_hours INTEGER, -- for timed items like XP boost
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id),
    quantity INTEGER DEFAULT 1,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Learning Sessions (for accurate time tracking)
CREATE TABLE learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL, -- 'quiz', 'notes', 'flashcards', 'practice'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    xp_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
```

### Enhancements to Existing Tables

```sql
-- Add to user_gamification
ALTER TABLE user_gamification ADD COLUMN IF NOT EXISTS
    daily_goal_xp INTEGER DEFAULT 50,
    daily_goal_streak INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 0,
    current_league_id UUID REFERENCES leagues(id),
    xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
    xp_multiplier_expires_at TIMESTAMPTZ;

-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    sound_enabled BOOLEAN DEFAULT true,
    animation_reduced BOOLEAN DEFAULT false,
    celebration_intensity TEXT DEFAULT 'normal'; -- 'minimal', 'normal', 'maximum'
```

---

## 🎨 UI Components Implementation

### Phase 1: Core Animation Components

#### 1.1 XP Gain Overlay
```typescript
// src/components/gamification/xp-gain-overlay.tsx
/**
 * Floating +XP animation that appears when XP is earned
 * - Floats upward from interaction point
 * - Fades out with scale animation
 * - Plays satisfying "ding" sound
 */
```

#### 1.2 Level Up Modal
```typescript
// src/components/gamification/level-up-modal.tsx
/**
 * Full-screen celebration when user levels up
 * - Confetti explosion
 * - Level number animates with spring physics
 * - New title/rank revealed
 * - Sound: Fanfare + level up jingle
 */
```

#### 1.3 Badge Unlock Animation
```typescript
// src/components/gamification/badge-unlock.tsx
/**
 * Badge reveal animation
 * - Badge starts gray/hidden
 * - Golden glow reveals badge
 * - Badge "stamps" into place
 * - Sound: Achievement unlock
 */
```

#### 1.4 Streak Celebration
```typescript
// src/components/gamification/streak-celebration.tsx
/**
 * Milestone streak celebrations (3, 7, 14, 30, 100 days)
 * - Fire emoji burst
 * - Streak counter animates
 * - Special sound for each milestone tier
 */
```

### Phase 2: Dashboard Components

#### 2.1 Animated XP Progress Bar
```typescript
// src/components/gamification/animated-xp-bar.tsx
/**
 * Enhanced progress bar with:
 * - Smooth fill animation
 * - Glow effect when near level-up
 * - Pulse animation at milestones
 * - Real-time XP counter
 */
```

#### 2.2 Daily Goal Widget
```typescript
// src/components/gamification/daily-goal-widget.tsx
/**
 * Duolingo-style daily goal ring
 * - Circular progress indicator
 * - XP counter in center
 * - Celebration when completed
 * - Streak protection indicator
 */
```

#### 2.3 League Card
```typescript
// src/components/gamification/league-card.tsx
/**
 * Weekly league standing card
 * - Current league badge/icon
 * - Rank within league
 * - Progress to promotion/demotion zones
 * - Time remaining in week
 */
```

#### 2.4 Live Leaderboard
```typescript
// src/components/gamification/live-leaderboard.tsx
/**
 * Real-time updating leaderboard
 * - Animated rank changes
 * - Highlight when user overtakes someone
 * - Smooth scroll to user position
 * - Live XP counters
 */
```

### Phase 3: Notification/Toast System

#### 3.1 Achievement Toast
```typescript
// src/components/gamification/achievement-toast.tsx
/**
 * Slide-in toast for achievements
 * - Badge icon with glow
 * - Title and description
 * - XP reward shown
 * - Auto-dismiss with progress bar
 */
```

#### 3.2 Streak Reminder Toast
```typescript
// src/components/gamification/streak-reminder.tsx
/**
 * Urgent notification for streak at risk
 * - Fire icon animation
 * - Countdown to streak loss
 * - Quick action button
 */
```

---

## 🔊 Sound Design System

### Sound Categories

```typescript
// src/lib/sounds/sound-manager.ts

export const SOUND_EFFECTS = {
  // XP Sounds
  xp_gain_small: '/sounds/xp-ding.mp3',      // +5-20 XP
  xp_gain_medium: '/sounds/xp-chime.mp3',    // +21-50 XP
  xp_gain_large: '/sounds/xp-fanfare.mp3',   // +50+ XP
  
  // Level Sounds
  level_up: '/sounds/level-up.mp3',
  level_milestone: '/sounds/level-milestone.mp3', // Every 10 levels
  
  // Streak Sounds
  streak_continue: '/sounds/streak-flame.mp3',
  streak_milestone: '/sounds/streak-achievement.mp3',
  streak_lost: '/sounds/streak-lost.mp3',
  streak_freeze_used: '/sounds/freeze-crack.mp3',
  
  // Badge Sounds
  badge_common: '/sounds/badge-unlock.mp3',
  badge_rare: '/sounds/badge-rare.mp3',
  badge_legendary: '/sounds/badge-legendary.mp3',
  
  // Quiz Sounds
  answer_correct: '/sounds/correct.mp3',
  answer_incorrect: '/sounds/incorrect.mp3',
  quiz_complete: '/sounds/quiz-complete.mp3',
  perfect_score: '/sounds/perfect.mp3',
  
  // UI Sounds
  button_click: '/sounds/click.mp3',
  navigation: '/sounds/whoosh.mp3',
  notification: '/sounds/notification.mp3',
  
  // Daily Goals
  goal_progress: '/sounds/goal-tick.mp3',
  goal_complete: '/sounds/goal-complete.mp3',
  
  // Leaderboard
  rank_up: '/sounds/rank-up.mp3',
  rank_down: '/sounds/rank-down.mp3',
  promotion: '/sounds/promotion-fanfare.mp3',
};
```

### Sound Manager Implementation

```typescript
// src/lib/sounds/sound-manager.ts
import { Howl, Howler } from 'howler';

class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  init() {
    // Preload critical sounds
    this.preload(['xp_gain_small', 'answer_correct', 'answer_incorrect']);
  }

  play(soundKey: string, options?: { volume?: number }) {
    if (!this.enabled) return;
    // Play sound with optional volume override
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }
}

export const soundManager = new SoundManager();
```

---

## 🎬 Animation Specifications

### XP Gain Animation
```typescript
const xpGainVariants = {
  initial: { 
    opacity: 0, 
    y: 0, 
    scale: 0.5 
  },
  animate: { 
    opacity: [0, 1, 1, 0],
    y: [0, -20, -40, -60],
    scale: [0.5, 1.2, 1, 0.8],
    transition: {
      duration: 1.5,
      ease: "easeOut"
    }
  }
};
```

### Level Up Animation
```typescript
const levelUpVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: { 
    scale: 1, 
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  }
};
```

### Badge Unlock Animation
```typescript
const badgeRevealVariants = {
  hidden: { 
    scale: 0, 
    opacity: 0,
    filter: "grayscale(100%)"
  },
  visible: { 
    scale: [0, 1.3, 1],
    opacity: 1,
    filter: "grayscale(0%)",
    transition: {
      duration: 0.8,
      times: [0, 0.6, 1]
    }
  }
};
```

---

## 📁 File Structure

```
src/
├── components/
│   └── gamification/
│       ├── animations/
│       │   ├── xp-gain-overlay.tsx        # Floating XP animation
│       │   ├── level-up-modal.tsx         # Level up celebration
│       │   ├── badge-unlock-modal.tsx     # Badge reveal
│       │   ├── streak-celebration.tsx     # Streak milestone
│       │   └── confetti-burst.tsx         # Reusable confetti
│       ├── widgets/
│       │   ├── daily-goal-ring.tsx        # Circular daily progress
│       │   ├── streak-counter.tsx         # Animated streak display
│       │   ├── league-badge.tsx           # Current league indicator
│       │   └── xp-mini-bar.tsx            # Compact XP bar
│       ├── dashboard/
│       │   ├── gamification-hub.tsx       # Main dashboard section
│       │   ├── achievements-grid.tsx      # Badge collection view
│       │   ├── leaderboard-card.tsx       # League leaderboard
│       │   └── daily-quests.tsx           # Quest list
│       ├── toasts/
│       │   ├── achievement-toast.tsx      # Badge earned toast
│       │   ├── xp-toast.tsx               # XP gained toast
│       │   └── streak-warning.tsx         # Streak at risk toast
│       └── index.ts                        # Barrel exports
├── lib/
│   └── gamification/
│       ├── stores/
│       │   ├── gamification-store.ts      # Zustand store
│       │   └── sound-preferences.ts       # Sound settings
│       ├── hooks/
│       │   ├── use-xp-animation.ts        # XP animation trigger
│       │   ├── use-celebration.ts         # Celebration effects
│       │   └── use-sound.ts               # Sound playback
│       ├── services/
│       │   ├── daily-goals-service.ts     # Daily goals logic
│       │   ├── league-service.ts          # Leagues/rankings
│       │   ├── quest-service.ts           # Daily quests
│       │   └── gem-service.ts             # Currency management
│       └── constants/
│           ├── xp-values.ts               # XP reward amounts
│           ├── league-tiers.ts            # League definitions
│           └── badge-definitions.ts       # Badge requirements
├── contexts/
│   └── GamificationContext.tsx            # Global provider
└── public/
    └── sounds/
        ├── xp-ding.mp3
        ├── level-up.mp3
        ├── badge-unlock.mp3
        └── ... (all sound files)
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Priority: HIGH**

| Task | Description | Estimate |
|------|-------------|----------|
| Install dependencies | Framer Motion, Howler.js, Zustand | 1 hour |
| Create Zustand store | Global gamification state | 4 hours |
| Sound manager setup | Howler.js configuration | 4 hours |
| Basic XP animation | Floating +XP overlay | 6 hours |
| Sound effects integration | Connect sounds to actions | 4 hours |

**Deliverables:**
- [ ] Working XP gain animation with sound
- [ ] Global gamification state management
- [ ] Sound toggle in settings

### Phase 2: Celebrations (Week 3-4)
**Priority: HIGH**

| Task | Description | Estimate |
|------|-------------|----------|
| Level up modal | Full celebration screen | 8 hours |
| Badge unlock animation | Reveal animation | 6 hours |
| Streak celebrations | Milestone animations | 6 hours |
| Confetti system | Reusable confetti component | 4 hours |
| Toast notifications | Achievement toasts | 6 hours |

**Deliverables:**
- [ ] Level up celebration with confetti
- [ ] Badge unlock reveal
- [ ] Streak milestone celebrations
- [ ] Toast notification system

### Phase 3: Daily Engagement (Week 5-6)
**Priority: MEDIUM**

| Task | Description | Estimate |
|------|-------------|----------|
| Database migrations | New tables for goals, quests | 4 hours |
| Daily goals service | Goal tracking backend | 8 hours |
| Daily goal widget | Circular progress UI | 6 hours |
| Daily quests system | Quest generation + UI | 12 hours |

**Deliverables:**
- [ ] Daily XP goals with visual progress
- [ ] Daily quest system (3 quests/day)
- [ ] Goal completion celebrations

### Phase 4: Competition (Week 7-8)
**Priority: MEDIUM**

| Task | Description | Estimate |
|------|-------------|----------|
| League database setup | Tiers and rankings | 4 hours |
| League service | Promotion/demotion logic | 8 hours |
| Live leaderboard | Real-time updates | 10 hours |
| League UI components | Badges, rankings, animations | 8 hours |

**Deliverables:**
- [ ] 7-tier league system
- [ ] Weekly competitions
- [ ] Animated rank changes
- [ ] Promotion/demotion celebrations

### Phase 5: Economy (Week 9-10)
**Priority: LOW**

| Task | Description | Estimate |
|------|-------------|----------|
| Gems system | Currency earning + spending | 8 hours |
| Shop interface | Item purchase UI | 8 hours |
| Streak freeze purchase | Premium protection | 4 hours |
| XP boost items | Timed multipliers | 6 hours |

**Deliverables:**
- [ ] Gem currency system
- [ ] Item shop
- [ ] Streak freezes purchasable
- [ ] XP boost power-ups

### Phase 6: Polish (Week 11-12)
**Priority: LOW**

| Task | Description | Estimate |
|------|-------------|----------|
| Accessibility | Reduced motion support | 4 hours |
| Performance optimization | Animation performance | 4 hours |
| Sound balancing | Volume levels, timing | 4 hours |
| Mobile optimization | Touch interactions | 6 hours |
| A/B testing setup | Feature flags | 4 hours |

---

## 📊 XP Value System

### Activity XP Rewards

| Activity | Base XP | Bonus Conditions |
|----------|---------|------------------|
| Complete Quiz | 20-50 | +10 for 80%+, +20 for 100% |
| Read Notes | 5-15 | +5 for completing section |
| Flashcard Session | 10-20 | +10 for full deck |
| Daily Goal Complete | 10 | Fixed bonus |
| Quest Complete | 15-50 | Varies by quest |
| Streak Day | 5 | +1 per day (caps at 10) |
| First of Day | 10 | First activity bonus |
| Perfect Week | 100 | 7-day streak + all goals |

### Level Progression

| Level Range | XP per Level | Title |
|-------------|--------------|-------|
| 1-5 | 100 | Beginner |
| 6-10 | 150 | Learner |
| 11-20 | 200 | Student |
| 21-30 | 300 | Scholar |
| 31-50 | 400 | Expert |
| 51-75 | 500 | Master |
| 76-100 | 750 | Grandmaster |
| 100+ | 1000 | Legend |

---

## 🏆 League System

### Tier Structure

| Tier | Name | Icon | Weekly XP Required | Promotion | Demotion |
|------|------|------|-------------------|-----------|----------|
| 1 | Bronze | 🥉 | 0 | Top 20% | N/A |
| 2 | Silver | 🥈 | 100 | Top 20% | Bottom 20% |
| 3 | Gold | 🥇 | 250 | Top 15% | Bottom 25% |
| 4 | Platinum | 💎 | 500 | Top 15% | Bottom 25% |
| 5 | Diamond | 💠 | 1000 | Top 10% | Bottom 20% |
| 6 | Master | 👑 | 2000 | Top 10% | Bottom 15% |
| 7 | Legend | 🏆 | 5000 | N/A | Bottom 10% |

### Weekly Reset
- Resets every **Sunday at midnight UTC**
- Top performers promoted to next tier
- Bottom performers demoted
- XP count resets to 0
- All users placed in new groups of 30

---

## 🎯 Daily Goals System

### Goal Types

```typescript
interface DailyGoal {
  type: 'xp' | 'questions' | 'time' | 'streak';
  target: number;
  current: number;
  xpReward: number;
}

// Default daily goals
const DEFAULT_GOALS = {
  xp: { target: 50, reward: 10 },        // Earn 50 XP
  questions: { target: 10, reward: 10 }, // Answer 10 questions
  time: { target: 15, reward: 10 },      // Study 15 minutes
};
```

### Goal Difficulty Options
Users can choose their daily commitment:
- **Casual:** 20 XP, 5 questions, 10 minutes
- **Regular:** 50 XP, 10 questions, 15 minutes (default)
- **Serious:** 100 XP, 20 questions, 30 minutes
- **Intense:** 200 XP, 50 questions, 60 minutes

---

## ⚙️ User Preferences

```typescript
interface GamificationPreferences {
  // Sound settings
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  
  // Animation settings
  animationsEnabled: boolean;
  reducedMotion: boolean;
  celebrationIntensity: 'minimal' | 'normal' | 'maximum';
  
  // Notification settings
  streakReminders: boolean;
  dailyGoalReminders: boolean;
  leaderboardUpdates: boolean;
  
  // Privacy
  showOnLeaderboard: boolean;
  shareProgress: boolean;
  
  // Goals
  dailyGoalDifficulty: 'casual' | 'regular' | 'serious' | 'intense';
}
```

---

## 📱 Mobile Considerations

### Touch Interactions
- Tap animations on buttons
- Swipe to dismiss toasts
- Pull-to-refresh leaderboard
- Haptic feedback on achievements (native apps)

### Performance
- Lazy load celebration components
- Debounce rapid XP gains
- Use `will-change` for animated elements
- Reduce particle count on low-end devices

---

## 🔒 Anti-Cheat Measures

### XP Validation
- Server-side XP calculation
- Rate limiting on XP gains
- Maximum daily XP cap (prevents grinding exploits)
- Quiz answer validation

### Streak Protection
- Server timestamps only (no client manipulation)
- Timezone-aware calculations
- Grace period for timezone travelers

---

## 📈 Analytics & Metrics

### Key Metrics to Track

| Metric | Description |
|--------|-------------|
| DAU/MAU | Daily/Monthly active users |
| Streak retention | % users maintaining 7+ day streaks |
| Goal completion rate | % users completing daily goals |
| League participation | % users in each tier |
| XP velocity | Average XP earned per session |
| Sound toggle rate | % users with sound enabled |
| Animation preferences | Distribution of celebration settings |

### Events to Track
- `xp_earned` - Every XP gain
- `level_up` - Level progression
- `badge_earned` - Badge unlocks
- `streak_milestone` - Streak achievements
- `goal_completed` - Daily goal completion
- `league_promoted` / `league_demoted`
- `sound_toggled` - Sound preference changes

---

## 🎨 Design Tokens

### Colors

```css
/* Gamification Color Palette */
:root {
  /* XP Colors */
  --xp-primary: #FFD700;
  --xp-secondary: #FFA500;
  --xp-glow: rgba(255, 215, 0, 0.5);
  
  /* Streak Colors */
  --streak-flame: #FF6B35;
  --streak-hot: #FF4500;
  --streak-legendary: #9400D3;
  
  /* League Colors */
  --league-bronze: #CD7F32;
  --league-silver: #C0C0C0;
  --league-gold: #FFD700;
  --league-platinum: #E5E4E2;
  --league-diamond: #B9F2FF;
  --league-master: #9B59B6;
  --league-legend: #FF1493;
  
  /* Badge Rarity */
  --badge-common: #9CA3AF;
  --badge-uncommon: #10B981;
  --badge-rare: #3B82F6;
  --badge-epic: #8B5CF6;
  --badge-legendary: #F59E0B;
}
```

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] XP gains show animated overlay
- [ ] Sound plays on XP earn
- [ ] Settings allow toggling sounds/animations
- [ ] State persists across page navigation

### Phase 2 Complete When:
- [ ] Level ups trigger full celebration
- [ ] Badge unlocks have reveal animation
- [ ] Streak milestones celebrate appropriately
- [ ] Toast system works for all achievement types

### Phase 3 Complete When:
- [ ] Daily goals visible on dashboard
- [ ] Progress updates in real-time
- [ ] Goal completion triggers celebration
- [ ] Goals reset at midnight user time

### Phase 4 Complete When:
- [ ] Users assigned to leagues
- [ ] Leaderboard updates live
- [ ] Weekly promotions/demotions work
- [ ] League badges display correctly

### Full System Complete When:
- [ ] All phases functional
- [ ] Performance acceptable (< 100ms animations)
- [ ] Accessibility compliant
- [ ] Mobile-friendly
- [ ] Sound balanced and non-intrusive
- [ ] User retention metrics improve

---

## 🔗 Dependencies to Install

```bash
# Required
npm install framer-motion howler zustand

# Already Installed (verify)
npm list canvas-confetti  # Should show ^1.9.3

# Types (if needed)
npm install -D @types/howler
```

---

## 📚 References

- [Duolingo Gamification Case Study](https://yukaichou.com/gamification-examples/duolingo-gamification/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Howler.js Documentation](https://howlerjs.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Game Sound Design Principles](https://www.gamedesigning.org/learn/video-game-sound-design/)

---

## 📝 Notes

1. **Start with Phase 1 & 2** - These provide the most immediate user impact
2. **Sound files needed** - Source or create ~20 sound effects
3. **Test on mobile early** - Animations can be heavy on mobile
4. **A/B test celebrations** - Some users may find them distracting
5. **Consider premium features** - Gems/shop can be monetization opportunity

---

*Document Version: 1.0*  
*Created: January 2025*  
*Last Updated: January 2025*
