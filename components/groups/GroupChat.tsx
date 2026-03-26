import React, { useRef, useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { GroupPost } from "../../types/group.types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { formatRelativeTime } from "../../utils/formatters";

interface GroupChatProps {
  posts: GroupPost[];
  onPost: (content: string) => Promise<void>;
  isLoading: boolean;
  currentUserId: string;
}

export function GroupChat({ posts, onPost, isLoading, currentUserId }: GroupChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    await onPost(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {posts.length === 0 ? (
          <div className="text-center text-on-surface-variant py-12">
            No messages yet. Start the conversation!
          </div>
        ) : (
          [...posts].reverse().map((post) => {
            const isOwn = post.user_id === currentUserId;
            return (
              <div
                key={post.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar
                  src={post.author_avatar}
                  name={post.author_name ?? "Member"}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div
                  className={`flex flex-col gap-1 max-w-[75%] ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="font-medium">
                      {isOwn ? "You" : post.author_name}
                    </span>
                    <span>{formatRelativeTime(post.created_at)}</span>
                  </div>
                  <div
                    className={[
                      "rounded-2xl px-4 py-2.5 text-sm",
                      isOwn
                        ? "bg-primary/15 text-on-surface border border-primary/10 rounded-tr-sm"
                        : "bg-surface-container text-on-surface border border-white/5 rounded-tl-sm",
                    ].join(" ")}
                  >
                    {post.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          className="flex-1 bg-surface-container-highest border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          style={{ minHeight: "44px", maxHeight: "120px" }}
          disabled={isLoading}
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          isLoading={isLoading}
          className="flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
