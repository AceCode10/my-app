-- ============================================
-- IGCSE Simplified - Seed Data
-- Sample data for testing and development
-- ============================================

-- Insert sample subjects
INSERT INTO subjects (id, name, code, slug, level, exam_board, description) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Mathematics', 'MATH-0580', 'mathematics', 'IGCSE', 'Cambridge', 'IGCSE Mathematics covering algebra, geometry, statistics, and calculus'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Physics', 'PHYS-0625', 'physics', 'IGCSE', 'Cambridge', 'IGCSE Physics covering mechanics, electricity, waves, and modern physics'),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Chemistry', 'CHEM-0620', 'chemistry', 'IGCSE', 'Cambridge', 'IGCSE Chemistry covering atomic structure, bonding, reactions, and organic chemistry'),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Biology', 'BIO-0610', 'biology', 'IGCSE', 'Cambridge', 'IGCSE Biology covering cells, genetics, ecology, and human biology'),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'English Language', 'ENG-0500', 'english-language', 'IGCSE', 'Cambridge', 'IGCSE English Language focusing on reading, writing, and comprehension')
ON CONFLICT (id) DO NOTHING;

-- Insert sample topics for Mathematics
INSERT INTO topics (id, subject_id, name, slug, ordering, description) VALUES
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Algebra', 'algebra', 1, 'Algebraic expressions, equations, and inequalities'),
  ('a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Geometry', 'geometry', 2, 'Shapes, angles, circles, and transformations'),
  ('b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Statistics', 'statistics', 3, 'Data handling, probability, and statistical analysis'),
  ('c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Calculus', 'calculus', 4, 'Differentiation and integration basics')
ON CONFLICT (subject_id, slug) DO NOTHING;

-- Insert sample topics for Physics
INSERT INTO topics (id, subject_id, name, slug, ordering, description) VALUES
  ('d0e1f2a3-b4c5-3d4e-7f8a-9b0c1d2e3f4a', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Mechanics', 'mechanics', 1, 'Forces, motion, energy, and momentum'),
  ('e1f2a3b4-c5d6-4e5f-8a9b-0c1d2e3f4a5b', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Electricity', 'electricity', 2, 'Current, voltage, resistance, and circuits'),
  ('f2a3b4c5-d6e7-5f6a-9b0c-1d2e3f4a5b6c', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Waves', 'waves', 3, 'Wave properties, sound, and light')
ON CONFLICT (subject_id, slug) DO NOTHING;

-- Insert sample notes for Mathematics - Algebra
INSERT INTO notes (id, topic_id, subject_id, title, subtitle, slug, content_md, visibility, is_downloadable, tags) VALUES
  (
    'a3b4c5d6-e7f8-6a7b-0c1d-2e3f4a5b6c7d',
    'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Introduction to Algebraic Expressions',
    'Understanding variables, constants, and basic operations',
    'intro-algebraic-expressions',
    '# Introduction to Algebraic Expressions

## What is Algebra?

Algebra is a branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations.

## Key Concepts

### Variables
A **variable** is a symbol (usually a letter) that represents an unknown value.
- Example: In the expression `x + 5`, `x` is a variable

### Constants
A **constant** is a fixed value that does not change.
- Example: In the expression `x + 5`, `5` is a constant

### Coefficients
A **coefficient** is a number multiplied by a variable.
- Example: In `3x`, `3` is the coefficient

## Basic Operations

### Addition and Subtraction
- Like terms can be combined: `2x + 3x = 5x`
- Unlike terms cannot be combined: `2x + 3y` stays as is

### Multiplication
- Multiply coefficients and add exponents: `2x × 3x = 6x²`

### Division
- Divide coefficients and subtract exponents: `6x³ ÷ 2x = 3x²`

## Practice Problems

1. Simplify: `4x + 2x - x`
2. Simplify: `3(2x + 1)`
3. Simplify: `5x² × 2x`

## Answers
1. `5x`
2. `6x + 3`
3. `10x³`',
    'public',
    true,
    ARRAY['algebra', 'expressions', 'basics']
  ),
  (
    'b4c5d6e7-f8a9-7b8c-1d2e-3f4a5b6c7d8e',
    'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Solving Linear Equations',
    'Step-by-step guide to solving equations with one variable',
    'solving-linear-equations',
    '# Solving Linear Equations

## What is a Linear Equation?

A linear equation is an equation where the highest power of the variable is 1.
- Example: `2x + 5 = 13`

## Steps to Solve

### Step 1: Isolate the variable term
Move all terms with the variable to one side and constants to the other.

**Example:** `2x + 5 = 13`
- Subtract 5 from both sides: `2x = 8`

### Step 2: Solve for the variable
Divide or multiply to get the variable alone.

**Example:** `2x = 8`
- Divide both sides by 2: `x = 4`

## More Examples

### Example 1
Solve: `3x - 7 = 14`

**Solution:**
1. Add 7 to both sides: `3x = 21`
2. Divide by 3: `x = 7`

### Example 2
Solve: `5(x + 2) = 25`

**Solution:**
1. Expand: `5x + 10 = 25`
2. Subtract 10: `5x = 15`
3. Divide by 5: `x = 3`

## Practice Problems

1. Solve: `4x + 8 = 20`
2. Solve: `2(x - 3) = 10`
3. Solve: `7x - 5 = 2x + 15`

## Answers
1. `x = 3`
2. `x = 8`
3. `x = 4`',
    'registered',
    true,
    ARRAY['algebra', 'equations', 'linear']
  )
ON CONFLICT (subject_id, topic_id, slug) DO NOTHING;

-- Insert sample notes for Physics - Mechanics
INSERT INTO notes (id, topic_id, subject_id, title, subtitle, slug, content_md, visibility, is_downloadable, tags) VALUES
  (
    'c5d6e7f8-a9b0-8c9d-2e3f-4a5b6c7d8e9f',
    'd0e1f2a3-b4c5-3d4e-7f8a-9b0c1d2e3f4a',
    'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    'Newton''s Laws of Motion',
    'Understanding the three fundamental laws of motion',
    'newtons-laws-motion',
    '# Newton''s Laws of Motion

## First Law: Law of Inertia

**Statement:** An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction unless acted upon by an external force.

**Key Points:**
- Objects resist changes in their state of motion
- This resistance is called **inertia**
- Mass is a measure of inertia

**Example:** A book on a table stays at rest until you push it.

## Second Law: F = ma

**Statement:** The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.

**Formula:** `F = ma`
- F = Force (Newtons, N)
- m = mass (kilograms, kg)
- a = acceleration (m/s²)

**Example:** Pushing a shopping cart - the harder you push (more force), the faster it accelerates.

## Third Law: Action-Reaction

**Statement:** For every action, there is an equal and opposite reaction.

**Key Points:**
- Forces always come in pairs
- Action and reaction forces act on different objects
- They are equal in magnitude but opposite in direction

**Example:** When you jump, you push down on the ground (action), and the ground pushes you up (reaction).

## Practice Problems

1. Calculate the force needed to accelerate a 10 kg object at 5 m/s²
2. If a 2000 N force acts on a 500 kg car, what is its acceleration?
3. Explain why a rocket can move in space where there is no air

## Answers
1. F = ma = 10 × 5 = 50 N
2. a = F/m = 2000/500 = 4 m/s²
3. The rocket expels gas backward (action), and the gas pushes the rocket forward (reaction)',
    'public',
    true,
    ARRAY['mechanics', 'forces', 'newton', 'motion']
  )
ON CONFLICT (subject_id, topic_id, slug) DO NOTHING;

-- Insert sample badges
INSERT INTO badges (id, name, description, icon_url, criteria) VALUES
  ('badge-001', 'First Steps', 'Complete your first quiz', '/badges/first-steps.svg', '{"type": "quiz_complete", "count": 1}'),
  ('badge-002', 'Week Warrior', 'Maintain a 7-day streak', '/badges/week-warrior.svg', '{"type": "streak", "days": 7}'),
  ('badge-003', 'Century Club', 'Earn 100 XP', '/badges/century-club.svg', '{"type": "xp", "amount": 100}'),
  ('badge-004', 'Knowledge Seeker', 'Read 10 notes', '/badges/knowledge-seeker.svg', '{"type": "notes_read", "count": 10}'),
  ('badge-005', 'Perfect Score', 'Get 100% on any quiz', '/badges/perfect-score.svg', '{"type": "quiz_score", "percentage": 100}')
ON CONFLICT (name) DO NOTHING;

-- Update published_at for public notes
UPDATE notes 
SET published_at = created_at 
WHERE visibility = 'public' AND published_at IS NULL;

-- Verification queries
SELECT 'Subjects inserted:' as info, COUNT(*) as count FROM subjects;
SELECT 'Topics inserted:' as info, COUNT(*) as count FROM topics;
SELECT 'Notes inserted:' as info, COUNT(*) as count FROM notes;
SELECT 'Badges inserted:' as info, COUNT(*) as count FROM badges;
