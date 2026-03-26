// Types shared with the backend — keep in sync with zupiq-backend/shared/user.ts

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
  | "ko"
  | "km";

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  "en", "fr", "es", "ar", "zh", "hi", "pt", "de", "ja", "ko", "km",
] as const;
