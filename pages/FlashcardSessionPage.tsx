import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitFork,
  HelpCircle,
  History,
  Keyboard,
  Layers,
  LogOut,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { Button } from "../components/ui/Button";
import { MathText } from "../components/ui/MathText";
import { RichText } from "../components/ui/RichText";
import { useFlashcards } from "../hooks/useFlashcards";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";

interface Props {
  user: any;
  selectedSubject?: string | null;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateSubjects?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

export default function FlashcardSessionPage({
  user,
  selectedSubject,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateSubjects,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const [sidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );

  const {
    decks,
    currentDeck,
    cards,
    currentCardIndex,
    isFlipped,
    isLoading,
    fetchDecks,
    fetchDeckCards,
    flipCard,
    nextCard,
    prevCard,
    reviewCard,
    setCurrentDeck,
  } = useFlashcards();

  const isExpanded = sidebarOpen || sidebarHovered;

  const normalizeSubject = (value: string | null | undefined) =>
    (value?.trim() || "General Study").toLowerCase();

  const subjectDecks = useMemo(() => {
    if (!selectedSubject) return decks;
    const target = normalizeSubject(selectedSubject);
    return decks.filter((deck) => normalizeSubject(deck.subject) === target);
  }, [decks, selectedSubject]);

  const loadDeck = useCallback(
    async (deckId: string) => {
      const deck = subjectDecks.find((candidate) => candidate.id === deckId);
      if (!deck) return;
      setSelectedDeckId(deck.id);
      setCurrentDeck(deck);
      setSessionComplete(false);
      setRatings([]);
      await fetchDeckCards(deck.id);
    },
    [fetchDeckCards, setCurrentDeck, subjectDecks]
  );

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    if (subjectDecks.length === 0) return;
    const deckId = selectedDeckId || subjectDecks[0].id;
    const alreadyLoaded = currentDeck?.id === deckId;
    if (!alreadyLoaded) {
      void loadDeck(deckId);
    }
  }, [currentDeck?.id, loadDeck, selectedDeckId, subjectDecks]);

  useEffect(() => {
    if (subjectDecks.length === 0) {
      setSelectedDeckId("");
      return;
    }
    const selectedStillExists = subjectDecks.some((deck) => deck.id === selectedDeckId);
    if (!selectedStillExists) {
      setSelectedDeckId(subjectDecks[0].id);
    }
  }, [selectedDeckId, subjectDecks]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const currentCard = cards[currentCardIndex];
  const studiedCount = sessionComplete
    ? cards.length
    : cards.length > 0
      ? currentCardIndex + 1
      : 0;
  const progressPercent = cards.length > 0 ? Math.round((studiedCount / cards.length) * 100) : 0;

  const quantumAccuracy = useMemo(() => {
    if (ratings.length === 0) return 0;
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    return Math.round((total / (ratings.length * 5)) * 100);
  }, [ratings]);

  const handleRate = useCallback(
    async (rating: 1 | 3 | 5) => {
      if (!currentDeck || !currentCard) return;

      await reviewCard({
        deck_id: currentDeck.id,
        card_id: currentCard.id,
        rating,
      });
      setRatings((prev) => [...prev, rating]);

      if (currentCardIndex < cards.length - 1) {
        nextCard();
      } else {
        setSessionComplete(true);
      }
    },
    [cards.length, currentCard, currentCardIndex, currentDeck, nextCard, reviewCard]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (currentCard && !sessionComplete) flipCard();
        return;
      }
      if (event.key === "1" && isFlipped) {
        void handleRate(1);
        return;
      }
      if (event.key === "2" && isFlipped) {
        void handleRate(3);
        return;
      }
      if (event.key === "3" && isFlipped) {
        void handleRate(5);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, flipCard, handleRate, isFlipped, sessionComplete]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const NAV_ITEMS = [
    { id: "study", label: "Study Space", Icon: GitFork, action: () => onNavigateStudy?.() },
    { id: "history", label: "Learning History", Icon: History, action: () => onNavigateHistory?.() },
    { id: "flashcards", label: "Flashcards", Icon: Layers, action: () => onNavigateSubjects?.() },
    { id: "collab", label: "Collaborate", Icon: Users, action: () => {} },
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
        onNavigateFlashcards={onNavigateSubjects}
        activeMobileMenu="flashcards"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={
          <div className="hidden md:flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Flashcard Session</span>
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
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Quantum Recall</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Flashcard Mode</p>
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
              New Session
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
        className={`relative z-10 px-6 py-8 pt-20 md:px-10 md:py-12 md:pt-24 ${
          isMobile ? "" : isExpanded ? "sm:ml-64" : "sm:ml-16"
        }`}
      >
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 flex flex-col gap-4 rounded-3xl border border-outline-variant/20 bg-surface-container-low/70 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-headline text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                  Flashcard Session
                </p>
                <h1 className="font-headline text-2xl font-bold text-on-surface">Quantum Recall</h1>
                {selectedSubject && (
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-primary">{selectedSubject}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedDeckId}
                onChange={(event) => void loadDeck(event.target.value)}
                className="min-w-52 rounded-full border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isLoading || subjectDecks.length === 0}
              >
                {subjectDecks.length === 0 ? (
                  <option value="">No decks available</option>
                ) : (
                  subjectDecks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title}
                    </option>
                  ))
                )}
              </select>

              <Button variant="glass" size="sm" onClick={() => onNavigateSubjects?.()}>
                Change Subject
              </Button>
            </div>
          </header>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="font-headline text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">
                Current Progress
              </p>
              <p className="mt-1 font-headline text-2xl font-bold text-on-surface">
                {studiedCount} <span className="font-normal text-on-surface-variant">/ {cards.length} Cards</span>
              </p>
            </div>
            <div className="md:text-right">
              <p className="font-headline text-[11px] uppercase tracking-[0.22em] text-primary">
                Quantum Accuracy
              </p>
              <p className="mt-1 font-headline text-2xl font-bold text-primary">{quantumAccuracy}%</p>
            </div>
            <div className="md:col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {subjectDecks.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
              <h2 className="font-headline text-3xl font-bold text-on-surface">No decks for this subject</h2>
              <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
                Pick another subject to continue your flashcard session.
              </p>
              <Button variant="primary" className="mt-6" onClick={() => onNavigateSubjects?.()}>
                Back To Subjects
              </Button>
            </div>
          ) : cards.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
              <h2 className="font-headline text-3xl font-bold text-on-surface">No cards in this deck yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
                Add cards in your deck manager, then return here to run focused review sessions.
              </p>
            </div>
          ) : (
            <>
              <div className="glass-card relative min-h-[460px] rounded-[2.5rem] border border-outline-variant/20 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)] md:p-12">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-tr-[2.5rem] bg-[radial-gradient(circle_at_top_right,rgba(243,255,202,0.18),transparent_70%)]" />

                <div className="mb-10 text-center">
                  <span className="rounded-full bg-surface-container-highest px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                    {currentDeck?.subject || "General Study"} • {currentDeck?.title || "Flashcards"}
                  </span>
                </div>

                {sessionComplete ? (
                  <div className="flex min-h-[290px] flex-col items-center justify-center text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="font-headline text-4xl font-bold text-on-surface">Session Complete</h2>
                    <p className="mt-4 max-w-xl text-lg text-on-surface-variant">
                      You reviewed {cards.length} cards with {quantumAccuracy}% accuracy.
                    </p>
                    {currentDeck && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="mt-8"
                        onClick={() => void loadDeck(currentDeck.id)}
                      >
                        Start Again
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className="flex min-h-[290px] cursor-pointer flex-col justify-center text-center"
                      onClick={flipCard}
                    >
                      {isFlipped ? (
                        <div className="mx-auto w-full max-w-3xl px-3 text-left text-on-surface">
                          <RichText className="text-lg leading-relaxed md:text-xl">
                            {currentCard?.back ?? ""}
                          </RichText>
                        </div>
                      ) : (
                        <h2 className="px-3 font-headline text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-5xl">
                          <MathText>{currentCard?.front ?? ""}</MathText>
                        </h2>
                      )}
                      {currentCard?.hint && !isFlipped && (
                        <p className="mx-auto mt-6 max-w-xl text-lg text-on-surface-variant/80">
                          Hint: <MathText>{currentCard.hint}</MathText>
                        </p>
                      )}
                    </div>

                    {!isFlipped && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={flipCard}
                          className="group relative overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container-highest px-12 py-5 font-headline text-xl font-bold text-primary shadow-[0_0_20px_rgba(161,250,255,0.2)] transition-all active:scale-95 hover:bg-surface-variant"
                        >
                          <span className="relative z-10">Show Answer</span>
                          <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!sessionComplete && (
                <div className="mt-10 space-y-5">
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" size="sm" onClick={prevCard} disabled={currentCardIndex === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm text-on-surface-variant">
                      Card {currentCardIndex + 1} of {cards.length}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextCard}
                      disabled={currentCardIndex >= cards.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {isFlipped && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <button
                        onClick={() => void handleRate(1)}
                        className="group rounded-3xl border border-outline-variant/20 bg-surface-container p-6 transition-all hover:border-error hover:bg-surface-container-high"
                      >
                        <XCircle className="mx-auto h-8 w-8 text-error-dim" />
                        <p className="mt-3 font-headline text-lg font-bold text-on-surface group-hover:text-error">Hard</p>
                        <p className="mt-1 text-xs text-on-surface-variant">Review soon</p>
                      </button>

                      <button
                        onClick={() => void handleRate(3)}
                        className="group rounded-3xl border border-outline-variant/20 bg-surface-container p-6 transition-all hover:border-primary hover:bg-surface-container-high"
                      >
                        <Bot className="mx-auto h-8 w-8 text-primary" />
                        <p className="mt-3 font-headline text-lg font-bold text-on-surface group-hover:text-primary">Good</p>
                        <p className="mt-1 text-xs text-on-surface-variant">Balanced interval</p>
                      </button>

                      <button
                        onClick={() => void handleRate(5)}
                        className="group rounded-3xl border border-outline-variant/20 bg-surface-container p-6 transition-all hover:border-tertiary hover:bg-surface-container-high"
                      >
                        <CheckCircle2 className="mx-auto h-8 w-8 text-tertiary" />
                        <p className="mt-3 font-headline text-lg font-bold text-on-surface group-hover:text-tertiary">
                          Too Easy
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">Longer spacing</p>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <footer className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[11px] uppercase tracking-[0.16em] text-on-surface-variant/70">
            <span className="inline-flex items-center gap-2">
              <Keyboard className="h-3.5 w-3.5" />
              SPACE to flip
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              1,2,3 to grade
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
