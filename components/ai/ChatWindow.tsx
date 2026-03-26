import React, { useRef, useEffect, useState } from "react";
import { Send, Trash2, Lightbulb, Sigma } from "lucide-react";
import { motion } from "motion/react";
import { MessageBubble } from "./MessageBubble";
import { SubjectSelector } from "./SubjectSelector";
import { FileAttachment } from "./FileAttachment";
import { Button } from "../ui/Button";
import { useAI } from "../../hooks/useAI";
import { useUpload } from "../../hooks/useUpload";
import type { SubjectType } from "../../types/ai.types";

interface ChatWindowProps {
  initialSubject?: SubjectType | null;
}

export function ChatWindow({ initialSubject = null }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState<SubjectType | null>(initialSubject);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    setSubject: setAISubject,
  } = useAI({ subject: subject ?? undefined });

  const {
    uploads,
    progress,
    isUploading,
    uploadFiles,
    deleteUpload,
    clearProgress,
  } = useUpload();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setAISubject(subject);
  }, [subject, setAISubject]);

  const handleSend = async () => {
    if (!input.trim() && uploads.length === 0) return;
    const messageText = input.trim();
    const uploadId = uploads[0]?.id;
    setInput("");
    clearProgress();
    await sendMessage(messageText || "Analyze this file", uploadId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QUICK_ACTIONS = [
    { label: "Explain", action: () => setInput("Explain: "), icon: Lightbulb },
    { label: "Solve", action: () => setInput("Solve step by step: "), icon: Sigma },
  ];

  return (
    <div className="flex flex-col h-full bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-container">
        <SubjectSelector selected={subject} onChange={setSubject} compact />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-on-surface-variant hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-surface-container-high"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">🧠</div>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Ask Zupiq anything</h3>
              <p className="text-on-surface-variant text-sm max-w-sm">
                {subject ? `Ready to help with ${subject}. Ask a question, share a problem, or upload an image.` : "Select a subject above or ask any question to get started."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 p-3 bg-surface-container">
        {messages.length === 0 && (
          <div className="flex gap-2 mb-3">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <button key={qa.label} onClick={qa.action} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface-container-high border border-white/5 text-on-surface-variant hover:text-primary hover:border-primary/20 transition-all">
                  <Icon className="w-3.5 h-3.5" />
                  {qa.label}
                </button>
              );
            })}
          </div>
        )}
        <FileAttachment progress={progress} uploads={uploads} onFilesSelected={(files) => uploadFiles(files, "ai_query")} onRemoveUpload={deleteUpload} isUploading={isUploading} disabled={isLoading} />
        <div className="flex gap-2 items-end mt-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-surface-container-highest border border-white/5 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            style={{ minHeight: "44px", maxHeight: "200px" }}
            disabled={isLoading}
          />
          <Button variant="primary" size="md" onClick={handleSend} disabled={(!input.trim() && uploads.length === 0) || isLoading || isUploading} isLoading={isLoading} className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
