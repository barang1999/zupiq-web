import { useState, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { ChatMessage, SubjectType, AIResponse } from "../types/ai.types";
import { generateId } from "../utils/formatters";

interface UseAIOptions {
  subject?: SubjectType;
  sessionId?: string;
}

interface UseAIReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  sendMessage: (content: string, uploadId?: string) => Promise<void>;
  explainConcept: (concept: string) => Promise<string>;
  solveProblem: (problem: string) => Promise<string>;
  getHint: (problem: string) => Promise<string>;
  summarizeContent: (content: string) => Promise<string>;
  analyzeImage: (uploadId: string, question?: string) => Promise<string>;
  clearMessages: () => void;
  setSubject: (subject: SubjectType | null) => void;
}

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(options.sessionId ?? null);
  const [subject, setSubjectState] = useState<SubjectType | null>(options.subject ?? null);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = (role: "user" | "model", content: string, uploadId?: string): ChatMessage => {
    const msg: ChatMessage = {
      id: generateId(),
      role,
      content,
      subject: subject ?? undefined,
      timestamp: new Date().toISOString(),
      uploadId,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const sendMessage = useCallback(
    async (content: string, uploadId?: string) => {
      if (!content.trim()) return;
      setError(null);

      addMessage("user", content, uploadId);
      setIsLoading(true);

      // Add placeholder for AI response
      const placeholderId = generateId();
      const placeholder: ChatMessage = {
        id: placeholderId,
        role: "model",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, placeholder]);

      try {
        const chatMessages = messages
          .concat({ id: generateId(), role: "user", content, timestamp: new Date().toISOString() })
          .map((m) => ({ role: m.role, content: m.content }));

        const data = await api.post<AIResponse>("/api/ai/chat", {
          messages: chatMessages,
          subject,
          session_id: sessionId,
        });

        const responseText = data.response ?? "";
        if (data.session_id) setSessionId(data.session_id);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: responseText, isStreaming: false }
              : m
          )
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "AI request failed";
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      } finally {
        setIsLoading(false);
      }
    },
    [messages, subject, sessionId]
  );

  const explainConcept = useCallback(
    async (concept: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.post<AIResponse>("/api/ai/explain", { concept, subject });
        return data.explanation ?? "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to explain concept";
        setError(message);
        return "";
      } finally {
        setIsLoading(false);
      }
    },
    [subject]
  );

  const solveProblem = useCallback(
    async (problem: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.post<AIResponse>("/api/ai/solve", { problem, subject });
        return data.solution ?? "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to solve problem";
        setError(message);
        return "";
      } finally {
        setIsLoading(false);
      }
    },
    [subject]
  );

  const getHint = useCallback(
    async (problem: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.post<AIResponse>("/api/ai/hint", { problem, subject });
        return data.hint ?? "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to get hint";
        setError(message);
        return "";
      } finally {
        setIsLoading(false);
      }
    },
    [subject]
  );

  const summarizeContent = useCallback(
    async (content: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.post<AIResponse>("/api/ai/summarize", { content, subject });
        return data.summary ?? "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to summarize";
        setError(message);
        return "";
      } finally {
        setIsLoading(false);
      }
    },
    [subject]
  );

  const analyzeImage = useCallback(
    async (uploadId: string, question = ""): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.post<AIResponse>("/api/ai/analyze-image", {
          upload_id: uploadId,
          question,
          subject,
        });
        return data.analysis ?? "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to analyze image";
        setError(message);
        return "";
      } finally {
        setIsLoading(false);
      }
    },
    [subject]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  const setSubject = useCallback((s: SubjectType | null) => {
    setSubjectState(s);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    explainConcept,
    solveProblem,
    getHint,
    summarizeContent,
    analyzeImage,
    clearMessages,
    setSubject,
  };
}
