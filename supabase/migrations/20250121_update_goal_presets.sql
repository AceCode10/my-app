-- Update goal presets with balanced XP targets
-- Default casual goal is now 25 XP (was 20)

UPDATE goal_presets SET
  xp_target = 25,
  xp_bonus = 5
WHERE difficulty = 'casual';

UPDATE goal_presets SET
  xp_target = 50,
  xp_bonus = 10
WHERE difficulty = 'regular';

UPDATE goal_presets SET
  xp_target = 75,
  questions_target = 15,
  xp_bonus = 15
WHERE difficulty = 'serious';

UPDATE goal_presets SET
  xp_target = 100,
  questions_target = 25,
  xp_bonus = 25
WHERE difficulty = 'intense';
