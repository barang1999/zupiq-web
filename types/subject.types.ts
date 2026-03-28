export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_count?: number;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  lesson_count?: number;
  created_at: string;
  subject_name?: string;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  difficulty: DifficultyLevel;
  order_index: number;
  created_at: string;
  updated_at: string;
  topic_name?: string;
  subject_name?: string;
}
