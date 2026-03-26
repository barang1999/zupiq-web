import { useState, useCallback, useEffect } from "react";
import { api } from "../lib/api";
import type { FlashcardDeck, Flashcard, CreateDeckDTO, GenerateFlashcardsDTO, ReviewDTO } from "../types/flashcard.types";

interface UseFlashcardsReturn {
  decks: FlashcardDeck[];
  currentDeck: FlashcardDeck | null;
  cards: Flashcard[];
  dueCards: Flashcard[];
  currentCardIndex: number;
  isFlipped: boolean;
  isLoading: boolean;
  error: string | null;
  fetchDecks: () => Promise<void>;
  fetchDeckCards: (deckId: string) => Promise<void>;
  fetchDueCards: (deckId: string) => Promise<void>;
  createDeck: (dto: CreateDeckDTO) => Promise<FlashcardDeck>;
  deleteDeck: (deckId: string) => Promise<void>;
  generateDeck: (dto: GenerateFlashcardsDTO) => Promise<FlashcardDeck>;
  flipCard: () => void;
  nextCard: () => void;
  prevCard: () => void;
  reviewCard: (dto: ReviewDTO) => Promise<void>;
  setCurrentDeck: (deck: FlashcardDeck | null) => void;
}

export function useFlashcards(): UseFlashcardsReturn {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<{ decks: FlashcardDeck[] }>("/api/flashcards/decks");
      setDecks(data.decks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch decks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDeckCards = useCallback(async (deckId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<{ cards: Flashcard[] }>(`/api/flashcards/decks/${deckId}/cards`);
      setCards(data.cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch cards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDueCards = useCallback(async (deckId: string) => {
    setIsLoading(true);
    try {
      const data = await api.get<{ cards: Flashcard[] }>(`/api/flashcards/decks/${deckId}/due`);
      setDueCards(data.cards);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDeck = useCallback(async (dto: CreateDeckDTO): Promise<FlashcardDeck> => {
    const data = await api.post<{ deck: FlashcardDeck }>("/api/flashcards/decks", dto);
    setDecks((prev) => [data.deck, ...prev]);
    return data.deck;
  }, []);

  const deleteDeck = useCallback(async (deckId: string) => {
    await api.delete(`/api/flashcards/decks/${deckId}`);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (currentDeck?.id === deckId) setCurrentDeck(null);
  }, [currentDeck]);

  const generateDeck = useCallback(async (dto: GenerateFlashcardsDTO): Promise<FlashcardDeck> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ deck: FlashcardDeck }>("/api/flashcards/generate", dto);
      setDecks((prev) => [data.deck, ...prev]);
      return data.deck;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const flipCard = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  const nextCard = useCallback(() => {
    setCurrentCardIndex((i) => Math.min(i + 1, cards.length - 1));
    setIsFlipped(false);
  }, [cards.length]);

  const prevCard = useCallback(() => {
    setCurrentCardIndex((i) => Math.max(i - 1, 0));
    setIsFlipped(false);
  }, []);

  const reviewCard = useCallback(async (dto: ReviewDTO) => {
    try {
      await api.post("/api/flashcards/review", dto);
    } catch {
      // Non-critical — review can fail silently
    }
  }, []);

  return {
    decks,
    currentDeck,
    cards,
    dueCards,
    currentCardIndex,
    isFlipped,
    isLoading,
    error,
    fetchDecks,
    fetchDeckCards,
    fetchDueCards,
    createDeck,
    deleteDeck,
    generateDeck,
    flipCard,
    nextCard,
    prevCard,
    reviewCard,
    setCurrentDeck,
  };
}
