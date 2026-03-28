import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Brain,
  GitFork,
  History,
  Layers,
  Loader2,
  Network,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { useQuiz } from "../hooks/useQuiz";
import type { MasteryItem, QuizAttempt, QuizHistoryItem } from "../types/quiz.types";

interface Props {
  user: any;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateKnowledgeMap?: () => void;
  onNavigateQuiz?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

function dayDiff(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round(Math.abs(A - B) / 86400000);
}

function computeStreak(attempts: QuizAttempt[]): number {
  const uniqueDays = Array.from(new Set(
    attempts
      .map((attempt) => attempt.graded_at || attempt.submitted_at || attempt.created_at)
      .filter(Boolean)
      .map((iso) => new Date(String(iso)))
      .sort((a, b) => b.getTime() - a.getTime())
      .map((date) => date.toISOString().slice(0, 10))
  )).map((key) => new Date(key));

  if (uniqueDays.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    if (dayDiff(uniqueDays[i - 1], uniqueDays[i]) === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

type RankLabel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

function rankFromScore(score: number): RankLabel {
  if (score >= 95) return "PLATINUM";
  if (score >= 85) return "GOLD";
  if (score >= 70) return "SILVER";
  return "BRONZE";
}

function nextRank(score: number): { label: RankLabel; target: number } | null {
  if (score < 70) return { label: "SILVER", target: 70 };
  if (score < 85) return { label: "GOLD", target: 85 };
  if (score < 95) return { label: "PLATINUM", target: 95 };
  return null;
}

export default function AchievementPage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateKnowledgeMap,
  onNavigateQuiz,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const userId = user?.id ?? user?.sub ?? "";
  const { getHistory, getMastery, isLoading, error } = useQuiz();
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [historyRows, masteryRows] = await Promise.all([getHistory(40), getMastery(userId)]);
        if (cancelled) return;
        setHistory(historyRows);
        setMastery(masteryRows);
      } catch {
        if (cancelled) return;
        setHistory([]);
        setMastery([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [getHistory, getMastery, userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const navigateToQuiz = () => {
    if (onNavigateQuiz) {
      onNavigateQuiz();
      return;
    }
    if (window.location.pathname !== "/quiz") {
      window.history.pushState({ page: "quiz" }, "", "/quiz");
      window.dispatchEvent(new PopStateEvent("popstate", { state: { page: "quiz" } }));
    }
  };

  const gradedAttempts = useMemo(
    () =>
      history
        .map((quiz) => quiz.latest_attempt)
        .filter((attempt): attempt is QuizAttempt => Boolean(attempt && attempt.status === "graded")),
    [history]
  );

  const averageScore = useMemo(() => {
    if (!gradedAttempts.length) return 0;
    const total = gradedAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0);
    return Number((total / gradedAttempts.length).toFixed(1));
  }, [gradedAttempts]);

  const bestScore = useMemo(
    () => gradedAttempts.reduce((max, attempt) => Math.max(max, Number(attempt.percentage || 0)), 0),
    [gradedAttempts]
  );

  const totalPoints = useMemo(
    () =>
      gradedAttempts.reduce(
        (sum, attempt) => sum + Math.round(Number(attempt.percentage || 0) * 12) + Math.round(Number(attempt.score || 0)),
        0
      ),
    [gradedAttempts]
  );

  const streak = useMemo(() => computeStreak(gradedAttempts), [gradedAttempts]);

  const overallMastery = useMemo(() => {
    if (mastery.length === 0) return averageScore;
    const total = mastery.reduce((sum, row) => sum + Number(row.mastery_score || 0), 0);
    return Number((total / mastery.length).toFixed(1));
  }, [averageScore, mastery]);

  const rank = rankFromScore(overallMastery);
  const next = nextRank(overallMastery);
  const progressToNext = next ? Math.max(0, Math.min(100, (overallMastery / next.target) * 100)) : 100;

  const latestQuiz = history[0] ?? null;
  const topMastery = useMemo(
    () => [...mastery].sort((a, b) => b.mastery_score - a.mastery_score).slice(0, 3),
    [mastery]
  );

  const achievements = useMemo(
    () => [
      {
        id: "first-graded",
        title: "First Precision",
        description: "Complete your first graded quiz.",
        progress: Math.min(1, gradedAttempts.length / 1),
        unlocked: gradedAttempts.length >= 1,
      },
      {
        id: "streak-3",
        title: "Streak Builder",
        description: "Maintain a 3-day quiz streak.",
        progress: Math.min(1, streak / 3),
        unlocked: streak >= 3,
      },
      {
        id: "avg-85",
        title: "High Accuracy",
        description: "Reach 85% average graded score.",
        progress: Math.min(1, averageScore / 85),
        unlocked: averageScore >= 85,
      },
      {
        id: "mastery-80",
        title: "Mastery Pilot",
        description: "Reach 80% overall mastery.",
        progress: Math.min(1, overallMastery / 80),
        unlocked: overallMastery >= 80,
      },
    ],
    [averageScore, gradedAttempts.length, overallMastery, streak]
  );

  const featuredAchievement = achievements.find((item) => !item.unlocked) ?? achievements[achievements.length - 1];

  const navItems = useMemo(
    () => [
      { id: "study", label: "Study Space", Icon: GitFork, active: false, onClick: onNavigateStudy },
      { id: "knowledge-map", label: "Knowledge Map", Icon: Network, active: false, onClick: onNavigateKnowledgeMap },
      { id: "history", label: "Learning History", Icon: History, active: false, onClick: onNavigateHistory },
      { id: "flashcards", label: "Flashcards", Icon: Layers, active: false, onClick: onNavigateFlashcards },
      { id: "quiz", label: "Quiz", Icon: Brain, active: false, onClick: navigateToQuiz },
      { id: "achievements", label: "Achievements", Icon: Trophy, active: true, onClick: undefined },
    ],
    [navigateToQuiz, onNavigateFlashcards, onNavigateHistory, onNavigateKnowledgeMap, onNavigateStudy]
  );

  return (
    <div className="min-h-screen bg-surface-dim text-on-surface overflow-x-hidden">
      <div className="fixed top-20 right-0 h-[420px] w-[420px] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />
      <div className="fixed -left-16 bottom-20 h-[340px] w-[340px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={onNavigateStudy}
        onNavigateKnowledgeMap={onNavigateKnowledgeMap}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        onNavigateQuiz={navigateToQuiz}
        onNavigateAchievements={() => undefined}
        activeMobileMenu="achievements"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={(
          <div className="hidden md:flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Achievements</span>
          </div>
        )}
      />

      <AppSidebar
        brandTitle="Achievement Grid"
        brandSubtitle="Quiz Score Atlas"
        brandIcon={Trophy}
        navItems={navItems}
        primaryAction={{ label: "Start Quiz", onClick: navigateToQuiz }}
        onSignOut={handleSignOut}
        collapsible
        defaultPinned={false}
        onExpandedChange={setSidebarExpanded}
      />

      <main
        className={`relative z-10 pb-24 pt-20 ${isMobile ? "px-4" : "px-8 pt-24"}`}
        style={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? 256 : 64) }}
      >
        <div className="mx-auto max-w-6xl">
          <section className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="glass-card rounded-[2rem] p-6 lg:col-span-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Current Standing</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-headline text-3xl font-black">{rank}</p>
                  <p className="text-xs text-on-surface-variant">Based on your graded quiz scores</p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-surface-container-high">
                <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${progressToNext}%` }} />
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                {next ? `${Math.max(0, Math.ceil(next.target - overallMastery))}% to ${next.label}` : "Top rank unlocked"}
              </p>
            </div>

            <div className="glass-card rounded-[2rem] p-6 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    Live Quiz Performance
                  </span>
                  <h2 className="mt-3 font-headline text-3xl font-black tracking-tight md:text-5xl">NEURAL SYNC</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Latest quiz: {latestQuiz?.title ?? "No recent quiz yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best Score</p>
                  <p className="font-headline text-3xl font-black text-on-surface">{Math.round(bestScore)}%</p>
                </div>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-3xl font-headline font-black text-secondary">{gradedAttempts.length}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Graded Quizzes</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-primary">{Math.round(averageScore)}%</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Average Score</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-tertiary">{streak}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Day Streak</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-on-surface">{totalPoints}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Quantum Points</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="glass-card rounded-[1.5rem] p-5 md:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-headline text-xl font-bold">Top Mastery</h3>
                <Award className="h-5 w-5 text-tertiary" />
              </div>
              {topMastery.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Mastery stats will appear after graded quiz attempts.</p>
              ) : (
                <div className="space-y-3">
                  {topMastery.map((row, index) => (
                    <div key={row.id} className="rounded-2xl bg-surface-container p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{index + 1}. {row.topic_name || row.subject_name || "General"}</span>
                        <span className="text-primary">{Math.round(row.mastery_score)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-[1.5rem] p-6 md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-tertiary" />
                <h3 className="font-headline text-2xl font-black">{featuredAchievement.title}</h3>
              </div>
              <p className="text-sm text-on-surface-variant">{featuredAchievement.description}</p>
              <div className="mt-5 h-2 rounded-full bg-surface-container-high">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-tertiary to-primary"
                  style={{ width: `${Math.round(featuredAchievement.progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-on-surface-variant">
                {featuredAchievement.unlocked ? "Unlocked" : `${Math.round(featuredAchievement.progress * 100)}% completed`}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={navigateToQuiz}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary"
                >
                  Continue Quiz
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onNavigateHistory}
                  className="rounded-full bg-surface-container px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant"
                >
                  View History
                </button>
              </div>
            </div>

            <div className="glass-card rounded-[1.25rem] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Overall Mastery</span>
              </div>
              <p className="font-headline text-4xl font-black">{Math.round(overallMastery)}%</p>
            </div>

            <div className="glass-card rounded-[1.25rem] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Unlocked</span>
              </div>
              <p className="font-headline text-4xl font-black">{achievements.filter((item) => item.unlocked).length}</p>
            </div>

            <div className="glass-card rounded-[1.25rem] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-tertiary" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Rank Progress</span>
              </div>
              <p className="font-headline text-4xl font-black">{Math.round(progressToNext)}%</p>
            </div>
          </section>

          {isLoading ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing quiz achievements...
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-error/20 px-4 py-3 text-sm text-red-200">{error}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
