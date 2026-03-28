import { useCallback, useState } from "react";
import { api } from "../lib/api";
import type {
  GenerateQuizDTO,
  MasteryItem,
  QuizAttempt,
  QuizAttemptResult,
  QuizBundle,
  QuizHistoryItem,
  SaveQuizAnswerDTO,
} from "../types/quiz.types";

interface UseQuizReturn {
  isLoading: boolean;
  error: string | null;
  generateQuiz: (dto: GenerateQuizDTO) => Promise<QuizBundle>;
  getQuiz: (quizId: string) => Promise<QuizBundle>;
  startAttempt: (quizId: string) => Promise<QuizAttempt>;
  saveAnswer: (attemptId: string, dto: SaveQuizAnswerDTO) => Promise<void>;
  attachAnswerImage: (
    attemptId: string,
    questionId: string,
    uploadId: string
  ) => Promise<{
    extraction?: {
      extractedText?: string;
      extractionConfidence?: number;
      warnings?: string[];
    };
  }>;
  submitAttempt: (attemptId: string) => Promise<QuizAttempt>;
  gradeAttempt: (attemptId: string) => Promise<QuizAttemptResult>;
  getResult: (attemptId: string) => Promise<QuizAttemptResult>;
  getHistory: (limit?: number) => Promise<QuizHistoryItem[]>;
  getMastery: (userId: string) => Promise<MasteryItem[]>;
}

export function useQuiz(): UseQuizReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await task();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Quiz request failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateQuiz = useCallback((dto: GenerateQuizDTO) => run(async () => {
    const response = await api.post<{ quiz: QuizBundle["quiz"]; questions: QuizBundle["questions"] }>(
      "/api/quizzes/generate",
      dto
    );
    return {
      quiz: response.quiz,
      questions: response.questions,
    };
  }), [run]);

  const getQuiz = useCallback((quizId: string) => run(async () => {
    const response = await api.get<QuizBundle>(`/api/quizzes/${quizId}`);
    return response;
  }), [run]);

  const startAttempt = useCallback((quizId: string) => run(async () => {
    const response = await api.post<{ attempt: QuizAttempt }>(`/api/quizzes/${quizId}/attempts`);
    return response.attempt;
  }), [run]);

  const saveAnswer = useCallback((attemptId: string, dto: SaveQuizAnswerDTO) => run(async () => {
    await api.post(`/api/quiz-attempts/${attemptId}/answers`, dto);
  }), [run]);

  const attachAnswerImage = useCallback((attemptId: string, questionId: string, uploadId: string) => run(async () => {
    return api.post<{
      extraction?: {
        extractedText?: string;
        extractionConfidence?: number;
        warnings?: string[];
      };
    }>(`/api/quiz-attempts/${attemptId}/answers/${questionId}/image`, { uploadId });
  }), [run]);

  const submitAttempt = useCallback((attemptId: string) => run(async () => {
    const response = await api.post<{ attempt: QuizAttempt }>(`/api/quiz-attempts/${attemptId}/submit`);
    return response.attempt;
  }), [run]);

  const gradeAttempt = useCallback((attemptId: string) => run(async () => {
    const response = await api.post<QuizAttemptResult>(`/api/quiz-attempts/${attemptId}/grade`);
    return response;
  }), [run]);

  const getResult = useCallback((attemptId: string) => run(async () => {
    const response = await api.get<QuizAttemptResult>(`/api/quiz-attempts/${attemptId}/result`);
    return response;
  }), [run]);

  const getHistory = useCallback((limit = 8) => run(async () => {
    const response = await api.get<{ quizzes: QuizHistoryItem[] }>(`/api/quizzes?limit=${limit}`);
    return response.quizzes;
  }), [run]);

  const getMastery = useCallback((userId: string) => run(async () => {
    const response = await api.get<{ mastery: MasteryItem[] }>(`/api/users/${userId}/mastery`);
    return response.mastery;
  }), [run]);

  return {
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
  };
}
