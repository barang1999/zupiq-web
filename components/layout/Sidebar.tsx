import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Brain, Layers, Users, BookOpen, User,
  ChevronLeft, X
} from "lucide-react";
import { useAppStore } from "../../store/app.store";
import { useAuth } from "../../hooks/useAuth";
import type { AppPage } from "../../constants/routes";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Brain,
  Layers,
  Users,
  BookOpen,
  User,
};

interface SidebarLink {
  label: string;
  page: AppPage;
  iconName: string;
  requiresAuth: boolean;
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { label: "Dashboard", page: "dashboard", iconName: "LayoutDashboard", requiresAuth: true },
  { label: "AI Tutor", page: "ai-tutor", iconName: "Brain", requiresAuth: true },
  { label: "Flashcards", page: "flashcards", iconName: "Layers", requiresAuth: true },
  { label: "Study Groups", page: "groups", iconName: "Users", requiresAuth: true },
  { label: "Subjects", page: "subjects", iconName: "BookOpen", requiresAuth: false },
  { label: "Profile", page: "profile", iconName: "User", requiresAuth: true },
];

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen, navigateTo, currentPage } = useAppStore();
  const { isAuthenticated } = useAuth();

  const links = SIDEBAR_LINKS.filter(
    (l) => !l.requiresAuth || isAuthenticated
  );

  const handleNavigate = (page: AppPage) => {
    navigateTo(page);
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed left-0 top-0 h-full z-40 flex flex-col",
          "bg-surface-container-low border-r border-white/5",
          "transition-all duration-300",
          isSidebarOpen ? "w-64" : "w-0 md:w-16",
          "overflow-hidden",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 h-20 flex-shrink-0">
          {isSidebarOpen && (
            <span className="font-headline font-bold text-lg text-on-surface">
              Zupiq
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container-high ml-auto"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={`w-5 h-5 transition-transform ${isSidebarOpen ? "" : "rotate-180"}`}
            />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = iconMap[link.iconName] ?? BookOpen;
            const isActive = currentPage === link.page;

            return (
              <button
                key={link.page}
                onClick={() => handleNavigate(link.page)}
                title={!isSidebarOpen ? link.label : undefined}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  "text-sm font-medium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
                  !isSidebarOpen ? "justify-center" : "",
                ].join(" ")}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && (
                  <span className="truncate">{link.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
