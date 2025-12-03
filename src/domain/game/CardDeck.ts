import type { Card, Rank, Suit } from "@/src/domain/types/card.types";
import { ALL_RANKS, ALL_SUITS } from "@/src/domain/types/card.types";

/**
 * Card Deck - Manages a deck of playing cards
 * Supports single or multiple decks
 */
export class CardDeck {
  private cards: Card[] = [];
  private dealtCards: Card[] = [];

  constructor(numberOfDecks: number = 1) {
    this.initializeDeck(numberOfDecks);
  }

  /**
   * Initialize deck with specified number of standard 52-card decks
   */
  private initializeDeck(numberOfDecks: number): void {
    this.cards = [];
    this.dealtCards = [];

    for (let deck = 0; deck < numberOfDecks; deck++) {
      for (const suit of ALL_SUITS) {
        for (const rank of ALL_RANKS) {
          this.cards.push({
            suit,
            rank,
            id: `${suit}-${rank}-${deck}`,
          });
        }
      }
    }
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   */
  shuffle(): void {
    const array = this.cards;
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Deal a single card from the top of the deck
   */
  deal(): Card | null {
    const card = this.cards.pop();
    if (card) {
      this.dealtCards.push(card);
      return card;
    }
    return null;
  }

  /**
   * Deal multiple cards
   */
  dealMany(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.deal();
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  /**
   * Return all dealt cards to the deck and shuffle
   */
  reset(): void {
    this.cards = [...this.cards, ...this.dealtCards];
    this.dealtCards = [];
    this.shuffle();
  }

  /**
   * Get remaining cards count
   */
  remaining(): number {
    return this.cards.length;
  }

  /**
   * Get dealt cards count
   */
  dealt(): number {
    return this.dealtCards.length;
  }

  /**
   * Check if deck is empty
   */
  isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /**
   * Create a specific card (for testing or predetermined hands)
   */
  static createCard(suit: Suit, rank: Rank, deckIndex: number = 0): Card {
    return {
      suit,
      rank,
      id: `${suit}-${rank}-${deckIndex}`,
    };
  }

  /**
   * Get card value for Pok Deng (A=1, 2-9=face value, 10/J/Q/K=0)
   */
  static getPokDengValue(card: Card): number {
    if (card.rank >= 10) return 0;
    return card.rank;
  }

  /**
   * Get card value for Blackjack (A=1 or 11, 2-10=face value, J/Q/K=10)
   */
  static getBlackjackValue(card: Card): number {
    if (card.rank === 1) return 11; // Ace (can be 1 or 11)
    if (card.rank >= 10) return 10;
    return card.rank;
  }

  /**
   * Get card value for comparing (A=14 high)
   */
  static getHighValue(card: Card): number {
    if (card.rank === 1) return 14; // Ace high
    return card.rank;
  }

  /**
   * Serialize deck state for P2P transmission
   */
  serialize(): { cards: Card[]; dealtCards: Card[] } {
    return {
      cards: [...this.cards],
      dealtCards: [...this.dealtCards],
    };
  }

  /**
   * Restore deck state from serialized data
   */
  static deserialize(data: { cards: Card[]; dealtCards: Card[] }): CardDeck {
    const deck = new CardDeck(0); // Empty deck
    deck.cards = [...data.cards];
    deck.dealtCards = [...data.dealtCards];
    return deck;
  }
}
