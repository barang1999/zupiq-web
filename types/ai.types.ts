// ─── Subject types ────────────────────────────────────────────────────────────

export type SubjectType = "math" | "physics" | "chemistry" | "biology" | "general";

export type MessageRole = "user" | "model";

export type AIActionType = "chat" | "explain" | "solve" | "hint" | "summarize" | "analyze-image";

// ─── Chat types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  subject?: SubjectType;
  timestamp: string;
  isStreaming?: boolean;
  uploadId?: string; // attached file
}

export interface ChatSession {
  id: string;
  subject?: SubjectType;
  messages: ChatMessage[];
  created_at: string;
}

// ─── AI Response types ────────────────────────────────────────────────────────

export interface AIResponse {
  response?: string;
  explanation?: string;
  solution?: string;
  hint?: string;
  summary?: string;
  analysis?: string;
  session_id?: string;
}

export interface AIRequestPayload {
  messages?: Array<{ role: MessageRole; content: string }>;
  concept?: string;
  problem?: string;
  content?: string;
  upload_id?: string;
  question?: string;
  subject?: string;
  session_id?: string;
}

// ─── Subject / Topic / Lesson ─────────────────────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  topic_count?: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  lesson_count?: number;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  order_index: number;
  topic_name?: string;
  subject_name?: string;
}
