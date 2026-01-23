# XP System Testing Guide

## Current XP Rewards

### Topical Questions (Per Question)
- **Base XP**: 1 XP per question answered
- **Correct Answer Bonus**: +1 XP
- **Perfect Score (100%)**: +5 XP bonus
- **High Score (80%+)**: +2 XP bonus

**Example**: Answer 5 questions, get 3 correct
- Base: 5 XP (5 questions × 1)
- Correct bonus: 3 XP (3 correct × 1)
- **Total: 8 XP**

### Exam Papers (Per Paper)
- **Base XP**: 0.5 XP per question
- **Percentage Bonus**: 0.1 XP per percent scored
- **Completion Bonus**: +3 XP
- **Performance Bonuses**:
  - Perfect (100%): +10 XP
  - Excellent (80%+): +5 XP
  - Good (60%+): +2 XP

**Example**: Complete 20-question paper with 85% score
- Base: 10 XP (20 × 0.5)
- Percentage: 8.5 XP (85 × 0.1)
- Completion: 3 XP
- Excellent bonus: 5 XP
- **Total: 26.5 XP (rounded to 27)**

## How to Test

### 1. Check Console Logs
Open browser console (F12) and look for:
```
[QuizClient] Processing XP for question: ...
[RewardEngine] Processing activity: topical_question
[RewardEngine] Calculated XP: X Base: Y Bonuses: [...]
[RewardEngine] Awarding X XP to user ...
[RewardEngine] XP awarded successfully
[QuizClient] XP earned for this question: X
[QuizClient] Total XP so far: X
```

### 2. Visual Indicators

**During Quiz:**
- Toast notification appears after each question: "+X XP"
- Shows "Correct answer!" or "Good try!"

**After Quiz Completion:**
- Large XP display showing total earned
- Format: "⚡ +X XP" with yellow/orange gradient
- Message: "Added to your total"

### 3. Dashboard Updates
- Navigate to `/student` dashboard
- Check XP card updates in real-time
- Daily goals should reflect XP progress
- Leaderboard should update automatically

### 4. Database Verification

Run in Supabase SQL Editor:
```sql
-- Check user's total XP
SELECT user_id, total_xp, xp_level, current_streak
FROM user_gamification
WHERE user_id = 'YOUR_USER_ID';

-- Check recent XP transactions
SELECT *
FROM xp_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check daily goals progress
SELECT *
FROM daily_goals
WHERE user_id = 'YOUR_USER_ID'
AND date = CURRENT_DATE;
```

## Troubleshooting

### XP Not Showing
1. **Check console logs** - Look for errors in browser console
2. **Verify user is logged in** - XP only awarded to authenticated users
3. **Check migration applied** - Run `20250123_fix_xp_system_v2.sql` in Supabase
4. **Verify RPC functions exist**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name IN ('award_xp', 'update_streak', 'create_daily_goals');
   ```

### XP Not Persisting
1. Check `user_gamification` table has record for user
2. Verify RLS policies allow updates
3. Check for errors in `[RewardEngine]` console logs

### Dashboard Not Updating
1. Check browser console for `xp_earned` event dispatch
2. Verify real-time subscription is active
3. Refresh page manually to confirm XP was saved

## Expected Behavior

✅ **Correct:**
- XP awarded immediately after each question
- Toast notification shows XP earned
- Total XP accumulates during quiz
- Completion screen shows total XP earned
- Dashboard updates automatically
- Daily goals progress increases
- Leaderboard updates in real-time

❌ **Incorrect:**
- No XP shown during quiz
- Completion screen shows 0 XP
- Dashboard doesn't update
- Console shows errors

## Migration Status

**Required Migration**: `20250123_fix_xp_system_v2.sql`

**What it fixes:**
- `award_xp` function with proper parameters
- `update_streak` function with correct return type
- `create_daily_goals` function
- `update_daily_goals_difficulty` function
- Goal presets (Casual=25, Regular=50, Serious=75, Intense=100)

**To apply:**
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `20250123_fix_xp_system_v2.sql`
3. Click "Run"
4. Verify no errors

## Files Modified

| File | Purpose |
|------|---------|
| `src/components/quiz-client.tsx` | XP tracking, toast notifications, completion display |
| `src/lib/gamification/reward-engine.ts` | XP calculation, logging, fallbacks |
| `src/components/gamification/leaderboard.tsx` | Real-time updates |
| `src/hooks/use-gamification.ts` | XP event listeners |
| `supabase/migrations/20250123_fix_xp_system_v2.sql` | Database functions |

## Next Steps

1. **Test topical questions**: Take a quiz and verify XP shows
2. **Test exam papers**: Complete a paper and verify XP shows
3. **Check dashboard**: Verify XP updates automatically
4. **Check leaderboard**: Verify rank updates in real-time
5. **Test streak**: Complete activities on consecutive days
