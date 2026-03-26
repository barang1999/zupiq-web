// ─── Enums ────────────────────────────────────────────────────────────────────

export type EducationLevel =
  | "elementary"
  | "middle_school"
  | "high_school"
  | "undergraduate"
  | "graduate"
  | "professional";

export type Language =
  | "en"
  | "fr"
  | "es"
  | "ar"
  | "zh"
  | "hi"
  | "pt"
  | "de"
  | "ja"
  | "ko";

export type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";

export type AIExplanationStyle = "simple" | "detailed" | "socratic";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserPreferences {
  learning_style: LearningStyle;
  preferred_subjects: string[];
  daily_goal_minutes: number;
  notification_enabled: boolean;
  dark_mode: boolean;
  ai_explanation_style: AIExplanationStyle;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  education_level: EducationLevel;
  grade: string | null;
  language: Language;
  preferences: UserPreferences;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileDTO {
  full_name?: string;
  education_level?: EducationLevel;
  grade?: string;
  language?: Language;
  avatar_url?: string;
  preferences?: Partial<UserPreferences>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterDTO extends AuthCredentials {
  full_name: string;
  education_level?: EducationLevel;
  grade?: string;
  language?: Language;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
