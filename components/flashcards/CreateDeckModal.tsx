import React, { useState } from "react";
import { Modal, ModalFooter } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { Brain, Layers } from "lucide-react";
import type { CreateDeckDTO, GenerateFlashcardsDTO } from "../../types/flashcard.types";

type Mode = "manual" | "ai";

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateManual: (dto: CreateDeckDTO) => Promise<void>;
  onGenerateWithAI: (dto: GenerateFlashcardsDTO) => Promise<void>;
  isLoading: boolean;
  lessonId?: string;
  lessonContent?: string;
}

export function CreateDeckModal({
  isOpen,
  onClose,
  onCreateManual,
  onGenerateWithAI,
  isLoading,
  lessonId,
  lessonContent = "",
}: CreateDeckModalProps) {
  const [mode, setMode] = useState<Mode>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(lessonContent);
  const [cardCount, setCardCount] = useState("10");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && mode === "manual") return;

    if (mode === "manual") {
      await onCreateManual({ title: title.trim(), description, subject });
    } else {
      await onGenerateWithAI({
        content: content.trim(),
        subject,
        count: parseInt(cardCount),
        deck_title: title.trim() || undefined,
        lesson_id: lessonId,
      });
    }

    // Reset form
    setTitle("");
    setDescription("");
    setSubject("");
    setContent(lessonContent);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Flashcard Deck"
      subtitle="Build a deck manually or let AI generate cards for you"
      maxWidth="md"
    >
      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-surface-container rounded-xl">
        {([
          { id: "manual", label: "Manual", icon: Layers },
          { id: "ai", label: "AI Generate", icon: Brain },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
              mode === id
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Deck Title"
          placeholder="e.g. Calculus Fundamentals"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required={mode === "manual"}
        />

        <Input
          label="Subject (optional)"
          placeholder="e.g. Mathematics"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {mode === "manual" ? (
          <Textarea
            label="Description (optional)"
            placeholder="What does this deck cover?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        ) : (
          <>
            <Textarea
              label="Content to generate from"
              placeholder="Paste your lesson text, notes, or any content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
            <Input
              label="Number of cards"
              type="number"
              min="3"
              max="30"
              value={cardCount}
              onChange={(e) => setCardCount(e.target.value)}
              hint="Recommended: 5-15 cards per deck"
            />
          </>
        )}

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={
              (mode === "manual" && !title.trim()) ||
              (mode === "ai" && !content.trim())
            }
          >
            {mode === "ai" ? "Generate with AI" : "Create Deck"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
