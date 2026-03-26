// ─── Application route constants ──────────────────────────────────────────────
// Used in manual routing (useState-based) since react-router-dom is not installed.

export type AppPage =
  | "landing"
  | "dashboard"
  | "ai-tutor"
  | "flashcards"
  | "groups"
  | "profile"
  | "subjects"
  | "subject-detail"
  | "lesson";

export const APP_ROUTES = {
  LANDING: "landing" as AppPage,
  DASHBOARD: "dashboard" as AppPage,
  AI_TUTOR: "ai-tutor" as AppPage,
  FLASHCARDS: "flashcards" as AppPage,
  GROUPS: "groups" as AppPage,
  PROFILE: "profile" as AppPage,
  SUBJECTS: "subjects" as AppPage,
  SUBJECT_DETAIL: "subject-detail" as AppPage,
  LESSON: "lesson" as AppPage,
} as const;

// ─── Navigation items ─────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  page: AppPage;
  icon: string;
  requiresAuth: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    page: APP_ROUTES.DASHBOARD,
    icon: "LayoutDashboard",
    requiresAuth: true,
  },
  {
    label: "AI Tutor",
    page: APP_ROUTES.AI_TUTOR,
    icon: "Brain",
    requiresAuth: true,
  },
  {
    label: "Flashcards",
    page: APP_ROUTES.FLASHCARDS,
    icon: "Layers",
    requiresAuth: true,
  },
  {
    label: "Study Groups",
    page: APP_ROUTES.GROUPS,
    icon: "Users",
    requiresAuth: true,
  },
  {
    label: "Subjects",
    page: APP_ROUTES.SUBJECTS,
    icon: "BookOpen",
    requiresAuth: false,
  },
  {
    label: "Profile",
    page: APP_ROUTES.PROFILE,
    icon: "User",
    requiresAuth: true,
  },
];
