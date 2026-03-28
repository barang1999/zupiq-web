# Zupiq Quiz System — AI Agent Implementation Guide

## 1. Purpose

This document defines a professional, scalable implementation plan for the **Zupiq Quiz System**.

The goal is to allow users to:

- generate quizzes from subjects/topics they already study in Zupiq
- choose a subject, level, and specific skill area to practice
- answer quizzes in-app or by uploading an image of their work
- receive AI-based grading, explanation, correction, and improvement feedback
- store scores, quiz history, and mastery progress in user data

This guide is written so an AI coding agent can follow it with minimal ambiguity.

---

## 2. Current Schema Review

The existing schema already provides a strong base:

- `users`
- `subjects`
- `topics`
- `lessons`
- `uploads`
- `chat_messages`
- `study_sessions`

### Existing strengths

- `subjects` and `topics` support quiz generation context
- `uploads` can support handwritten answer image submissions
- `study_sessions` can be used later for personalization and remediation
- `users` already stores education-level data

### Existing limitations

The current schema does **not** yet support:

- generated quizzes as first-class records
- per-question quiz storage
- quiz attempts and grading lifecycle
- answer-level evaluation
- score history and mastery tracking
- AI grading audit data

---

## 3. Product Scope

### Core experience

The Quiz page should let the user:

1. select a subject from saved subjects or learned content
2. select a topic or specific area to practice
3. select a level or difficulty
4. choose the quiz mode
5. generate a quiz with AI
6. answer the quiz
7. submit answers as text, choice selections, or uploaded images
8. receive evaluation, score, and feedback
9. save performance to user history

### Supported quiz modes

The system should support at least:

- `mcq`
- `short_answer`
- `numeric`
- `written`
- `mixed`

### Submission modes

The system should support:

- direct in-app answer submission
- answer-image submission for handwritten or worked solutions

---

## 4. Architectural Principles

Build this feature with the following principles:

### 4.1 Separate generation from evaluation

Do not mix quiz generation and quiz grading in one database record.

- `quiz` = what was generated
- `attempt` = what the user submitted
- `evaluation` = how the attempt was graded

### 4.2 Preserve raw data

Always store:

- the exact generated questions
- the expected answers or grading rubric
- the raw user answer
- the extracted text from uploaded images
- the AI grading output

This is critical for debugging, trust, and future model improvement.

### 4.3 Design for retries and versioning

AI output may fail or be improved later. The schema should support:

- regeneration of quizzes
- regrading an attempt
- storing grading version and model metadata

### 4.4 Keep identifiers relational

Use `subject_id` and `topic_id` instead of storing only free text subject names when possible.

### 4.5 Keep the first release simple

V1 should prioritize:

- stable generation
- stable grading
- stored history
- clear feedback

Do not overload V1 with advanced gamification.

---

## 5. Recommended Database Design

These tables should be added to the current Supabase Postgres schema.

---

## 5.1 `quizzes`

Represents a generated quiz template.

```sql
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects (id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES topics (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'medium',
  specific_area TEXT,
  quiz_mode TEXT NOT NULL DEFAULT 'mixed',
  question_count INTEGER NOT NULL DEFAULT 0,
  total_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  generation_prompt JSONB NOT NULL DEFAULT '{}',
  generation_context JSONB NOT NULL DEFAULT '{}',
  ai_model TEXT,
  ai_provider TEXT,
  ai_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes (user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON quizzes (subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON quizzes (topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes (created_at DESC);
```

---

## 5.2 `quiz_questions`

Stores each question belonging to a quiz.

```sql
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  instructions TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  expected_answer JSONB NOT NULL DEFAULT '{}',
  grading_rubric JSONB NOT NULL DEFAULT '{}',
  explanation TEXT,
  marks NUMERIC(8,2) NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (quiz_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type ON quiz_questions (question_type);
```

---

## 5.3 `quiz_attempts`

Represents one user attempt on a generated quiz.

```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  score NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  feedback_summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  improvement_areas JSONB NOT NULL DEFAULT '[]',
  ai_evaluation JSONB NOT NULL DEFAULT '{}',
  ai_model TEXT,
  ai_provider TEXT,
  ai_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts (status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts (created_at DESC);
```

---

## 5.4 `quiz_answers`

Stores answer-level data for an attempt.

```sql
CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_json JSONB NOT NULL DEFAULT '{}',
  answer_upload_id TEXT REFERENCES uploads (id) ON DELETE SET NULL,
  extracted_text TEXT,
  extraction_confidence NUMERIC(5,2),
  grading_confidence NUMERIC(5,2),
  is_correct BOOLEAN,
  awarded_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
  ai_feedback TEXT,
  correction TEXT,
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_upload_id ON quiz_answers (answer_upload_id);
```

---

## 5.5 `user_topic_mastery`

Tracks mastery over time.

```sql
CREATE TABLE IF NOT EXISTS user_topic_mastery (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects (id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics (id) ON DELETE CASCADE,
  level TEXT,
  mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  quizzes_taken INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_quiz_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, subject_id, topic_id, level)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_mastery_user_id ON user_topic_mastery (user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_mastery_subject_id ON user_topic_mastery (subject_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_mastery_topic_id ON user_topic_mastery (topic_id);
```

---

## 5.6 Optional `quiz_evaluation_events`

Recommended for auditability in a production system.

```sql
CREATE TABLE IF NOT EXISTS quiz_evaluation_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_evaluation_events_attempt_id
  ON quiz_evaluation_events (attempt_id);
```

Use this to store:

- generation response snapshots
- image extraction output
- grading output
- regrade events
- fallback logic results

---

## 6. Scalable Data Modeling Notes

### 6.1 Avoid storing only raw subject text

The current schema sometimes stores subject as free text, for example in `study_sessions.subject`. For quizzes, prefer:

- `subject_id`
- `topic_id`

You may still keep display text for resilience, but relational references should be primary.

### 6.2 Use JSONB only where flexibility matters

Good JSONB fields:

- `generation_prompt`
- `generation_context`
- `expected_answer`
- `grading_rubric`
- `ai_evaluation`
- `metadata`

Do not put core relational data inside JSONB.

### 6.3 Make grading deterministic where possible

For MCQ and numeric questions, use rule-based grading before AI grading. AI should be the fallback or explanation layer.

### 6.4 Support image submissions per question

Do not design uploads only at the attempt level. Some questions may need separate image uploads.

---

## 7. Backend Service Responsibilities

Split backend responsibilities into clear services.

### 7.1 Quiz generation service

Responsibilities:

- receive selected subject/topic/level/area
- build AI prompt from curriculum context
- request quiz JSON from the model
- validate returned structure
- persist quiz and questions

### 7.2 Quiz attempt service

Responsibilities:

- create attempt
- autosave answers
- finalize submission
- associate uploads to answers

### 7.3 Image analysis service

Responsibilities:

- read uploaded answer image
- extract student answer text or structured content
- return extraction confidence
- flag review if confidence is low

### 7.4 Grading service

Responsibilities:

- grade deterministic questions directly
- send written answers to AI with grading rubric
- compute total score
- generate strengths, weaknesses, and improvement areas
- persist evaluation results
- update mastery tracking

### 7.5 Progress analytics service

Responsibilities:

- compute per-topic performance trends
- compute mastery score updates
- generate “what to practice next” recommendations

---

## 8. API Design

Use stable REST endpoints or equivalent route handlers.

### 8.1 Quiz generation

`POST /api/quizzes/generate`

Request:

```json
{
  "subjectId": "sub_123",
  "topicId": "top_123",
  "level": "medium",
  "specificArea": "linear equations",
  "quizMode": "mixed",
  "questionCount": 8
}
```

Response:

```json
{
  "quizId": "quiz_123",
  "status": "active"
}
```

### 8.2 Get quiz

`GET /api/quizzes/:quizId`

Returns quiz metadata and ordered questions.

### 8.3 Start attempt

`POST /api/quizzes/:quizId/attempts`

Returns new attempt id.

### 8.4 Save answer

`POST /api/quiz-attempts/:attemptId/answers`

Request:

```json
{
  "questionId": "qq_1",
  "answerText": "x = 4",
  "answerJson": {}
}
```

### 8.5 Upload answer image

`POST /api/quiz-attempts/:attemptId/answers/:questionId/image`

Flow:

1. get signed upload URL
2. upload image to storage
3. create/update `quiz_answers.answer_upload_id`

### 8.6 Submit attempt

`POST /api/quiz-attempts/:attemptId/submit`

Marks attempt as submitted and queues grading.

### 8.7 Grade attempt

`POST /api/quiz-attempts/:attemptId/grade`

Can be synchronous in V1, but should be structured so it can move to async processing later.

### 8.8 Fetch result

`GET /api/quiz-attempts/:attemptId/result`

Returns:

- score
- per-question feedback
- summary
- strengths
- weaknesses
- improvement areas

### 8.9 Mastery overview

`GET /api/users/:userId/mastery`

Returns user skill status per subject/topic.

---

## 9. AI Contract Design

### 9.1 Quiz generation output must be strict JSON

Example:

```json
{
  "title": "Linear Equations Practice",
  "description": "Mixed quiz for algebra fundamentals",
  "questions": [
    {
      "order": 1,
      "type": "mcq",
      "text": "Solve 2x + 3 = 11",
      "instructions": "Choose the correct answer.",
      "options": ["x = 2", "x = 3", "x = 4", "x = 5"],
      "expectedAnswer": { "value": "x = 4" },
      "gradingRubric": {},
      "marks": 1,
      "difficulty": "easy",
      "explanation": "Subtract 3 from both sides, then divide by 2."
    }
  ]
}
```

### 9.2 Grading output must also be strict JSON

Example:

```json
{
  "score": 7,
  "totalMarks": 10,
  "percentage": 70,
  "feedbackSummary": "Good grasp of basics, but multi-step reasoning needs work.",
  "strengths": ["basic equation solving"],
  "weaknesses": ["sign handling", "multi-step word problems"],
  "improvementAreas": ["practice algebra translation", "show each step clearly"],
  "answers": [
    {
      "questionId": "qq_1",
      "isCorrect": true,
      "awardedMarks": 1,
      "gradingConfidence": 0.98,
      "feedback": "Correct.",
      "correction": null
    }
  ]
}
```

### 9.3 AI prompt construction should include

- user education level
- subject name
- topic name
- specific area
- selected level
- desired number of questions
- allowed question types
- language
- optionally past weak areas

---

## 10. Grading Strategy

### 10.1 Deterministic first, AI second

Recommended grading order:

1. MCQ, true/false, exact numeric: rule-based grading
2. structured short-answer: hybrid validation
3. written solution or image-based answer: AI grading using rubric

### 10.2 Confidence handling

For extracted or graded answers, store:

- `extraction_confidence`
- `grading_confidence`

If confidence is below threshold:

- set `review_required = true`
- return a user-friendly note like “Some handwriting may be unclear.”

### 10.3 Feedback expectations

Each graded answer should ideally return:

- whether correct or partially correct
- awarded marks
- what was wrong
- the correct answer or method
- area to improve

---

## 11. UI and UX Recommendations

### 11.1 Quiz setup page

Recommended controls:

- subject selector
- topic selector
- specific area text input or suggestion chips
- level selector
- number of questions
- quiz mode selector
- generate button

### 11.2 Quiz taking page

Recommended features:

- question progress indicator
- autosave
- one clear submit action
- optional image upload per question
- clear “typed answer” vs “upload answer” choice

### 11.3 Result page

Recommended sections:

- total score
- percentage
- strengths
- mistakes summary
- per-question review
- next recommended practice area

### 11.4 History page

Recommended items:

- quiz title
- subject/topic
- score
- date
- weak areas
- retry action

---

## 12. Suggested Implementation Phases

### Phase 1 — MVP

Ship first:

- quiz generation from subject/topic/level
- in-app answer submission
- grading and result storage
- quiz history

### Phase 2 — AI image grading

Add:

- per-question image upload
- OCR / vision extraction
- image-based grading
- extraction confidence

### Phase 3 — Mastery and recommendations

Add:

- mastery tracking
- weak-area suggestions
- adaptive quiz generation based on prior attempts

### Phase 4 — Advanced scale

Add later only if needed:

- quiz templates by curriculum
- teacher review mode
- shared classroom quiz assignment
- benchmarking across users

---

## 13. Engineering Notes for Scale

### 13.1 Use background jobs eventually

V1 can grade inline if response times are acceptable. For scale, move to a job queue for:

- generation
- image extraction
- grading
- mastery recomputation

### 13.2 Keep storage references small

Store uploaded image metadata in `uploads`; avoid bloating answer records with binary or long base64 data.

### 13.3 Add update timestamps consistently

Use `updated_at` on all mutable tables and keep them maintained through app logic or database triggers.

### 13.4 Add RLS before production rollout

Supabase Row Level Security should ensure users can only access:

- their quizzes
- their attempts
- their answers
- their mastery records

### 13.5 Validate all AI responses

Never trust model output directly. Validate:

- required fields
- allowed question types
- mark totals
- question order uniqueness
- JSON structure

---

## 14. Recommended Future Improvements to Existing Schema

These are not strictly required for the quiz feature, but would improve overall consistency.

### 14.1 Consider relational subject references in `study_sessions`

Current table:

- `study_sessions.subject` is text

Recommended evolution later:

- add `subject_id`
- optionally add `topic_id`

### 14.2 Consider consistent ID strategy

If the application is scaling, consider standardizing IDs across new tables. For example:

- UUID
- ULID
- prefixed IDs generated in app layer

Do not mix too many patterns.

### 14.3 Consider audit metadata columns

For AI-heavy tables, consider standard fields such as:

- `created_by`
- `updated_by`
- `source`
- `processing_status`

---

## 15. Recommended Success Metrics

Track these product metrics after launch:

- quiz generation success rate
- attempt completion rate
- grading success rate
- image extraction success rate
- average score by subject/topic
- repeat practice rate
- mastery improvement over time

---

## 16. Final Recommendation

For a professional and scalable Zupiq implementation:

1. introduce first-class quiz tables
2. separate generation, attempts, answers, and mastery
3. preserve raw AI and user answer data
4. support both typed and image-based answers
5. use deterministic grading where possible
6. let AI handle explanation, rubric-based grading, and improvement feedback
7. ship V1 with in-app answering first, then layer image grading after stability

This approach gives Zupiq a strong foundation for becoming not just a quiz page, but a full **AI practice, evaluation, and mastery system**.

---

## 17. Agent Task Checklist

An AI coding agent should complete work in this order:

### Database

- add `quizzes`
- add `quiz_questions`
- add `quiz_attempts`
- add `quiz_answers`
- add `user_topic_mastery`
- add indexes
- add RLS policies

### Backend

- build quiz generation endpoint
- build quiz retrieval endpoint
- build attempt creation endpoint
- build answer save endpoint
- build image submission endpoint
- build grading endpoint
- build result endpoint
- build mastery endpoint

### AI

- create strict generation prompt
- create strict grading prompt
- add JSON validation
- add fallback handling for malformed outputs

### Frontend

- build quiz setup page
- build quiz play page
- build result page
- build quiz history page
- build mastery summary components

### Reliability

- log AI generation failures
- log grading failures
- store extraction confidence
- store grading confidence
- support safe retry paths

