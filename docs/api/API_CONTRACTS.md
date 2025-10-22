# API Contracts & Endpoints

## Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://igcse-simplified.vercel.app/api`

## Authentication
All protected endpoints require JWT token in cookie (handled by Supabase middleware).

---

## 1. Authentication Endpoints

### POST /api/auth/signup
Create new user account.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "display_name": "John Doe",
    "role": "student"
  }
}
```

---

### POST /api/auth/login
Authenticate user.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "role": "student"
  },
  "session": {
    "access_token": "jwt...",
    "refresh_token": "jwt..."
  }
}
```

---

## 2. Subject & Topic Endpoints

### GET /api/subjects
List all subjects (public).

**Query Params:**
- `level` (optional): Filter by level (IGCSE, A-Level)
- `exam_board` (optional): Filter by exam board

**Response (200):**
```json
{
  "subjects": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "code": "MATH",
      "slug": "mathematics",
      "level": "IGCSE",
      "exam_board": "Cambridge",
      "icon_url": "https://..."
    }
  ]
}
```

---

### GET /api/subjects/:slug/topics
Get topic hierarchy for subject.

**Response (200):**
```json
{
  "topics": [
    {
      "id": "uuid",
      "name": "Algebra",
      "slug": "algebra",
      "parent_topic_id": null,
      "ordering": 1,
      "children": [
        {
          "id": "uuid",
          "name": "Linear Equations",
          "slug": "linear-equations",
          "parent_topic_id": "parent-uuid",
          "ordering": 1
        }
      ]
    }
  ]
}
```

---

## 3. Notes Endpoints

### GET /api/notes
List notes with filters.

**Query Params:**
- `topic_id` (required): Filter by topic
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page

**Response (200):**
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Introduction to Algebra",
      "subtitle": "Basic concepts",
      "slug": "intro-algebra",
      "visibility": "public",
      "view_count": 150,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### GET /api/notes/:id
Get full note content.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Introduction to Algebra",
  "content_md": "# Algebra Basics\n\n...",
  "rendered_html": "<h1>Algebra Basics</h1>...",
  "topic": {
    "id": "uuid",
    "name": "Algebra"
  },
  "subject": {
    "id": "uuid",
    "name": "Mathematics"
  },
  "is_downloadable": true,
  "tags": ["algebra", "basics"]
}
```

---

## 4. Question Bank Endpoints (Teacher/Admin)

### GET /api/questions/search
Search questions with filters.

**Auth:** Teacher, Admin  
**Query Params:**
- `subject_id` (optional)
- `topic_id` (optional)
- `difficulty` (optional): easy, medium, hard
- `question_type` (optional): mcq, tf, numeric, etc.
- `search` (optional): Full-text search
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "questions": [
    {
      "id": "uuid",
      "stem_md": "What is the value of x in 2x + 3 = 7?",
      "question_type": "numeric",
      "marks": 2,
      "difficulty": "easy",
      "tags": ["algebra", "equations"],
      "topic": { "name": "Linear Equations" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### GET /api/questions/:id
Get full question details.

**Auth:** Teacher, Admin

**Response (200):**
```json
{
  "id": "uuid",
  "stem_md": "What is the value of x?",
  "question_type": "numeric",
  "options": null,
  "correct_answer": { "value": 2, "tolerance": 0.1 },
  "marks": 2,
  "examiner_comment": "Apply basic algebra to isolate x",
  "difficulty": "easy",
  "media_refs": ["https://storage.../diagram.png"],
  "tags": ["algebra"]
}
```

---

### POST /api/admin/questions
Create new question (Admin only).

**Auth:** Admin, Content Moderator

**Request:**
```json
{
  "subject_id": "uuid",
  "topic_id": "uuid",
  "question_type": "mcq",
  "stem_md": "What is 2 + 2?",
  "options": [
    { "id": "a", "text": "3" },
    { "id": "b", "text": "4" },
    { "id": "c", "text": "5" }
  ],
  "correct_answer": { "answer": "b" },
  "marks": 1,
  "examiner_comment": "Basic addition",
  "difficulty": "easy",
  "tags": ["arithmetic"]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "question_type": "mcq",
  "visibility": "draft",
  "created_at": "2025-10-22T15:00:00Z"
}
```

---

## 5. Class Management (Teacher)

### POST /api/classes
Create new class.

**Auth:** Teacher

**Request:**
```json
{
  "name": "Physics A - 2026",
  "subject_id": "uuid",
  "description": "IGCSE Physics class",
  "capacity": 30,
  "auto_approve": true
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Physics A - 2026",
  "join_code": "XJ7K9M",
  "teacher_id": "uuid",
  "created_at": "2025-10-22T15:00:00Z"
}
```

---

### GET /api/classes/my
Get teacher's classes.

**Auth:** Teacher

**Response (200):**
```json
{
  "classes": [
    {
      "id": "uuid",
      "name": "Physics A - 2026",
      "join_code": "XJ7K9M",
      "student_count": 25,
      "subject": { "name": "Physics" }
    }
  ]
}
```

---

### POST /api/classes/:id/join
Student joins class via code.

**Auth:** Student

**Request:**
```json
{
  "join_code": "XJ7K9M"
}
```

**Response (200):**
```json
{
  "enrollment": {
    "id": "uuid",
    "class_id": "uuid",
    "user_id": "uuid",
    "status": "active",
    "enrolled_at": "2025-10-22T15:00:00Z"
  }
}
```

---

## 6. Test Builder (Teacher)

### POST /api/tests
Create new test.

**Auth:** Teacher

**Request:**
```json
{
  "title": "Algebra Quiz 1",
  "description": "Covers linear equations",
  "sections": [
    {
      "title": "Multiple Choice",
      "questions": [
        { "id": "q-uuid-1", "marks": 1 },
        { "id": "q-uuid-2", "marks": 1 }
      ]
    },
    {
      "title": "Short Answer",
      "questions": [
        { "id": "q-uuid-3", "marks": 5 }
      ]
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Algebra Quiz 1",
  "total_marks": 7,
  "created_by": "teacher-uuid",
  "created_at": "2025-10-22T15:00:00Z"
}
```

---

### GET /api/tests/:id/pdf
Export test as PDF.

**Auth:** Teacher (creator)

**Response (200):**
- Content-Type: `application/pdf`
- Binary PDF data

---

## 7. Assignments (Teacher)

### POST /api/assignments
Assign test to class.

**Auth:** Teacher

**Request:**
```json
{
  "test_id": "uuid",
  "target_class_id": "uuid",
  "title": "Homework: Algebra Quiz",
  "instructions": "Complete by Friday",
  "due_at": "2025-10-25T23:59:59Z",
  "time_limit_minutes": 30,
  "allow_retakes": false,
  "release_answers_at": "after_due"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Homework: Algebra Quiz",
  "assigned_by": "teacher-uuid",
  "created_at": "2025-10-22T15:00:00Z"
}
```

---

### GET /api/assignments/my
Get student's assignments.

**Auth:** Student

**Response (200):**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "title": "Homework: Algebra Quiz",
      "due_at": "2025-10-25T23:59:59Z",
      "time_limit_minutes": 30,
      "status": "pending",
      "class": { "name": "Math A" },
      "attempts_count": 0,
      "max_attempts": 1
    }
  ]
}
```

---

## 8. Attempts (Student)

### POST /api/attempts/start
Start new attempt.

**Auth:** Student

**Request:**
```json
{
  "assignment_id": "uuid"
}
```

**Response (201):**
```json
{
  "attempt_id": "uuid",
  "started_at": "2025-10-22T15:00:00Z",
  "expires_at": "2025-10-22T15:30:00Z",
  "questions": [
    {
      "id": "q-uuid-1",
      "question_type": "mcq",
      "stem_md": "What is 2 + 2?",
      "options": [
        { "id": "a", "text": "3" },
        { "id": "b", "text": "4" }
      ],
      "marks": 1
    }
  ]
}
```

---

### PATCH /api/attempts/:id/autosave
Auto-save partial answers.

**Auth:** Student (owner)

**Request:**
```json
{
  "answers": {
    "q-uuid-1": { "answer": "b", "time_taken_seconds": 15 },
    "q-uuid-2": { "answer": "a", "time_taken_seconds": 30 }
  }
}
```

**Response (200):**
```json
{
  "saved_at": "2025-10-22T15:05:00Z"
}
```

---

### POST /api/attempts/:id/submit
Submit attempt for grading.

**Auth:** Student (owner)

**Request:**
```json
{
  "answers": {
    "q-uuid-1": { "answer": "b" },
    "q-uuid-2": { "answer": "a" },
    "q-uuid-3": { "text": "x = 2" }
  }
}
```

**Response (200):**
```json
{
  "attempt_id": "uuid",
  "status": "submitted",
  "submitted_at": "2025-10-22T15:25:00Z",
  "grading_status": "in_progress"
}
```

---

### GET /api/attempts/:id/result
Get graded attempt results.

**Auth:** Student (owner) or Teacher

**Response (200):**
```json
{
  "attempt_id": "uuid",
  "score": 6,
  "max_score": 7,
  "percentage": 85.7,
  "status": "graded",
  "grading_details": {
    "q-uuid-1": {
      "student_answer": "b",
      "correct": true,
      "marks_awarded": 1,
      "marks_possible": 1
    },
    "q-uuid-2": {
      "student_answer": "a",
      "correct": false,
      "marks_awarded": 0,
      "marks_possible": 1,
      "examiner_comment": "Review basic concepts"
    }
  },
  "submitted_at": "2025-10-22T15:25:00Z"
}
```

---

## 9. Leaderboard

### GET /api/leaderboard
Get global XP leaderboard.

**Response (200):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "uuid",
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "xp": 15420,
      "streak_days": 45
    },
    {
      "rank": 2,
      "user_id": "uuid",
      "display_name": "Jane Smith",
      "xp": 14850,
      "streak_days": 32
    }
  ],
  "my_rank": 15,
  "my_xp": 8500
}
```

---

## 10. Notifications

### GET /api/notifications
Get user notifications.

**Auth:** Authenticated

**Query Params:**
- `unread_only` (default: false)
- `limit` (default: 20)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "assignment_posted",
      "title": "New Assignment",
      "body": "Algebra Quiz has been assigned",
      "link_url": "/dashboard/assignments/uuid",
      "read_at": null,
      "created_at": "2025-10-22T14:00:00Z"
    }
  ],
  "unread_count": 3
}
```

---

### PATCH /api/notifications/:id/read
Mark notification as read.

**Auth:** Authenticated (owner)

**Response (200):**
```json
{
  "read_at": "2025-10-22T15:30:00Z"
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "request_id": "uuid"
}
```

---

## Rate Limiting

- **Anonymous:** 100 requests/hour
- **Authenticated:** 1000 requests/hour
- **Admin:** Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1698765432
```
