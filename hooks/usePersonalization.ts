import { useState, useCallback, useEffect } from "react";
import { api } from "../lib/api";
import type { UserPreferences, UpdateProfileDTO, EducationLevel, Language } from "../types/user.types";
import { useAuthStore } from "../store/auth.store";
import { useAppStore } from "../store/app.store";

interface UsePersonalizationReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  updateEducationLevel: (level: EducationLevel, grade?: string) => Promise<void>;
  updateLanguage: (language: Language) => Promise<void>;
  suggestedSubjects: string[];
}

export function usePersonalization(): UsePersonalizationReturn {
  const { user, refreshUser } = useAuthStore();
  const { setLanguage } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([]);

  // Derive suggested subjects from user level + preferred subjects
  useEffect(() => {
    if (!user) return;
    const prefs = user.preferences as UserPreferences;

    const byLevel: Record<string, string[]> = {
      elementary: ["Basic Math", "Basic Science"],
      middle_school: ["Pre-Algebra", "General Science"],
      high_school: ["Algebra", "Physics", "Chemistry"],
      undergraduate: ["Calculus", "Organic Chemistry", "Linear Algebra"],
      graduate: ["Advanced Mathematics", "Quantum Mechanics"],
      professional: ["Research Methods"],
    };

    const levelSuggestions = byLevel[user.education_level] ?? [];
    const preferred = prefs?.preferred_subjects ?? [];
    const combined = [...new Set([...preferred, ...levelSuggestions])];
    setSuggestedSubjects(combined.slice(0, 5));
  }, [user]);

  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      setIsLoading(true);
      setError(null);
      try {
        await api.patch<void>("/api/users/preferences", prefs);
        await refreshUser();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update preferences");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  const updateEducationLevel = useCallback(
    async (education_level: EducationLevel, grade?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await api.patch<void>("/api/users/education", { education_level, grade });
        await refreshUser();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update education level");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  const updateLanguage = useCallback(
    async (language: Language) => {
      setIsLoading(true);
      setError(null);
      try {
        await api.patch<UpdateProfileDTO>("/api/users/profile", { language });
        setLanguage(language);
        await refreshUser();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update language");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser, setLanguage]
  );

  return {
    preferences: user?.preferences as UserPreferences | null,
    isLoading,
    error,
    updatePreferences,
    updateEducationLevel,
    updateLanguage,
    suggestedSubjects,
  };
}
