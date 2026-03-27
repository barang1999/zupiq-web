import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Archive,
  ArrowRight,
  Atom,
  BookOpen,
  FlaskConical,
  GitFork,
  HelpCircle,
  History,
  Layers,
  LogOut,
  Sigma,
  Sparkles,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { useFlashcards } from "../hooks/useFlashcards";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { api } from "../lib/api";
import type { Flashcard } from "../types/flashcard.types";

interface Props {
  user: any;
  initialSubject?: string | null;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
  onStartSession: (subject: string) => void;
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes("physics") || s.includes("quantum")) return Waves;
  if (s.includes("chem")) return FlaskConical;
  if (s.includes("math") || s.includes("calculus") || s.includes("algebra")) return Sigma;
  if (s.includes("economics") || s.includes("business") || s.includes("finance")) return TrendingUp;
  if (s.includes("science")) return Atom;
  return BookOpen;
}

export default function FlashcardSubjectSelectionPage({
  user,
  initialSubject,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
  onStartSession,
}: Props) {
  const [sidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});

  const { decks, fetchDecks, isLoading } = useFlashcards();
  const isExpanded = sidebarOpen || sidebarHovered;

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (decks.length === 0) {
      setDueByDeck({});
      return;
    }
    let cancelled = false;

    const loadDueCounts = async () => {
      const entries = await Promise.all(
        decks.map(async (deck) => {
          try {
            const res = await api.get<{ cards: Flashcard[] }>(`/api/flashcards/decks/${deck.id}/due`);
            return [deck.id, res.cards.length] as const;
          } catch {
            return [deck.id, 0] as const;
          }
        })
      );
      if (cancelled) return;
      setDueByDeck(Object.fromEntries(entries));
    };

    void loadDueCounts();
    return () => {
      cancelled = true;
    };
  }, [decks]);

  const subjectStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        subject: string;
        deckCount: number;
        cardCount: number;
        dueCount: number;
        estimatedMinutes: number;
        readiness: number;
      }
    >();

    decks.forEach((deck) => {
      const subject = deck.subject?.trim() || "General Study";
      const current = grouped.get(subject) ?? {
        subject,
        deckCount: 0,
        cardCount: 0,
        dueCount: 0,
        estimatedMinutes: 0,
        readiness: 0,
      };
      current.deckCount += 1;
      current.cardCount += deck.card_count;
      current.dueCount += dueByDeck[deck.id] ?? 0;
      grouped.set(subject, current);
    });

    const stats = Array.from(grouped.values()).map((stat) => {
      const estimatedMinutes = Math.max(5, Math.round(stat.cardCount * 0.35));
      const readiness =
        stat.cardCount > 0
          ? Math.max(0, Math.min(100, Math.round(((stat.cardCount - stat.dueCount) / stat.cardCount) * 100)))
          : 0;

      return {
        ...stat,
        estimatedMinutes,
        readiness,
      };
    });

    return stats.sort((a, b) => b.cardCount - a.cardCount);
  }, [decks, dueByDeck]);

  useEffect(() => {
    if (subjectStats.length === 0) {
      setSelectedSubject("");
      return;
    }
    if (initialSubject && subjectStats.some((stat) => stat.subject === initialSubject)) {
      setSelectedSubject(initialSubject);
      return;
    }
    if (!selectedSubject || !subjectStats.some((stat) => stat.subject === selectedSubject)) {
      setSelectedSubject(subjectStats[0].subject);
    }
  }, [initialSubject, selectedSubject, subjectStats]);

  const selectedStats = subjectStats.find((item) => item.subject === selectedSubject);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const NAV_ITEMS = [
    { id: "study", label: "Study Space", Icon: GitFork, action: () => onNavigateStudy?.() },
    { id: "history", label: "Learning History", Icon: History, action: () => onNavigateHistory?.() },
    { id: "flashcards", label: "Flashcards", Icon: Layers, action: () => {} },
    { id: "concepts", label: "Base Concepts", Icon: BookOpen, action: () => {} },
    { id: "collab", label: "Collaborate", Icon: Users, action: () => {} },
    { id: "archive", label: "Archives", Icon: Archive, action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <div className="fixed top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={onNavigateStudy}
        onNavigateHistory={onNavigateHistory}
        activeMobileMenu="flashcards"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={
          <div className="hidden md:flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Flashcards</span>
          </div>
        }
      />

      <motion.aside
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed left-0 h-full z-40 bg-surface-container-low hidden sm:flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width: isExpanded ? 256 : 64 }}
      >
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? "px-6" : "px-0 flex justify-center"}`}>
          {isExpanded ? (
            <div>
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Flashcard Focus</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Subject Selector</p>
            </div>
          ) : (
            <Layers className="w-5 h-5 text-secondary" />
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon, action }) => {
            const isActive = id === "flashcards";
            return (
              <button
                key={id}
                onClick={action}
                title={!isExpanded ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 text-left ${
                  isActive
                    ? isExpanded
                      ? "rounded-r-full bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary"
                      : "rounded-xl bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl"
                } ${!isExpanded ? "justify-center" : ""}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {isExpanded && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          {isExpanded && (
            <button
              onClick={() => onNavigateStudy?.()}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden"
            >
              Back To Study
            </button>
          )}
          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? "items-center" : ""}`}>
            <a
              href="#"
              className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? "justify-center p-2 rounded-xl hover:bg-surface-container" : "px-1"}`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Support</span>}
            </a>
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-error transition-colors ${!isExpanded ? "justify-center p-2 rounded-xl hover:bg-surface-container" : "px-1"}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      <main
        className={`relative z-10 px-6 py-8 pt-24 md:px-10 md:py-12 md:pt-28 ${
          isMobile ? "" : isExpanded ? "sm:ml-64" : "sm:ml-16"
        }`}
      >
        <div className="mx-auto max-w-6xl pb-36">
          <header className="mb-14">
            <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-on-surface mb-4">
              Select Your <span className="text-primary italic">Focus</span>
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-on-surface-variant">
              Choose a subject path to begin active recall. Your flashcard session will use decks from the selected subject only.
            </p>
          </header>

          {subjectStats.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
              <h2 className="font-headline text-3xl font-bold text-on-surface">No subjects yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
                Create flashcard decks first, then return to pick a subject focus.
              </p>
            </div>
          ) : (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              {subjectStats.map((subject) => {
                const Icon = subjectIcon(subject.subject);
                const isSelected = selectedSubject === subject.subject;

                return (
                  <button
                    key={subject.subject}
                    onClick={() => setSelectedSubject(subject.subject)}
                    className={`glass-card relative overflow-hidden rounded-[32px] p-8 text-left transition-all duration-300 active:scale-95 ${
                      isSelected
                        ? "translate-y-[-6px] border border-primary/45 shadow-[0_20px_40px_rgba(161,250,255,0.15)]"
                        : "border border-white/5 hover:translate-y-[-6px] hover:shadow-[0_20px_40px_rgba(161,250,255,0.08)]"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,255,202,0.12),transparent_70%)]" />

                    <div className="relative flex justify-between items-start mb-12">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isSelected ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-headline text-2xl font-bold text-tertiary">{subject.readiness}%</span>
                    </div>

                    <h3 className="relative font-headline text-2xl font-bold text-on-surface mb-2">{subject.subject}</h3>
                    <p className="relative text-on-surface-variant text-sm mb-6 font-medium tracking-wide uppercase">
                      {subject.deckCount} {subject.deckCount === 1 ? "deck" : "decks"} in this focus lane
                    </p>

                    <div className="relative flex items-center gap-5 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        <span>{subject.cardCount} cards</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>{subject.estimatedMinutes} min est.</span>
                      </div>
                    </div>

                    <div className="relative mt-8 h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                        style={{ width: `${subject.readiness}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </div>

        <div className="fixed bottom-16 sm:bottom-5 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 sm:px-6">
          <button
            onClick={() => selectedSubject && onStartSession(selectedSubject)}
            disabled={!selectedStats || isLoading}
            className="w-full rounded-full bg-gradient-to-r from-primary to-secondary py-3.5 sm:py-5 text-base sm:text-xl font-headline font-bold text-on-primary shadow-[0_15px_30px_rgba(161,250,255,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3"
          >
            Start Session
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
