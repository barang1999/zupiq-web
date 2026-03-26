// ─── Enums ────────────────────────────────────────────────────────────────────

export type CardDifficulty = "easy" | "medium" | "hard";

export type StudyMode = "classic" | "spaced_repetition" | "quiz";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  difficulty: CardDifficulty;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  review_count: number;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDeckDTO {
  title: string;
  description?: string;
  subject?: string;
  lesson_id?: string;
}

export interface GenerateFlashcardsDTO {
  content: string;
  subject?: string;
  count?: number;
  difficulty?: CardDifficulty;
  deck_title?: string;
  lesson_id?: string;
}

export interface ReviewDTO {
  deck_id: string;
  card_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

// ─── Study session state ──────────────────────────────────────────────────────

export interface StudySession {
  deckId: string;
  cards: Flashcard[];
  currentIndex: number;
  isFlipped: boolean;
  mode: StudyMode;
  results: ReviewResult[];
}

export interface ReviewResult {
  cardId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  timeMs: number;
}
