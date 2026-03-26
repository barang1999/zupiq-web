import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lightbulb, RotateCcw } from "lucide-react";
import type { Flashcard } from "../../types/flashcard.types";
import { DifficultyBadge } from "../ui/Badge";

interface FlashcardItemProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
  cardIndex: number;
  totalCards: number;
}

export function FlashcardItem({
  card,
  isFlipped,
  onFlip,
  cardIndex,
  totalCards,
}: FlashcardItemProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 w-full text-sm text-on-surface-variant">
        <span>{cardIndex + 1} / {totalCards}</span>
        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
            style={{ width: `${((cardIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
        <DifficultyBadge difficulty={card.difficulty} />
      </div>

      {/* Card flip container */}
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: "1000px", height: "280px" }}
        onClick={onFlip}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full h-full"
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl bg-surface-container-highest border border-white/5 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute top-3 left-3">
              <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Question
              </span>
            </div>
            <p className="text-xl font-medium text-on-surface leading-relaxed">
              {card.front}
            </p>
            {card.hint && !isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Show hint tooltip — simplified
                  alert(`Hint: ${card.hint}`);
                }}
                className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-on-surface-variant hover:text-tertiary transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Hint
              </button>
            )}
            <div className="absolute bottom-3 left-3 right-3 text-center text-xs text-on-surface-variant/50">
              Click to reveal answer
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="absolute top-3 left-3">
              <span className="text-xs text-primary font-medium uppercase tracking-wider">
                Answer
              </span>
            </div>
            <p className="text-xl font-medium text-on-surface leading-relaxed">
              {card.back}
            </p>
            <div className="absolute bottom-3 flex items-center gap-1 text-xs text-on-surface-variant/50">
              <RotateCcw className="w-3 h-3" />
              Click to flip back
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
