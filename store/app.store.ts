import React, { createContext, useContext, useState, useCallback } from "react";
import type { AppPage } from "../constants/routes";
import type { SubjectType } from "../types/ai.types";
import type { Locale } from "../lib/i18n";
import { setLocale, detectLocale } from "../lib/i18n";

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppState {
  currentPage: AppPage;
  pageParams: Record<string, string>;
  currentSubject: SubjectType | null;
  language: Locale;
  isSidebarOpen: boolean;
  isAuthModalOpen: boolean;
  theme: "dark" | "light";
}

interface AppActions {
  navigateTo: (page: AppPage, params?: Record<string, string>) => void;
  setCurrentSubject: (subject: SubjectType | null) => void;
  setLanguage: (lang: Locale) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

type AppContextValue = AppState & AppActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const detectedLang = detectLocale();

  const [state, setState] = useState<AppState>({
    currentPage: "landing",
    pageParams: {},
    currentSubject: null,
    language: detectedLang,
    isSidebarOpen: false,
    isAuthModalOpen: false,
    theme: "dark",
  });

  const navigateTo = useCallback((page: AppPage, params: Record<string, string> = {}) => {
    setState((s) => ({ ...s, currentPage: page, pageParams: params }));
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const setCurrentSubject = useCallback((subject: SubjectType | null) => {
    setState((s) => ({ ...s, currentSubject: subject }));
  }, []);

  const setLanguage = useCallback((lang: Locale) => {
    setLocale(lang);
    setState((s) => ({ ...s, language: lang }));
    localStorage.setItem("zupiq_language", lang);
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((s) => ({ ...s, isSidebarOpen: !s.isSidebarOpen }));
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, isSidebarOpen: open }));
  }, []);

  const openAuthModal = useCallback(() => {
    setState((s) => ({ ...s, isAuthModalOpen: true }));
  }, []);

  const closeAuthModal = useCallback(() => {
    setState((s) => ({ ...s, isAuthModalOpen: false }));
  }, []);

  const setTheme = useCallback((theme: "dark" | "light") => {
    setState((s) => ({ ...s, theme }));
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const value: AppContextValue = {
    ...state,
    navigateTo,
    setCurrentSubject,
    setLanguage,
    toggleSidebar,
    setSidebarOpen,
    openAuthModal,
    closeAuthModal,
    setTheme,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return ctx;
}
