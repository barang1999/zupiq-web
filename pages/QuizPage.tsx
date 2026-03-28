import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GitFork,
  HelpCircle,
  History,
  Layers,
  Loader2,
  LogOut,
  Sigma,
  Sparkles,
  Target,
  Upload,
  Users,
  Waves,
  XCircle,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { CustomSelect } from "../components/ui/CustomSelect";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { api } from "../lib/api";
import { useQuiz } from "../hooks/useQuiz";
import type {
  MasteryItem,
  QuizAttemptResult,
  QuizBundle,
  QuizHistoryItem,
  QuizLevel,
  QuizMode,
  QuizQuestion,
} from "../types/quiz.types";
import type { Subject } from "../types/subject.types";

interface LocalAnswerState {
  answerText: string;
  answerJson: Record<string, unknown>;
  uploadId?: string;
  extractedText?: string;
  uploadWarnings?: string[];
}

interface StudySessionTopicOption {
  title: string;
  subject_id: string | null;
  subject: string | null;
  created_at: string;
}

interface Props {
  user: any;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes("physics") || s.includes("quantum")) return Waves;
  if (s.includes("chem")) return FlaskConical;
  if (s.includes("math") || s.includes("calculus") || s.includes("algebra")) return Sigma;
  return Layers;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function sanitizeQuestionCount(value: number): number {
  if (!Number.isFinite(value)) return 8;
  return Math.max(3, Math.min(20, Math.round(value)));
}

export default function QuizPage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const userId = user?.id ?? user?.sub ?? "";
  const {
    isLoading,
    error,
    generateQuiz,
    getQuiz,
    startAttempt,
    saveAnswer,
    attachAnswerImage,
    submitAttempt,
    gradeAttempt,
    getResult,
    getHistory,
    getMastery,
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

  const [step, setStep] = useState<"setup" | "taking" | "result">("setup");
  const [activeQuiz, setActiveQuiz] = useState<QuizBundle | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, LocalAnswerState>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumingQuizId, setResumingQuizId] = useState<string | null>(null);

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
      : "No study titles yet (use Specific Area below)";

  const navItems = useMemo(
    () => [
      { id: "study", label: "Study Space", Icon: GitFork, action: onNavigateStudy },
      { id: "history", label: "Learning History", Icon: History, action: onNavigateHistory },
      { id: "flashcards", label: "Flashcards", Icon: Layers, action: onNavigateFlashcards },
      { id: "quiz", label: "Quiz", Icon: Brain, action: undefined },
      { id: "collab", label: "Collaborate", Icon: Users, action: undefined },
    ],
    [onNavigateFlashcards, onNavigateHistory, onNavigateStudy]
  );

  const selectedAreaSuggestions = useMemo(() => {
    const values = availableTopicTitles.slice(0, 8);
    if (selectedTopicTitle) values.unshift(selectedTopicTitle);
    return Array.from(new Set(values)).slice(0, 6);
  }, [availableTopicTitles, selectedTopicTitle]);

  const activeQuestions = activeQuiz?.questions ?? [];

  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      try {
        const response = await api.get<{ subjects: Subject[] }>("/api/subjects");
        if (cancelled) return;
        setSubjects(response.subjects ?? []);

        const byRequestedId = quizPrefill.subjectId
          ? response.subjects?.find((subject) => subject.id === quizPrefill.subjectId)?.id
          : "";
        const normalizedRequestedName = quizPrefill.subjectName.toLowerCase();
        const byRequestedName = normalizedRequestedName
          ? response.subjects?.find((subject) => subject.name.trim().toLowerCase() === normalizedRequestedName)?.id ?? ""
          : "";
        const initialSubjectId = byRequestedId || byRequestedName || response.subjects?.[0]?.id || "";
        setSelectedSubjectId((current) => {
          if (current && response.subjects?.some((subject) => subject.id === current)) return current;
          return initialSubjectId;
        });
      } catch {
        if (cancelled) return;
        setSubjects([]);
      }
    };

    void loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [quizPrefill.subjectId, quizPrefill.subjectName]);

  useEffect(() => {
    let cancelled = false;

    const loadSessionTitles = async () => {
      try {
        const response = await api.get<{
          sessions: Array<{
            title?: string | null;
            subject_id?: string | null;
            subject?: string | null;
            created_at?: string | null;
          }>;
        }>("/api/sessions");
        if (cancelled) return;
        const mapped = (response.sessions ?? [])
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
        if (cancelled) return;
        setSessionTopicOptions([]);
      }
    };

    void loadSessionTitles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedTopicTitle && !availableTopicTitles.includes(selectedTopicTitle)) {
      setSelectedTopicTitle("");
    }
  }, [availableTopicTitles, selectedTopicTitle]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadUserStats = async () => {
      try {
        const [historyRows, masteryRows] = await Promise.all([
          getHistory(8),
          getMastery(userId),
        ]);
        if (cancelled) return;
        setHistory(historyRows);
        setMastery(masteryRows);
      } catch {
        if (cancelled) return;
      }
    };

    void loadUserStats();

    return () => {
      cancelled = true;
    };
  }, [getHistory, getMastery, userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const updateAnswerState = (questionId: string, next: Partial<LocalAnswerState>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        answerText: prev[questionId]?.answerText ?? "",
        answerJson: prev[questionId]?.answerJson ?? {},
        ...prev[questionId],
        ...next,
      },
    }));
  };

  const persistAnswer = async (questionId: string) => {
    if (!attemptId) return;
    const answer = answers[questionId];
    if (!answer) return;

    const hasText = Boolean(answer.answerText?.trim());
    const hasJson = Object.keys(answer.answerJson ?? {}).length > 0;
    if (!hasText && !hasJson) return;

    await saveAnswer(attemptId, {
      questionId,
      answerText: answer.answerText,
      answerJson: answer.answerJson,
    });
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

      setActiveQuiz(bundle);
      setAttemptId(attempt.id);
      setAnswers({});
      setResult(null);
      setStep("taking");
    } catch {
      // Error state is handled by useQuiz hook.
    }
  };

  const buildLocalAnswersFromResult = (attemptResult: QuizAttemptResult): Record<string, LocalAnswerState> => {
    const toAnswerText = (answer: QuizAttemptResult["answers"][number]): string => {
      const answerText = answer.answer_text?.trim();
      if (answerText) return answerText;

      const extracted = answer.extracted_text?.trim();
      if (extracted) return extracted;

      const answerJson = answer.answer_json ?? {};
      const option = typeof answerJson.option === "string" ? answerJson.option.trim() : "";
      if (option) return option;

      const value = answerJson.value;
      if (typeof value === "string") return value;
      if (typeof value === "number") return String(value);
      return "";
    };

    const mapped: Record<string, LocalAnswerState> = {};
    for (const answer of attemptResult.answers) {
      mapped[answer.question_id] = {
        answerText: toAnswerText(answer),
        answerJson: answer.answer_json ?? {},
        uploadId: answer.answer_upload_id ?? undefined,
        extractedText: answer.extracted_text ?? undefined,
      };
    }
    return mapped;
  };

  const handleOpenHistoryQuiz = async (item: QuizHistoryItem) => {
    if (!item?.id) return;
    setResumingQuizId(item.id);

    try {
      const bundle = await getQuiz(item.id);
      const latestAttempt = item.latest_attempt;

      if (!latestAttempt) {
        const createdAttempt = await startAttempt(item.id);
        setActiveQuiz(bundle);
        setAttemptId(createdAttempt.id);
        setAnswers({});
        setResult(null);
        setStep("taking");
        return;
      }

      const attemptResult = await getResult(latestAttempt.id);
      const latestStatus = attemptResult.attempt.status;

      if (latestStatus === "graded") {
        setActiveQuiz(bundle);
        setAttemptId(attemptResult.attempt.id);
        setAnswers(buildLocalAnswersFromResult(attemptResult));
        setResult(attemptResult);
        setStep("result");
        return;
      }

      setActiveQuiz(bundle);
      setAttemptId(attemptResult.attempt.id);
      setAnswers(buildLocalAnswersFromResult(attemptResult));
      setResult(null);
      setStep("taking");
    } catch {
      // Error state is handled by useQuiz hook.
    } finally {
      setResumingQuizId(null);
    }
  };

  const handleUploadAnswerImage = async (question: QuizQuestion, file: File | null) => {
    if (!file || !attemptId) return;
    setUploadingQuestionId(question.id);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("context", "general");
      const uploaded = await api.upload<{ uploads: Array<{ id: string }> }>("/api/uploads", form);
      const uploadId = uploaded.uploads?.[0]?.id;
      if (!uploadId) return;

      updateAnswerState(question.id, { uploadId });
      const response = await attachAnswerImage(attemptId, question.id, uploadId);

      if (response.extraction?.extractedText) {
        updateAnswerState(question.id, {
          extractedText: response.extraction.extractedText,
          uploadWarnings: response.extraction.warnings ?? [],
        });
      }
    } catch {
      updateAnswerState(question.id, {
        uploadWarnings: ["Image upload or extraction failed."],
      });
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const persistAllAnswers = async () => {
    if (!activeQuiz || !attemptId) return;

    for (const question of activeQuiz.questions) {
      const answer = answers[question.id];
      if (!answer) continue;

      const hasText = Boolean(answer.answerText?.trim());
      const hasJson = Object.keys(answer.answerJson ?? {}).length > 0;
      if (!hasText && !hasJson) continue;

      await saveAnswer(attemptId, {
        questionId: question.id,
        answerText: answer.answerText,
        answerJson: answer.answerJson,
      });
    }
  };

  const handleSubmitQuiz = async () => {
    if (!attemptId) return;
    setSubmitting(true);

    try {
      await persistAllAnswers();
      await submitAttempt(attemptId);
      const graded = await gradeAttempt(attemptId);
      setResult(graded);
      setStep("result");

      if (userId) {
        const [historyRows, masteryRows] = await Promise.all([getHistory(8), getMastery(userId)]);
        setHistory(historyRows);
        setMastery(masteryRows);
      }
    } catch {
      // Error state is handled by useQuiz hook.
    } finally {
      setSubmitting(false);
    }
  };

  const resetToSetup = () => {
    setStep("setup");
    setActiveQuiz(null);
    setAttemptId(null);
    setAnswers({});
    setResult(null);
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
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        activeMobileMenu="quiz"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={(
          <div className="hidden md:flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Quiz Arena</span>
          </div>
        )}
      />

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col bg-surface-container-low pt-20 pb-6 sm:flex">
        <div className="px-6 pb-8">
          <h2 className="font-headline text-lg font-bold text-primary">Practice Grid</h2>
          <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Adaptive Quiz System</p>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {navItems.map(({ id, label, Icon, action }) => {
            const isActive = id === "quiz";
            return (
              <button
                key={id}
                onClick={action}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-outline-variant/20 px-3 pt-4">
          <a
            href="#"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Support</span>
          </a>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="relative z-10 px-6 pb-32 pt-24 sm:ml-64 sm:px-10 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          {step === "setup" && (
            <>
              <header className="mb-12">
                <h1 className="font-headline text-5xl font-bold tracking-tight md:text-6xl">Quiz Setup</h1>
                <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
                  Choose a subject, optionally narrow it by topic, then set level, mode, and question count.
                </p>
              </header>

              <section className="glass-card relative overflow-hidden rounded-[2rem] p-8 md:p-10">
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-tertiary/10 blur-3xl" />

                <h2 className="mb-7 flex items-center gap-3 font-headline text-2xl font-bold">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_20px_rgba(161,250,255,0.8)]" />
                  Select Proficiency Target
                </h2>

                <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {[
                    {
                      id: "easy",
                      title: "Conceptual",
                      subtitle: "Core definitions and basic principles.",
                      tone: "text-primary",
                    },
                    {
                      id: "medium",
                      title: "Applied",
                      subtitle: "Scenario-based problems with reasoning.",
                      tone: "text-primary",
                    },
                    {
                      id: "hard",
                      title: "Mastery",
                      subtitle: "Advanced synthesis and constraint handling.",
                      tone: "text-secondary",
                    },
                  ].map((levelCard) => {
                    const active = quizLevel === levelCard.id;
                    return (
                      <button
                        key={levelCard.id}
                        onClick={() => setQuizLevel(levelCard.id as QuizLevel)}
                        className={`rounded-3xl border p-6 text-left transition-all ${
                          active
                            ? "border-primary/50 bg-surface-container-highest shadow-[0_0_25px_rgba(161,250,255,0.18)]"
                            : "border-outline-variant/20 bg-surface-container hover:bg-surface-container-high"
                        }`}
                      >
                        <div className={`mb-4 text-sm uppercase tracking-[0.18em] ${levelCard.tone}`}>{levelCard.id}</div>
                        <h3 className="font-headline text-2xl font-bold">{levelCard.title}</h3>
                        <p className="mt-2 text-sm text-on-surface-variant">{levelCard.subtitle}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                    <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Topic (From Study Titles)</span>
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
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Select one of your past Study titles to prefill Specific Area.
                    </p>
                  </label>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Specific Area</label>
                  <input
                    value={specificArea}
                    onChange={(event) => setSpecificArea(event.target.value)}
                    placeholder="e.g. linear equations, wave-particle duality"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary/70 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAreaSuggestions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setSpecificArea(item)}
                        className="rounded-full bg-surface-container-highest px-3 py-1 text-xs text-on-surface-variant transition-colors hover:text-primary"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">Quiz Mode</label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        "mixed",
                        "mcq",
                        "short_answer",
                        "numeric",
                        "written",
                      ] as QuizMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setQuizMode(mode)}
                          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
                            quizMode === mode
                              ? "bg-gradient-to-r from-primary to-secondary text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {mode.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                      Questions ({sanitizeQuestionCount(questionCount)})
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      step={1}
                      value={questionCount}
                      onChange={(event) => setQuestionCount(Number(event.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                <div className="mt-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Duration</p>
                      <p className="font-headline text-xl font-bold">{Math.max(12, sanitizeQuestionCount(questionCount) * 2)} Minutes</p>
                    </div>
                    <div className="h-9 w-px bg-outline-variant/30" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Questions</p>
                      <p className="font-headline text-xl font-bold">{sanitizeQuestionCount(questionCount)} Units</p>
                    </div>
                  </div>

                  <button
                    onClick={() => void handleGenerateQuiz()}
                    disabled={isLoading}
                    className="rounded-full bg-gradient-to-r from-primary to-secondary px-10 py-4 font-headline text-lg font-bold text-on-primary shadow-[0_0_30px_rgba(0,244,254,0.25)] transition-all hover:shadow-[0_0_45px_rgba(255,81,250,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                      Generate Quiz
                    </span>
                  </button>
                </div>

                {error && (
                  <p className="mt-4 rounded-xl bg-error/20 px-4 py-3 text-sm text-red-200">{error}</p>
                )}
              </section>

              <section className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="glass-card rounded-[1.75rem] p-6">
                  <h3 className="font-headline text-2xl font-bold">Recent Quiz History</h3>
                  {history.length === 0 ? (
                    <p className="mt-3 text-sm text-on-surface-variant">No quiz history yet. Generate your first session.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {history.map((item) => {
                        const Icon = subjectIcon(item.title || selectedSubject?.name || "General");
                        const latestStatus = item.latest_attempt?.status;
                        const historyActionLabel = latestStatus === "graded"
                          ? "View Result"
                          : latestStatus === "in_progress" || latestStatus === "submitted"
                            ? "Continue Quiz"
                            : "Start Quiz";
                        const isResuming = resumingQuizId === item.id;

                        return (
                          <div key={item.id} className="rounded-2xl bg-surface-container p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-full bg-surface-container-high p-2 text-primary">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-on-surface">{item.title}</p>
                                  <p className="text-xs text-on-surface-variant">{formatDate(item.created_at)}</p>
                                </div>
                              </div>
                              {item.latest_attempt?.status === "graded" ? (
                                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                                  {Math.round(item.latest_attempt.percentage)}%
                                </span>
                              ) : (
                                <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                                  {item.latest_attempt?.status ?? "new"}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => void handleOpenHistoryQuiz(item)}
                                disabled={isLoading || isResuming}
                                className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isResuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                {historyActionLabel}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-[1.75rem] p-6">
                  <h3 className="font-headline text-2xl font-bold">Mastery Overview</h3>
                  {mastery.length === 0 ? (
                    <p className="mt-3 text-sm text-on-surface-variant">Mastery scores appear after graded attempts.</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {mastery.slice(0, 5).map((item) => (
                        <div key={item.id}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-on-surface">{item.topic_name || item.subject_name || "General"}</span>
                            <span className="font-semibold text-tertiary">{Math.round(item.mastery_score)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-container-high">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                              style={{ width: `${Math.max(4, Math.min(100, item.mastery_score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {step === "taking" && activeQuiz && (
            <>
              <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Active Session</p>
                  <h1 className="font-headline text-4xl font-bold md:text-5xl">{activeQuiz.quiz.title}</h1>
                  <p className="mt-2 text-on-surface-variant">{activeQuiz.quiz.description}</p>
                </div>

                <div className="flex items-center gap-4 rounded-2xl bg-surface-container px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {activeQuestions.length} Questions
                  </div>
                  <div className="h-6 w-px bg-outline-variant/20" />
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Target className="h-4 w-4 text-tertiary" />
                    {activeQuiz.quiz.total_marks} Marks
                  </div>
                </div>
              </header>

              <div className="space-y-5">
                {activeQuestions.map((question, index) => {
                  const answer = answers[question.id];
                  const answerText = answer?.answerText ?? "";
                  const extractedText = answer?.extractedText;
                  const uploading = uploadingQuestionId === question.id;

                  return (
                    <motion.section
                      key={question.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="glass-card rounded-[1.5rem] p-6"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                            Question {question.question_order}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-on-surface">{question.question_text}</h3>
                          {question.instructions && (
                            <p className="mt-2 text-sm text-on-surface-variant">{question.instructions}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                          {question.marks} mark{question.marks > 1 ? "s" : ""}
                        </span>
                      </div>

                      {question.question_type === "mcq" ? (
                        <div className="space-y-2">
                          {question.options.map((option) => {
                            const selected = answerText === option;
                            return (
                              <button
                                key={option}
                                onClick={() => {
                                  updateAnswerState(question.id, {
                                    answerText: option,
                                    answerJson: { option, value: option },
                                  });
                                  void saveAnswer(attemptId!, {
                                    questionId: question.id,
                                    answerText: option,
                                    answerJson: { option, value: option },
                                  });
                                }}
                                className={`block w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                                  selected
                                    ? "border-primary/70 bg-primary/10 text-on-surface"
                                    : "border-outline-variant/25 bg-surface-container hover:border-primary/30"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : question.question_type === "numeric" ? (
                        <input
                          type="text"
                          value={answerText}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateAnswerState(question.id, {
                              answerText: value,
                              answerJson: { value },
                            });
                          }}
                          onBlur={() => {
                            void persistAnswer(question.id);
                          }}
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-on-surface focus:border-primary/60 focus:outline-none"
                          placeholder="Enter numeric answer"
                        />
                      ) : (
                        <textarea
                          value={answerText}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateAnswerState(question.id, {
                              answerText: value,
                              answerJson: { value },
                            });
                          }}
                          onBlur={() => {
                            void persistAnswer(question.id);
                          }}
                          className="min-h-28 w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-on-surface focus:border-primary/60 focus:outline-none"
                          placeholder="Type your answer here"
                        />
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-xs uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Upload Answer Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading || !attemptId}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              event.currentTarget.value = "";
                              void handleUploadAnswerImage(question, file);
                            }}
                          />
                        </label>

                        {extractedText && (
                          <span className="text-xs text-tertiary">
                            Extracted text added ({answer?.uploadWarnings?.length ? "review suggested" : "ready"})
                          </span>
                        )}
                        {!extractedText && answer?.uploadWarnings?.length ? (
                          <span className="text-xs text-red-200">{answer.uploadWarnings[0]}</span>
                        ) : null}
                      </div>
                    </motion.section>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => void handleSubmitQuiz()}
                  disabled={submitting || isLoading}
                  className="rounded-full bg-gradient-to-r from-primary to-secondary px-10 py-4 font-headline text-lg font-bold text-on-primary disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    Submit & Grade
                  </span>
                </button>
              </div>
            </>
          )}

          {step === "result" && result && (
            <>
              <header className="mb-10 rounded-[2rem] bg-gradient-to-br from-surface-container-highest/80 to-surface-container/70 p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Quiz Result</p>
                <h1 className="mt-2 font-headline text-5xl font-bold">{Math.round(result.attempt.percentage)}%</h1>
                <p className="mt-2 text-on-surface-variant">
                  {result.attempt.feedback_summary || "Quiz graded successfully."}
                </p>
                <div className="mt-5 flex flex-wrap gap-6 text-sm text-on-surface-variant">
                  <span>{result.attempt.score} / {result.attempt.total_marks} marks</span>
                  <span>{result.questions.length} questions</span>
                  <span>Graded {formatDate(result.attempt.graded_at)}</span>
                </div>
              </header>

              <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="glass-card rounded-[1.5rem] p-6">
                  <h2 className="font-headline text-2xl font-bold">Strengths</h2>
                  <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    {(result.attempt.strengths ?? []).map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card rounded-[1.5rem] p-6">
                  <h2 className="font-headline text-2xl font-bold">Improvement Areas</h2>
                  <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    {(result.attempt.improvement_areas ?? []).map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-4 w-4 text-tertiary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="font-headline text-3xl font-bold">Per-Question Review</h2>
                {result.answers
                  .slice()
                  .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
                  .map((answer) => {
                    const isCorrect = Boolean(answer.is_correct);
                    return (
                      <div key={answer.id} className="glass-card rounded-[1.25rem] p-5">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="font-semibold text-on-surface">
                            Q{answer.question_order ?? "-"}: {answer.question_text}
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                            isCorrect
                              ? "bg-primary/20 text-primary"
                              : "bg-error/20 text-red-200"
                          }`}>
                            {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {answer.awarded_marks} / {answer.question_marks}
                          </span>
                        </div>
                        {answer.ai_feedback && (
                          <p className="text-sm text-on-surface-variant">{answer.ai_feedback}</p>
                        )}
                        {answer.correction && !isCorrect && (
                          <p className="mt-2 text-xs text-tertiary">Suggested correction: {answer.correction}</p>
                        )}
                      </div>
                    );
                  })}
              </section>

              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  onClick={resetToSetup}
                  className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-3 text-sm font-bold uppercase tracking-[0.16em] text-on-primary"
                >
                  Start New Quiz
                </button>
                <button
                  onClick={onNavigateStudy}
                  className="rounded-full bg-surface-container-high px-8 py-3 text-sm font-bold uppercase tracking-[0.16em] text-on-surface-variant"
                >
                  Back To Study
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
