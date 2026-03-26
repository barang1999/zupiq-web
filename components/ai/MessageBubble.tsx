import React from "react";
import { motion } from "motion/react";
import { Brain, User as UserIcon, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../../types/ai.types";
import { formatRelativeTime } from "../../utils/formatters";

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  userAvatar?: string;
}

export function MessageBubble({ message, userName = "You" }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={[
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          isUser
            ? "bg-gradient-to-br from-primary to-secondary text-on-primary"
            : "bg-gradient-to-br from-primary/20 to-secondary/20 text-primary border border-primary/20",
        ].join(" ")}
      >
        {isUser ? (
          <UserIcon className="w-4 h-4" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="font-medium">{isUser ? userName : "Zupiq AI"}</span>
          <span>{formatRelativeTime(message.timestamp)}</span>
          {message.subject && (
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary/80 text-[10px]">
              {message.subject}
            </span>
          )}
        </div>

        <div
          className={[
            "relative rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary/15 text-on-surface border border-primary/10 rounded-tr-sm"
              : "bg-surface-container text-on-surface border border-white/5 rounded-tl-sm",
          ].join(" ")}
        >
          {message.isStreaming ? (
            <span className="flex items-center gap-2 text-on-surface-variant">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              Thinking...
            </span>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}

          {/* Copy button for AI messages */}
          {!isUser && !message.isStreaming && (
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
