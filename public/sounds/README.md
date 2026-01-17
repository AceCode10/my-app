# Sound Effects for Gamification

This folder should contain the following audio files for the gamification system.

## Required Sound Files

### XP Sounds
- `xp-small.mp3` - Played for small XP gains (1-19 XP) - Light "ding" sound
- `xp-medium.mp3` - Played for medium XP gains (20-49 XP) - Pleasant chime
- `xp-large.mp3` - Played for large XP gains (50+ XP) - Triumphant sound

### Level Sounds
- `level-up.mp3` - Played when user levels up - Fanfare/celebration
- `level-milestone.mp3` - Played for milestone levels (10, 25, 50, etc.)

### Streak Sounds
- `streak-continue.mp3` - Played when maintaining streak
- `streak-milestone.mp3` - Played for streak milestones (7, 14, 30 days)
- `streak-lost.mp3` - Played when streak is lost (sad/gentle)
- `streak-freeze.mp3` - Played when streak freeze is used

### Badge Sounds
- `badge-common.mp3` - Common badge unlock
- `badge-rare.mp3` - Rare/epic badge unlock
- `badge-legendary.mp3` - Legendary badge unlock (more epic)

### Quiz Sounds
- `correct.mp3` - Correct answer (short, positive)
- `incorrect.mp3` - Incorrect answer (short, neutral)
- `quiz-complete.mp3` - Quiz completion
- `perfect-score.mp3` - 100% score achievement

### Presenter Mode Sounds
- `shh.mp3` - Quiet/shushing sound
- `bubbles.mp3` - Bubble popping sounds
- `confetti.mp3` - Celebration/party sound
- `drumroll.mp3` - Drum roll sound
- `applause.mp3` - Applause/clapping for curtain call
- `micdrop.mp3` - Mic drop sound effect

### UI Sounds
- `click.mp3` - Button click (subtle)
- `notification.mp3` - Toast notification
- `goal-complete.mp3` - Daily goal completed

## Recommended Specifications

- **Format**: MP3 (best cross-browser support)
- **Sample Rate**: 44.1kHz
- **Bit Rate**: 128kbps (good quality, small file size)
- **Duration**: 0.5-2 seconds for UI sounds, up to 3-4 seconds for celebrations
- **Volume**: Normalized to similar levels

## Free Sound Resources

You can find royalty-free game sounds at:
- [Freesound.org](https://freesound.org)
- [OpenGameArt.org](https://opengameart.org)
- [Mixkit.co](https://mixkit.co/free-sound-effects/game/)
- [Zapsplat.com](https://www.zapsplat.com)

## Usage

The sound manager will gracefully handle missing files - if a sound file doesn't exist, 
it will simply not play (no errors). This allows incremental addition of sounds.
