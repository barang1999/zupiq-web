import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Brain,
  History,
  Layers,
  Loader2,
  Network,
  Sparkles,
  Trophy,
  GitFork,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { CustomSelect } from "../components/ui/CustomSelect";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { getSessionsCached } from "../lib/sessions";
import { getSubjectsCached } from "../lib/subjects";
import { useQuiz } from "../hooks/useQuiz";
import type {
  QuizLevel,
  QuizMode,
} from "../types/quiz.types";
import type { Subject } from "../types/subject.types";

interface StudySessionTopicOption {
  title: string;
  subject_id: string | null;
  subject: string | null;
  created_at: string;
}

interface Props {
  user: any;
  onQuizGenerated: (quizId: string, attemptId: string) => void;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateKnowledgeMap?: () => void;
  onNavigateAchievements?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

function sanitizeQuestionCount(value: number): number {
  if (!Number.isFinite(value)) return 8;
  return Math.max(3, Math.min(20, Math.round(value)));
}

export default function QuizSetupPage({
  user,
  onQuizGenerated,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateKnowledgeMap,
  onNavigateAchievements,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const {
    isLoading,
    error,
    generateQuiz,
    startAttempt,
  } = useQuiz();

  const quizPrefill = useMemo(() => {
    if (typeof window === "undefined") {
      return { subjectId: "", subjectName: "", specificArea: "" };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      subjectId: params.get("subjectId")?.trim() ?? "",
      subjectName: params.get("subject")?.trim() ?? "",
      specificArea: params.get("area")?.trim() ?? params.get("specificArea")?.trim() ?? "",
    };
  }, []);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessionTopicOptions, setSessionTopicOptions] = useState<StudySessionTopicOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(quizPrefill.subjectId);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>("");
  const [specificArea, setSpecificArea] = useState(quizPrefill.specificArea);
  const [quizLevel, setQuizLevel] = useState<QuizLevel>("medium");
  const [quizMode, setQuizMode] = useState<QuizMode>("mixed");
  const [questionCount, setQuestionCount] = useState(8);
  const [setupStep, setSetupStep] = useState(1);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjects]
  );
  const subjectSelectOptions = useMemo(
    () => subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects]
  );
  const availableTopicTitles = useMemo(() => {
    const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
    const selectedSubjectName = normalize(selectedSubject?.name);

    const filtered = sessionTopicOptions.filter((item) => {
      if (!selectedSubjectId) return false;
      if (item.subject_id) return item.subject_id === selectedSubjectId;
      return normalize(item.subject) === selectedSubjectName;
    });

    const seen = new Set<string>();
    const titles: string[] = [];
    for (const row of filtered) {
      const title = row.title.trim();
      const key = title.toLowerCase();
      if (!title || seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
    }
    return titles;
  }, [selectedSubject?.name, selectedSubjectId, sessionTopicOptions]);
  const topicSelectOptions = useMemo(
    () => availableTopicTitles.map((title) => ({ value: title, label: title })),
    [availableTopicTitles]
  );
  const topicPlaceholder = !selectedSubjectId
    ? "Select subject first"
    : availableTopicTitles.length > 0
      ? "Pick a study title"
      : "No study titles yet";

  const sidebarNavItems = useMemo(
    () => [
      { id: "study", label: "Study Space", Icon: GitFork, active: false, onClick: onNavigateStudy },
      { id: "knowledge-map", label: "Knowledge Map", Icon: Network, active: false, onClick: onNavigateKnowledgeMap },
      { id: "history", label: "Learning History", Icon: History, active: false, onClick: onNavigateHistory },
      { id: "flashcards", label: "Flashcards", Icon: Layers, active: false, onClick: onNavigateFlashcards },
      { id: "quiz", label: "Quiz", Icon: Brain, active: true, onClick: undefined },
      { id: "achievements", label: "Achievements", Icon: Trophy, active: false, onClick: onNavigateAchievements },
    ],
    [onNavigateAchievements, onNavigateFlashcards, onNavigateHistory, onNavigateKnowledgeMap, onNavigateStudy]
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSubjects = async () => {
      try {
        const response = await getSubjectsCached();
        if (cancelled) return;
        setSubjects(response ?? []);
        const byRequestedId = quizPrefill.subjectId ? response?.find((s) => s.id === quizPrefill.subjectId)?.id : "";
        const normalizedRequestedName = quizPrefill.subjectName.toLowerCase();
        const byRequestedName = normalizedRequestedName ? response?.find((s) => s.name.trim().toLowerCase() === normalizedRequestedName)?.id ?? "" : "";
        const initialSubjectId = byRequestedId || byRequestedName || response?.[0]?.id || "";
        setSelectedSubjectId((current) => (current && response?.some((s) => s.id === current)) ? current : initialSubjectId);
      } catch {
        if (!cancelled) setSubjects([]);
      }
    };
    void loadSubjects();
    return () => { cancelled = true; };
  }, [quizPrefill.subjectId, quizPrefill.subjectName]);

  useEffect(() => {
    let cancelled = false;
    const loadSessionTitles = async () => {
      try {
        const response = await getSessionsCached();
        if (cancelled) return;
        const mapped = (response ?? [])
          .map((row) => ({
            title: String(row.title ?? "").trim(),
            subject_id: row.subject_id ?? null,
            subject: row.subject ?? null,
            created_at: String(row.created_at ?? ""),
          }))
          .filter((row) => row.title.length > 0)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setSessionTopicOptions(mapped);
      } catch {
        if (!cancelled) setSessionTopicOptions([]);
      }
    };
    void loadSessionTitles();
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const handleGenerateQuiz = async () => {
    const payload = {
      subjectId: selectedSubjectId || undefined,
      specificArea: specificArea.trim() || undefined,
      level: quizLevel,
      quizMode,
      questionCount: sanitizeQuestionCount(questionCount),
    };

    try {
      const bundle = await generateQuiz(payload);
      const attempt = await startAttempt(bundle.quiz.id);
      onQuizGenerated(bundle.quiz.id, attempt.id);
    } catch {
      // Error handled by useQuiz
    }
  };

  return (
    <div className="min-h-screen bg-surface-dim text-on-surface overflow-x-hidden">
      <div className="fixed top-20 right-0 h-[480px] w-[480px] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />
      <div className="fixed -left-16 bottom-20 h-[380px] w-[380px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={onNavigateStudy}
        onNavigateKnowledgeMap={onNavigateKnowledgeMap}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        activeMobileMenu="quiz"
        onNavigateAchievements={onNavigateAchievements}
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={(
          <div className="hidden md:flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Quiz Setup</span>
          </div>
        )}
      />
      <AppSidebar
        brandTitle="Practice Grid"
        brandSubtitle="Adaptive Quiz System"
        brandIcon={Brain}
        navItems={sidebarNavItems}
        onSignOut={handleSignOut}
        collapsible
        defaultPinned={false}
        onExpandedChange={setSidebarExpanded}
      />

      <motion.main
        animate={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? 256 : 64) }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative z-10 px-4 pb-32 pt-16 sm:px-6 sm:pt-24"
      >
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-8 items-start">
            <div>
              <section className={`glass-card relative overflow-hidden ${isMobile ? "rounded-[1.25rem] p-4" : "rounded-[1.5rem] p-6 md:p-8"}`}>
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-tertiary/10 blur-3xl" />

                <div className="mb-6 flex items-center justify-between">
                  <h2 className={`flex items-center gap-3 font-headline font-bold ${isMobile ? "text-lg" : "text-xl"}`}>
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_20px_rgba(161,250,255,0.8)]" />
                    {setupStep === 1 && "Proficiency Level"}
                    {setupStep === 2 && "Subject & Topic"}
                    {setupStep === 3 && "Quiz Mode"}
                    {setupStep === 4 && "Question Count"}
                  </h2>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-1 rounded-full transition-all ${
                          s === setupStep ? "w-6 bg-primary" : s < setupStep ? "w-3 bg-primary/40" : "w-3 bg-outline-variant/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="min-h-[240px]">
                  {setupStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <p className="mb-4 text-xs text-on-surface-variant">Select a proficiency level that matches your current understanding.</p>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: "easy", title: "Conceptual", subtitle: "Core definitions & principles.", tone: "text-primary" },
                          { id: "medium", title: "Applied", subtitle: "Scenario-based problems.", tone: "text-primary" },
                          { id: "hard", title: "Mastery", subtitle: "Advanced synthesis.", tone: "text-secondary" },
                        ].map((levelCard) => {
                          const active = quizLevel === levelCard.id;
                          return (
                            <button
                              key={levelCard.id}
                              onClick={() => {
                                setQuizLevel(levelCard.id as QuizLevel);
                                setSetupStep(2);
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all ${
                                active
                                  ? "border-primary/50 bg-surface-container-highest shadow-[0_0_25px_rgba(161,250,255,0.12)]"
                                  : "border-outline-variant/20 bg-surface-container hover:bg-surface-container-high"
                              }`}
                            >
                              <div className={`mb-1 text-[10px] uppercase tracking-[0.18em] ${levelCard.tone}`}>{levelCard.id}</div>
                              <h3 className="font-headline font-bold text-lg">{levelCard.title}</h3>
                              <p className="mt-1 text-xs text-on-surface-variant">{levelCard.subtitle}</p>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Subject (Required)</span>
                          <CustomSelect
                            value={selectedSubjectId}
                            onChange={setSelectedSubjectId}
                            options={subjectSelectOptions}
                            placeholder="Select subject"
                            variant="card"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Topic (Optional)</span>
                          <CustomSelect
                            value={selectedTopicTitle}
                            onChange={(next) => {
                              setSelectedTopicTitle(next);
                              if (next) setSpecificArea(next);
                            }}
                            disabled={!selectedSubjectId}
                            options={topicSelectOptions}
                            placeholder={topicPlaceholder}
                            variant="card"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Specific Area</span>
                        <input
                          value={specificArea}
                          onChange={(event) => setSpecificArea(event.target.value)}
                          placeholder="e.g. linear equations, wave-particle duality"
                          className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary/70 focus:outline-none"
                        />
                      </label>
                    </motion.div>
                  )}

                  {setupStep === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <p className="mb-4 text-xs text-on-surface-variant">Choose your preferred question format.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {([
                          "mixed",
                          "mcq",
                          "short_answer",
                          "numeric",
                          "written",
                        ] as QuizMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setQuizMode(mode);
                              setSetupStep(4);
                            }}
                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                              quizMode === mode
                                ? "border-primary/50 bg-surface-container-highest shadow-[0_0_20px_rgba(161,250,255,0.1)]"
                                : "border-outline-variant/20 bg-surface-container hover:bg-surface-container-high"
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Mode</span>
                            <div className="mt-1 text-sm font-bold text-on-surface capitalize">{mode.replace("_", " ")}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <div className="mb-6 text-center">
                        <label className="mb-6 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                          Question Count: <span className="text-primary text-lg font-bold ml-1">{sanitizeQuestionCount(questionCount)}</span>
                        </label>
                        <input
                          type="range"
                          min={3}
                          max={20}
                          step={1}
                          value={questionCount}
                          onChange={(event) => setQuestionCount(Number(event.target.value))}
                          className="w-full accent-primary h-2 rounded-full"
                        />
                        
                        <div className="mt-10 grid grid-cols-2 gap-4">
                          <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/10">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant mb-1">Duration</p>
                            <p className="font-headline text-xl font-bold text-primary">{Math.max(12, sanitizeQuestionCount(questionCount) * 2)} <span className="text-sm font-normal text-on-surface-variant">min</span></p>
                          </div>
                          <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/10">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant mb-1">Volume</p>
                            <p className="font-headline text-xl font-bold text-secondary">{sanitizeQuestionCount(questionCount)} <span className="text-sm font-normal text-on-surface-variant">Units</span></p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className={`mt-8 flex items-center justify-between border-t border-outline-variant/10 pt-6`}>
                  <div>
                    {setupStep > 1 ? (
                      <button
                        onClick={() => setSetupStep((s) => s - 1)}
                        className="rounded-full bg-surface-container-high px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Back
                      </button>
                    ) : (
                       <button
                        onClick={onNavigateStudy}
                        className="rounded-full bg-surface-container-high px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {setupStep < 4 ? (
                    <button
                      onClick={() => setSetupStep((s) => s + 1)}
                      disabled={setupStep === 2 && !selectedSubjectId}
                      className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-on-primary disabled:opacity-40"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleGenerateQuiz()}
                      disabled={isLoading}
                      className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-3 text-sm font-bold uppercase tracking-[0.16em] text-on-primary shadow-[0_0_30px_rgba(0,244,254,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Start Quiz
                      </span>
                    </button>
                  )}
                </div>

                {error && (
                  <p className="mt-4 rounded-xl bg-error/20 px-4 py-3 text-xs text-red-200">{error}</p>
                )}
              </section>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
