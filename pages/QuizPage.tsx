import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  GitFork,
  History,
  Layers,
  Loader2,
  Network,
  Target,
  Trophy,
  Upload,
  XCircle,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { api } from "../lib/api";
import { useQuiz } from "../hooks/useQuiz";
import type {
  QuizAttemptResult,
  QuizBundle,
  QuizHistoryItem,
  QuizQuestion,
} from "../types/quiz.types";

interface LocalAnswerState {
  answerText: string;
  answerJson: Record<string, unknown>;
  uploadId?: string;
  extractedText?: string;
  uploadWarnings?: string[];
}

interface StudyBreakdownPayload {
  id?: string;
  title: string;
  subject: string;
  nodes: Array<Record<string, unknown>>;
  insights: {
    simpleBreakdown: string;
    keyFormula: string;
  };
  nodeInsights?: Record<string, { simpleBreakdown: string; keyFormula: string }>;
  nodeConversations?: Record<string, Array<{ role: string; content: string; createdAt: string }>>;
  nodePositions?: Record<string, { x: number; y: number }>;
}

interface Props {
  user: any;
  onNavigateStudy?: (breakdown?: StudyBreakdownPayload | null) => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateKnowledgeMap?: () => void;
  onNavigateAchievements?: () => void;
  onNavigateSettings?: () => void;
  onNavigateQuizSetup?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
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

export default function QuizPage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateKnowledgeMap,
  onNavigateAchievements,
  onNavigateSettings,
  onNavigateQuizSetup,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const {
    isLoading: quizLoading,
    error,
    getQuiz,
    saveAnswer,
    attachAnswerImage,
    submitAttempt,
    gradeAttempt,
    getResult,
    getHistory,
    startAttempt,
  } = useQuiz();

  const [step, setStep] = useState<"taking" | "result">("taking");
  const [activeQuiz, setActiveQuiz] = useState<QuizBundle | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, LocalAnswerState>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openingQuizId, setOpeningQuizId] = useState<string | null>(null);
  const [hasSessionParams, setHasSessionParams] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [convertingAnswerId, setConvertingAnswerId] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));

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

  const activeQuestions = activeQuiz?.questions ?? [];

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get("quizId")?.trim() ?? "";
    const aId = params.get("attemptId")?.trim() ?? "";
    const hasParams = Boolean(qId && aId);
    setHasSessionParams(hasParams);

    if (hasParams) {
      void loadQuiz(qId, aId);
    }
  }, []);

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

  const loadQuiz = async (qId: string, aId: string) => {
    try {
      const bundle = await getQuiz(qId);
      const attemptResult = await getResult(aId);
      const latestStatus = attemptResult.attempt.status;

      setActiveQuiz(bundle);
      setAttemptId(aId);
      setAnswers(buildLocalAnswersFromResult(attemptResult));

      if (latestStatus === "graded") {
        setResult(attemptResult);
        setStep("result");
      } else {
        setResult(null);
        setStep("taking");
      }
    } catch {
      // Error handled by useQuiz
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const rows = await getHistory(20);
        if (cancelled) return;
        setHistory(rows);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [getHistory]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const handleOpenHistoryQuiz = async (item: QuizHistoryItem) => {
    if (!item?.id) return;
    setOpeningQuizId(item.id);

    try {
      const targetAttemptId = item.latest_attempt?.id || (await startAttempt(item.id)).id;
      window.history.pushState(
        { page: "quiz" },
        "",
        `/quiz?quizId=${encodeURIComponent(item.id)}&attemptId=${encodeURIComponent(targetAttemptId)}`
      );
      setHasSessionParams(true);
      await loadQuiz(item.id, targetAttemptId);
    } catch {
      // Error handled by useQuiz
    } finally {
      setOpeningQuizId(null);
    }
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
    } catch {
      // Error state is handled by useQuiz hook.
    } finally {
      setSubmitting(false);
    }
  };

  const handleLearnQuestionInStudy = async (answer: QuizAttemptResult["answers"][number]) => {
    if (!result) return;
    setConvertingAnswerId(answer.id);

    try {
      const sourceQuestion = result.questions.find((question) => question.id === answer.question_id);
      const questionText = sourceQuestion?.question_text?.trim() || answer.question_text?.trim() || "";
      if (!questionText) return;

      const instructions = sourceQuestion?.instructions?.trim() || "";
      const correction = answer.correction?.trim() || "";
      const problemText = [questionText, instructions ? `Instructions:\n${instructions}` : "", correction ? `Expected answer:\n${correction}` : ""]
        .filter(Boolean)
        .join("\n\n");

      const { breakdown } = await api.post<{ breakdown: StudyBreakdownPayload }>("/api/ai/breakdown", {
        problem: problemText,
      });

      let sessionId: string | null = null;
      try {
        const { session } = await api.post<{ session: { id: string } }>("/api/sessions", {
          title: breakdown.title,
          subject: breakdown.subject,
          problem: problemText,
          node_count: breakdown.nodes.length,
          breakdown_json: JSON.stringify(breakdown),
        });
        sessionId = session.id;
      } catch {
        // Saving the session is non-blocking for navigation.
      }

      const hydratedBreakdown: StudyBreakdownPayload = {
        ...breakdown,
        id: sessionId ?? breakdown.id,
      };

      if (onNavigateStudy) {
        onNavigateStudy(hydratedBreakdown);
        return;
      }
    } catch {
      // Error state is handled by existing page-level error banner when possible.
    } finally {
      setConvertingAnswerId(null);
    }
  };

  if (hasSessionParams && quizLoading && !activeQuiz) {
    return (
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeQuiz) {
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
              <History className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Quiz History</span>
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
            <header className={`flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end ${isMobile ? "mb-4" : "mb-8"}`}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Quiz History</p>
                <h1 className={`font-headline font-bold tracking-tight ${isMobile ? "text-2xl" : "text-3xl md:text-4xl"}`}>Your Quiz Sessions</h1>
                <p className={`mt-2 text-on-surface-variant ${isMobile ? "text-xs" : "text-sm"}`}>
                  Review previous attempts or start a new quiz setup.
                </p>
              </div>
              <button
                onClick={() => onNavigateQuizSetup?.()}
                className="rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary"
              >
                Setup New Quiz
              </button>
            </header>

            <section className={`glass-card ${isMobile ? "rounded-[1.25rem] p-4" : "rounded-[1.5rem] p-6"}`}>
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-xl bg-surface-container p-4 text-center">
                  <p className="text-sm font-semibold text-on-surface">No quiz history yet</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Create your first quiz from setup.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item) => {
                    const latestStatus = item.latest_attempt?.status;
                    const historyActionLabel = latestStatus === "graded" ? "View" : "Resume";
                    const isOpening = openingQuizId === item.id;

                    return (
                      <div key={item.id} className="rounded-xl bg-surface-container p-3 border border-outline-variant/5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                            <p className="text-[10px] text-on-surface-variant">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          {latestStatus === "graded" ? (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                              {Math.round(item.latest_attempt?.percentage ?? 0)}%
                            </span>
                          ) : (
                            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant shrink-0">
                              {latestStatus ?? "new"}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => void handleOpenHistoryQuiz(item)}
                            disabled={quizLoading || isOpening}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary disabled:opacity-60"
                          >
                            {isOpening ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                            {historyActionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {error && (
              <p className="mt-4 rounded-xl bg-error/20 px-4 py-3 text-xs text-red-200">{error}</p>
            )}
          </div>
        </motion.main>
      </div>
    );
  }

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
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Quiz Session</span>
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
        <div className="mx-auto max-w-6xl">
          {step === "taking" && activeQuiz && (
            <>
              <header className={`flex flex-col justify-between gap-3 md:flex-row md:items-end ${isMobile ? "mb-4" : "mb-6"}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-medium">Active Session</p>
                  <h1 className={`font-headline font-bold ${isMobile ? "text-xl" : "text-2xl md:text-3xl"}`}>{activeQuiz.quiz.title}</h1>
                  <p className={`mt-1 text-on-surface-variant ${isMobile ? "text-xs" : "text-sm"}`}>{activeQuiz.quiz.description}</p>
                </div>

                <div className={`flex items-center gap-3 rounded-xl bg-surface-container px-3 py-2 ${isMobile ? "self-start" : ""}`}>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Clock3 className="h-3.5 w-3.5 text-primary" />
                    {activeQuestions.length} Qs
                  </div>
                  <div className="h-5 w-px bg-outline-variant/20" />
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Target className="h-3.5 w-3.5 text-tertiary" />
                    {activeQuiz.quiz.total_marks} Pts
                  </div>
                </div>
              </header>

              <div className="space-y-3">
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
                      className={`glass-card ${isMobile ? "rounded-[1rem] p-3.5" : "rounded-[1.25rem] p-5"}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant font-medium">
                            Question {question.question_order}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-on-surface leading-snug">{question.question_text}</h3>
                          {question.instructions && (
                            <p className="mt-1.5 text-xs text-on-surface-variant">{question.instructions}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant whitespace-nowrap">
                          {question.marks} pt{question.marks > 1 ? "s" : ""}
                        </span>
                      </div>

                      {question.question_type === "mcq" ? (
                        <div className="space-y-1.5">
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
                                className={`block w-full rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
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
                          className="w-full rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary/60 focus:outline-none"
                          placeholder="Numeric answer"
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
                          className="min-h-24 w-full rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary/60 focus:outline-none"
                          placeholder="Your answer..."
                        />
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface">
                          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Image
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
                          <span className="text-[10px] text-tertiary">
                            Extracted ({answer?.uploadWarnings?.length ? "!" : "ok"})
                          </span>
                        )}
                        {!extractedText && answer?.uploadWarnings?.length ? (
                          <span className="text-[10px] text-red-200">{answer.uploadWarnings[0]}</span>
                        ) : null}
                      </div>
                    </motion.section>
                  );
                })}
              </div>

              <div className={`${isMobile ? "sticky bottom-14 z-20 mt-4 -mx-4 border-t border-outline-variant/20 bg-surface-dim/90 px-4 py-3 backdrop-blur" : "mt-6 flex justify-end"}`}>
                <button
                  onClick={() => void handleSubmitQuiz()}
                  disabled={submitting || quizLoading}
                  className={`${isMobile ? "w-full px-6 py-3 text-base" : "px-8 py-3 text-base"} rounded-full bg-gradient-to-r from-primary to-secondary font-headline font-bold text-on-primary disabled:opacity-60`}
                >
                  <span className="inline-flex items-center gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Submit & Grade
                  </span>
                </button>
              </div>
            </>
          )}

          {step === "result" && result && (
            <>
              <header className={`${isMobile ? "mb-5 rounded-[1rem] p-4" : "mb-6 rounded-[1.5rem] p-6"} bg-gradient-to-br from-surface-container-highest/80 to-surface-container/70`}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant font-medium">Quiz Result</p>
                <h1 className={`mt-1 font-headline font-bold ${isMobile ? "text-3xl" : "text-4xl"}`}>{Math.round(result.attempt.percentage)}%</h1>
                <p className={`mt-1 text-on-surface-variant ${isMobile ? "text-xs" : "text-sm"}`}>
                  {result.attempt.feedback_summary || "Quiz graded successfully."}
                </p>
                <div className={`text-on-surface-variant ${isMobile ? "mt-3 grid grid-cols-1 gap-1 text-[10px]" : "mt-4 flex flex-wrap gap-5 text-xs"}`}>
                  <span>{result.attempt.score} / {result.attempt.total_marks} marks</span>
                  <span>{result.questions.length} questions</span>
                  <span>Graded {formatDate(result.attempt.graded_at)}</span>
                </div>
              </header>

              <section className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${isMobile ? "mb-4" : "mb-5"}`}>
                <div className={`glass-card ${isMobile ? "rounded-[1rem] p-3.5" : "rounded-[1.25rem] p-5"}`}>
                  <h2 className={`font-headline font-bold ${isMobile ? "text-lg" : "text-xl"}`}>Strengths</h2>
                  <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
                    {(result.attempt.strengths ?? []).map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`glass-card ${isMobile ? "rounded-[1rem] p-3.5" : "rounded-[1.25rem] p-5"}`}>
                  <h2 className={`font-headline font-bold ${isMobile ? "text-lg" : "text-xl"}`}>Improvement Areas</h2>
                  <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
                    {(result.attempt.improvement_areas ?? []).map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-3.5 w-3.5 text-tertiary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className={`${isMobile ? "space-y-2.5" : "space-y-3"}`}>
                <h2 className={`font-headline font-bold ${isMobile ? "text-xl" : "text-2xl"}`}>Per-Question Review</h2>
                {result.answers
                  .slice()
                  .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
                  .map((answer) => {
                    const isCorrect = Boolean(answer.is_correct);
                    const isConverting = convertingAnswerId === answer.id;
                    return (
                      <div key={answer.id} className={`glass-card ${isMobile ? "rounded-[0.75rem] p-3.5" : "rounded-[1rem] p-4"}`}>
                        <div className="mb-1.5 flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-on-surface leading-snug">
                            Q{answer.question_order ?? "-"}: {answer.question_text}
                          </p>
                          <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] ${
                            isCorrect
                              ? "bg-primary/20 text-primary"
                              : "bg-error/20 text-red-200"
                          }`}>
                            {isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {answer.awarded_marks}/{answer.question_marks}
                          </span>
                        </div>
                        {answer.ai_feedback && (
                          <p className="text-xs text-on-surface-variant leading-relaxed">{answer.ai_feedback}</p>
                        )}
                        {answer.correction && !isCorrect && (
                          <p className="mt-1.5 text-[10px] text-tertiary italic">Suggested correction: {answer.correction}</p>
                        )}
                        <div className="mt-2.5 flex justify-end">
                          <button
                            onClick={() => void handleLearnQuestionInStudy(answer)}
                            disabled={isConverting || quizLoading}
                            className={`inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${isMobile ? "w-full justify-center" : ""}`}
                          >
                            {isConverting ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitFork className="h-3 w-3" />}
                            Learn In Study Space
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </section>

              <div className={`mt-8 flex gap-3 ${isMobile ? "flex-col" : "flex-wrap"}`}>
                <button
                  onClick={() => onNavigateQuizSetup?.()}
                  className={`rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-primary ${isMobile ? "w-full text-center" : ""}`}
                >
                  Start New Quiz
                </button>
                <button
                  onClick={() => onNavigateStudy?.()}
                  className={`rounded-full bg-surface-container-high px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant ${isMobile ? "w-full text-center" : ""}`}
                >
                  Back To Study
                </button>
              </div>
            </>
          )}
        </div>
      </motion.main>
    </div>
  );
}
