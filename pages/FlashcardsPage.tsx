import React, { useEffect, useState } from "react";
import { Plus, Brain, ChevronLeft, ChevronRight, RotateCcw, Check, X } from "lucide-react";
import { PageLayout, PageContainer } from "../components/layout/PageLayout";
import { FlashcardDeckGrid } from "../components/flashcards/FlashcardDeck";
import { FlashcardItem } from "../components/flashcards/FlashcardItem";
import { CreateDeckModal } from "../components/flashcards/CreateDeckModal";
import { Button } from "../components/ui/Button";
import { PageLoading } from "../components/ui/Spinner";
import { useFlashcards } from "../hooks/useFlashcards";
import type { FlashcardDeck } from "../types/flashcard.types";

type View = "decks" | "study";

export default function FlashcardsPage() {
  const [view, setView] = useState<View>("decks");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    decks,
    currentDeck,
    cards,
    currentCardIndex,
    isFlipped,
    isLoading,
    fetchDecks,
    fetchDeckCards,
    deleteDeck,
    createDeck,
    generateDeck,
    flipCard,
    nextCard,
    prevCard,
    reviewCard,
    setCurrentDeck,
  } = useFlashcards();

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleStudyDeck = async (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    setCurrentDeck(deck);
    await fetchDeckCards(deckId);
    setView("study");
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    await deleteDeck(deckId);
  };

  const handleRate = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!currentDeck || !cards[currentCardIndex]) return;
    await reviewCard({
      deck_id: currentDeck.id,
      card_id: cards[currentCardIndex].id,
      rating,
    });
    if (currentCardIndex < cards.length - 1) {
      nextCard();
    } else {
      setView("decks");
    }
  };

  if (isLoading && decks.length === 0) return <PageLoading message="Loading flashcards..." />;

  return (
    <PageLayout>
      <PageContainer
        title={view === "study" ? `Studying: ${currentDeck?.title}` : "Flashcards"}
        subtitle={view === "decks" ? "Create decks or generate them with AI" : `${currentCardIndex + 1} of ${cards.length} cards`}
        action={
          view === "decks" ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Deck
            </Button>
          ) : (
            <Button
              variant="ghost"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setView("decks")}
            >
              All Decks
            </Button>
          )
        }
      >
        {view === "decks" ? (
          <FlashcardDeckGrid
            decks={decks}
            onStudy={handleStudyDeck}
            onDelete={handleDeleteDeck}
            onCreateNew={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-8 py-8">
            {cards.length === 0 ? (
              <div className="text-center">
                <p className="text-on-surface-variant">No cards in this deck.</p>
                <Button variant="primary" className="mt-4" onClick={() => setView("decks")}>
                  Back to Decks
                </Button>
              </div>
            ) : (
              <>
                <FlashcardItem
                  card={cards[currentCardIndex]}
                  isFlipped={isFlipped}
                  onFlip={flipCard}
                  cardIndex={currentCardIndex}
                  totalCards={cards.length}
                />

                {/* Navigation */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevCard}
                    disabled={currentCardIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {isFlipped && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRate(1)}
                        leftIcon={<X className="w-3 h-3" />}
                      >
                        Again
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRate(3)}
                        leftIcon={<RotateCcw className="w-3 h-3" />}
                      >
                        Good
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRate(5)}
                        leftIcon={<Check className="w-3 h-3" />}
                      >
                        Easy
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextCard}
                    disabled={currentCardIndex === cards.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {!isFlipped && (
                  <Button variant="glass" onClick={flipCard}>
                    Reveal Answer
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </PageContainer>

      <CreateDeckModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateManual={async (dto) => { await createDeck(dto); }}
        onGenerateWithAI={async (dto) => { await generateDeck(dto); }}
        isLoading={isLoading}
      />
    </PageLayout>
  );
}
