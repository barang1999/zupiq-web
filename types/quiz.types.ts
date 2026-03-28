export type QuizLevel = "easy" | "medium" | "hard";
export type QuizMode = "mcq" | "short_answer" | "numeric" | "written" | "mixed";

export interface Quiz {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  description: string | null;
  level: QuizLevel;
  specific_area: string | null;
  quiz_mode: QuizMode;
  question_count: number;
  total_marks: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_order: number;
  question_type: "mcq" | "short_answer" | "numeric" | "written";
  question_text: string;
  instructions: string | null;
  options: string[];
  expected_answer: Record<string, unknown>;
  grading_rubric: Record<string, unknown>;
  explanation: string | null;
  marks: number;
  difficulty: QuizLevel;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  status: "in_progress" | "submitted" | "graded";
  score: number;
  total_marks: number;
  percentage: number;
  feedback_summary: string | null;
  strengths: string[];
  weaknesses: string[];
  improvement_areas: string[];
  submitted_at: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Record<string, unknown>;
  answer_upload_id: string | null;
  extracted_text: string | null;
  extraction_confidence: number | null;
  grading_confidence: number | null;
  is_correct: boolean | null;
  awarded_marks: number;
  ai_feedback: string | null;
  correction: string | null;
  review_required: boolean;
  question_order?: number | null;
  question_text?: string | null;
  question_type?: string | null;
  question_marks?: number | null;
  question_explanation?: string | null;
}

export interface QuizHistoryItem extends Quiz {
  latest_attempt: QuizAttempt | null;
}

export interface MasteryItem {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  level: string | null;
  mastery_score: number;
  quizzes_taken: number;
  average_score: number;
  last_quiz_at: string | null;
  subject_name?: string | null;
  topic_name?: string | null;
}

export interface GenerateQuizDTO {
  subjectId?: string | null;
  topicId?: string | null;
  level?: QuizLevel;
  specificArea?: string;
  quizMode?: QuizMode;
  questionCount?: number;
}

export interface SaveQuizAnswerDTO {
  questionId: string;
  answerText?: string;
  answerJson?: Record<string, unknown>;
}

export interface QuizBundle {
  quiz: Quiz;
  questions: QuizQuestion[];
}

export interface QuizAttemptResult {
  attempt: QuizAttempt;
  quiz: Quiz;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}
