import React, { useEffect, useMemo, useState } from "react";
import { Layers, BookOpen, Trash2, Play, Brain } from "lucide-react";
import { motion } from "motion/react";
import type { FlashcardDeck } from "../../types/flashcard.types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatRelativeTime } from "../../utils/formatters";

function deckSubjectLabel(deck: FlashcardDeck): string | null {
  const value = deck.subject_name?.trim();
  return value && value.length > 0 ? value : null;
}

interface FlashcardDeckCardProps {
  deck: FlashcardDeck;
  onStudy: (deckId: string) => void;
  onDelete: (deckId: string) => void;
}

export function FlashcardDeckCard({ deck, onStudy, onDelete }: FlashcardDeckCardProps) {
  const subjectLabel = deckSubjectLabel(deck);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Card variant="glass" className="relative overflow-hidden group">
        {/* Subject color accent */}
        {subjectLabel && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface">{deck.title}</h3>
              {subjectLabel && (
                <Badge variant="primary" size="sm" className="mt-0.5">
                  {subjectLabel}
                </Badge>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deck.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10"
            title="Delete deck"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {deck.description && (
          <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
            {deck.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {deck.card_count ?? 0} cards
            </span>
            <span>Updated {formatRelativeTime(deck.updated_at)}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onStudy(deck.id)}
            leftIcon={<Play className="w-3 h-3" />}
          >
            Study
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

interface FlashcardDeckGridProps {
  decks: FlashcardDeck[];
  onStudy: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onCreateNew: () => void;
}

export function FlashcardDeckGrid({
  decks,
  onStudy,
  onDelete,
  onCreateNew,
}: FlashcardDeckGridProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const subjects = useMemo(() => {
    const values = Array.from(
      new Set(
        decks
          .map((deck) => deckSubjectLabel(deck))
          .filter((subject): subject is string => Boolean(subject))
      )
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [decks]);

  useEffect(() => {
    if (selectedSubject === "all") return;
    if (!subjects.includes(selectedSubject)) {
      setSelectedSubject("all");
    }
  }, [selectedSubject, subjects]);

  const filteredDecks = useMemo(() => {
    if (selectedSubject === "all") return decks;
    return decks.filter((deck) => (deckSubjectLabel(deck) ?? "") === selectedSubject);
  }, [decks, selectedSubject]);

  const subjectCounts = useMemo(
    () =>
      subjects.reduce<Record<string, number>>((acc, subject) => {
        acc[subject] = decks.filter((deck) => (deckSubjectLabel(deck) ?? "") === subject).length;
        return acc;
      }, {}),
    [decks, subjects]
  );

  if (decks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-headline font-bold text-on-surface mb-2">No flashcard decks yet</h3>
        <p className="text-on-surface-variant mb-6">
          Create a deck manually or generate one from a lesson using AI.
        </p>
        <Button variant="primary" onClick={onCreateNew}>
          Create Your First Deck
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.length > 0 && (
        <>
          <div className="sm:hidden">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                Subject
              </span>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="h-10 rounded-xl border border-outline-variant/40 bg-surface-container-high px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/35"
              >
                <option value="all">All Subjects ({decks.length})</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject} ({subjectCounts[subject] ?? 0})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hidden sm:flex sm:flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubject("all")}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedSubject === "all"
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
              ].join(" ")}
            >
              All Subjects ({decks.length})
            </button>
            {subjects.map((subject) => {
              const isActive = selectedSubject === subject;
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => setSelectedSubject(subject)}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
                  ].join(" ")}
                >
                  {subject} ({subjectCounts[subject] ?? 0})
                </button>
              );
            })}
          </div>
        </>
      )}

      {filteredDecks.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-high/30 p-6 text-sm text-on-surface-variant">
          No decks found for <span className="text-on-surface font-medium">{selectedSubject}</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => (
            <FlashcardDeckCard
              key={deck.id}
              deck={deck}
              onStudy={onStudy}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
