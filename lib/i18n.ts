// ─── Supported locales ────────────────────────────────────────────────────────

export type Locale = "en" | "fr" | "es" | "ar" | "zh" | "hi" | "pt" | "de" | "ja" | "ko";

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeLabel: string; rtl?: boolean }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", rtl: true },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "中文" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
];

// ─── Translation map (English baseline) ──────────────────────────────────────

type TranslationMap = Record<string, string>;

const translations: Record<Locale, TranslationMap> = {
  en: {
    // Navigation
    "nav.features": "Features",
    "nav.howItWorks": "How it Works",
    "nav.pricing": "Pricing",
    "nav.community": "Community",
    "nav.login": "Log In",
    "nav.getStarted": "Get Started",
    "nav.signOut": "Sign Out",
    "nav.dashboard": "Dashboard",
    "nav.aiTutor": "AI Tutor",
    "nav.flashcards": "Flashcards",
    "nav.groups": "Study Groups",
    "nav.profile": "Profile",

    // Auth
    "auth.login": "Log In",
    "auth.register": "Create Account",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.forgotPassword": "Forgot password?",
    "auth.noAccount": "Don't have an account? Sign Up",
    "auth.hasAccount": "Already have an account? Log In",

    // AI Tutor
    "ai.selectSubject": "Select a Subject",
    "ai.askQuestion": "Ask a question...",
    "ai.explain": "Explain",
    "ai.solve": "Solve",
    "ai.hint": "Give a Hint",
    "ai.summarize": "Summarize",
    "ai.attachFile": "Attach File",

    // Flashcards
    "flashcards.myDecks": "My Decks",
    "flashcards.createDeck": "Create Deck",
    "flashcards.generate": "Generate with AI",
    "flashcards.study": "Study",
    "flashcards.cards": "cards",
    "flashcards.front": "Front",
    "flashcards.back": "Back",
    "flashcards.hint": "Hint",

    // Groups
    "groups.explore": "Explore Groups",
    "groups.myGroups": "My Groups",
    "groups.create": "Create Group",
    "groups.join": "Join Group",
    "groups.members": "Members",
    "groups.inviteCode": "Invite Code",

    // Profile
    "profile.editProfile": "Edit Profile",
    "profile.educationLevel": "Education Level",
    "profile.grade": "Grade / Year",
    "profile.language": "Language",
    "profile.preferences": "Preferences",
    "profile.learningStyle": "Learning Style",
    "profile.save": "Save Changes",

    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Try again",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.close": "Close",
    "common.submit": "Submit",
  },
  fr: {
    "nav.login": "Se connecter",
    "nav.getStarted": "Commencer",
    "auth.login": "Connexion",
    "auth.register": "Créer un compte",
    "common.loading": "Chargement...",
    "common.error": "Une erreur s'est produite",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.back": "Retour",
    "common.close": "Fermer",
  },
  es: {
    "nav.login": "Iniciar sesión",
    "nav.getStarted": "Comenzar",
    "auth.login": "Iniciar sesión",
    "auth.register": "Crear cuenta",
    "common.loading": "Cargando...",
    "common.error": "Ocurrió un error",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.back": "Atrás",
    "common.close": "Cerrar",
  },
  ar: {},
  zh: {},
  hi: {},
  pt: {},
  de: {},
  ja: {},
  ko: {},
};

// ─── i18n state ───────────────────────────────────────────────────────────────

let currentLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  // Update HTML dir attribute for RTL languages
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale);
  document.documentElement.dir = localeInfo?.rtl ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a key. Falls back to English, then to the key itself.
 */
export function t(key: string, vars?: Record<string, string>): string {
  const localeMap = translations[currentLocale] ?? {};
  const fallbackMap = translations.en;

  let result = localeMap[key] ?? fallbackMap[key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{{${k}}}`, v);
    }
  }

  return result;
}

// Detect locale from browser or user profile
export function detectLocale(): Locale {
  const browserLang = navigator.language.split("-")[0] as Locale;
  const isSupported = SUPPORTED_LOCALES.some((l) => l.code === browserLang);
  return isSupported ? browserLang : "en";
}
