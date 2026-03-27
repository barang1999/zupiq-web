import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Lightbulb, RotateCcw } from "lucide-react";
import type { Flashcard } from "../../types/flashcard.types";
import { DifficultyBadge } from "../ui/Badge";
import { MathText } from "../ui/MathText";
import { RichText } from "../ui/RichText";

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
    <div className="w-full mx-auto">
      {/* Mobile layout (concept 11 inspired) */}
      <div className="sm:hidden w-full max-w-md mx-auto">
        <div className="mb-4">
          <div className="flex justify-between items-end mb-2 px-1">
            <span className="font-headline text-xl font-bold tracking-tight text-primary">Quantum Recall</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              {cardIndex + 1} / {totalCards}
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
              style={{ width: `${((cardIndex + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>

        <div
          className="relative w-full cursor-pointer"
          style={{ perspective: "1000px", height: "480px" }}
          onClick={onFlip}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 280, damping: 28 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative w-full h-full"
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-[2rem] bg-surface-container-highest/60 backdrop-blur-xl border border-outline-variant/20 flex flex-col justify-between p-6 text-left shadow-2xl"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary bg-tertiary/10 px-2 py-1 rounded">
                    Flashcard
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {card.difficulty}
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-bold leading-tight text-on-surface">
                  <MathText>{card.front}</MathText>
                </h3>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full bg-primary-container/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-primary flex items-center justify-center shadow-[0_0_18px_rgba(0,244,254,0.45)]">
                    <Brain className="w-5 h-5 text-on-primary" />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlip();
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold py-4 text-base active:scale-95 transition-transform"
                >
                  Show Answer
                </button>
              </div>

              {card.hint && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Hint: ${card.hint}`);
                  }}
                  className="absolute top-5 right-5 text-on-surface-variant hover:text-tertiary transition-colors"
                  title="Show hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-[2rem] bg-primary/8 border border-primary/25 flex flex-col justify-between p-6 text-left shadow-2xl"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Answer</span>
                <div className="mt-3 text-on-surface">
                  <RichText className="text-base leading-relaxed">{card.back}</RichText>
                </div>
              </div>

              <div className="text-center text-xs text-on-surface-variant/70 flex items-center justify-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Tap to flip back
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Desktop / tablet layout */}
      <div className="hidden sm:flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
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
                <MathText>{card.front}</MathText>
              </p>
              {card.hint && !isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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

            <div
              className="absolute inset-0 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center p-8 text-center"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="absolute top-3 left-3">
                <span className="text-xs text-primary font-medium uppercase tracking-wider">
                  Answer
                </span>
              </div>
              <div className="text-xl font-medium text-on-surface leading-relaxed">
                <RichText>{card.back}</RichText>
              </div>
              <div className="absolute bottom-3 flex items-center gap-1 text-xs text-on-surface-variant/50">
                <RotateCcw className="w-3 h-3" />
                Click to flip back
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
