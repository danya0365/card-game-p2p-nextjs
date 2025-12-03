/**
 * Dummy (Rummy) Game Logic
 * เกมดัมมี่ - จับคู่ไพ่เป็นชุด ลดแต้มในมือ
 */

import type { Card, Suit } from "@/src/domain/types/card.types";
import type {
  DummyGameState,
  DummyPlayer,
  Meld,
  MeldType,
} from "@/src/domain/types/dummy.types";
import {
  DUMMY_CARD_POINTS,
  DUMMY_SCORING,
} from "@/src/domain/types/dummy.types";
import { CardDeck } from "./CardDeck";

/**
 * Dummy Game Engine
 */
export class DummyGame {
  private state: DummyGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(1);
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): DummyGameState {
    return {
      phase: "waiting",
      players: [],
      deck: [],
      discardPile: [],
      allMelds: [],
      currentPlayerIndex: 0,
      gameNumber: 0,
      knockerId: null,
      winnerId: null,
    };
  }

  /**
   * Get current game state
   */
  getState(): DummyGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: DummyGameState): void {
    this.state = state;
  }

  /**
   * Add player to the game
   */
  addPlayer(
    player: Omit<
      DummyPlayer,
      "hand" | "melds" | "score" | "isKnocker" | "hasDrawn"
    >
  ): void {
    const newPlayer: DummyPlayer = {
      ...player,
      hand: [],
      melds: [],
      score: 0,
      isKnocker: false,
      hasDrawn: false,
    };
    this.state.players.push(newPlayer);
  }

  /**
   * Remove player from the game
   */
  removePlayer(oderId: string): void {
    this.state.players = this.state.players.filter((p) => p.oderId !== oderId);
  }

  /**
   * Start a new game
   */
  startGame(): void {
    this.deck = new CardDeck(1);
    this.deck.shuffle();

    this.state.gameNumber++;
    this.state.phase = "dealing";
    this.state.discardPile = [];
    this.state.allMelds = [];
    this.state.knockerId = null;
    this.state.winnerId = null;

    // Reset player states
    this.state.players.forEach((player) => {
      player.hand = [];
      player.melds = [];
      player.score = 0;
      player.isKnocker = false;
      player.hasDrawn = false;
    });

    // Deal cards (7 cards each for 2-4 players)
    const cardsPerPlayer = this.state.players.length <= 2 ? 10 : 7;
    this.state.players.forEach((player) => {
      player.hand = this.deck.dealMany(cardsPerPlayer);
      this.sortHand(player);
    });

    // Turn over first card to discard pile
    const firstDiscard = this.deck.deal();
    if (firstDiscard) {
      this.state.discardPile.push(firstDiscard);
    }

    // Store remaining deck
    this.state.deck = this.deck.serialize().cards;

    this.state.phase = "playing";
    this.state.currentPlayerIndex = 0;
  }

  /**
   * Sort player's hand by suit then rank
   */
  private sortHand(player: DummyPlayer): void {
    const suitOrder: Record<Suit, number> = {
      spades: 0,
      hearts: 1,
      diamonds: 2,
      clubs: 3,
    };
    player.hand.sort((a, b) => {
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      return a.rank - b.rank;
    });
  }

  /**
   * Draw card from deck
   */
  drawFromDeck(oderId: string): Card | null {
    const player = this.getPlayer(oderId);
    if (!player || player.hasDrawn) return null;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return null;

    // Reshuffle discard pile if deck is empty
    if (this.state.deck.length === 0) {
      if (this.state.discardPile.length <= 1) return null;
      const topDiscard = this.state.discardPile.pop()!;
      this.state.deck = [...this.state.discardPile];
      this.state.discardPile = [topDiscard];
      // Shuffle deck
      for (let i = this.state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.state.deck[i], this.state.deck[j]] = [
          this.state.deck[j],
          this.state.deck[i],
        ];
      }
    }

    const card = this.state.deck.pop();
    if (card) {
      player.hand.push(card);
      this.sortHand(player);
      player.hasDrawn = true;
    }
    return card || null;
  }

  /**
   * Draw card from discard pile
   */
  drawFromDiscard(oderId: string): Card | null {
    const player = this.getPlayer(oderId);
    if (!player || player.hasDrawn) return null;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return null;
    if (this.state.discardPile.length === 0) return null;

    const card = this.state.discardPile.pop()!;
    player.hand.push(card);
    this.sortHand(player);
    player.hasDrawn = true;
    return card;
  }

  /**
   * Discard a card
   */
  discard(oderId: string, card: Card): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !player.hasDrawn) return false;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return false;

    const cardIndex = player.hand.findIndex(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (cardIndex === -1) return false;

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Add to discard pile
    this.state.discardPile.push(card);

    // Reset hasDrawn and move to next player
    player.hasDrawn = false;
    this.nextTurn();

    return true;
  }

  /**
   * Meld cards (create a set or run)
   */
  meld(oderId: string, cards: Card[]): Meld | null {
    const player = this.getPlayer(oderId);
    if (!player) return null;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return null;

    // Validate meld
    const meldType = this.validateMeld(cards);
    if (!meldType) return null;

    // Check if player has all cards
    for (const card of cards) {
      const hasCard = player.hand.some(
        (c) => c.suit === card.suit && c.rank === card.rank
      );
      if (!hasCard) return null;
    }

    // Create meld
    const meld: Meld = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: meldType,
      cards: [...cards],
      ownerId: oderId,
    };

    // Remove cards from hand
    for (const card of cards) {
      const idx = player.hand.findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank
      );
      if (idx !== -1) {
        player.hand.splice(idx, 1);
      }
    }

    // Add meld
    player.melds.push(meld);
    this.state.allMelds.push(meld);

    // Check for dummy (win immediately if hand is empty and first turn)
    if (player.hand.length === 0 && !player.hasDrawn) {
      this.state.winnerId = oderId;
      this.state.phase = "finished";
    }

    return meld;
  }

  /**
   * Lay off a card to existing meld
   */
  layOff(oderId: string, card: Card, meldId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return false;

    const meld = this.state.allMelds.find((m) => m.id === meldId);
    if (!meld) return false;

    // Check if card can be added to meld
    if (!this.canLayOff(card, meld)) return false;

    // Check if player has the card
    const cardIndex = player.hand.findIndex(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (cardIndex === -1) return false;

    // Remove from hand and add to meld
    player.hand.splice(cardIndex, 1);
    meld.cards.push(card);

    // Sort meld cards
    meld.cards.sort((a, b) => a.rank - b.rank);

    return true;
  }

  /**
   * Knock (end the game)
   */
  knock(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !player.hasDrawn) return false;
    if (this.state.currentPlayerIndex !== this.getPlayerIndex(oderId))
      return false;

    // Must have low deadwood to knock (max 10 points)
    const deadwood = this.calculateDeadwood(player);
    if (deadwood > 10) return false;

    player.isKnocker = true;
    this.state.knockerId = oderId;
    this.state.phase = "knocked";

    // Calculate scores and determine winner
    this.calculateFinalScores();

    return true;
  }

  /**
   * Calculate final scores when game ends
   */
  private calculateFinalScores(): void {
    const knocker = this.state.players.find((p) => p.isKnocker);
    if (!knocker) return;

    const knockerDeadwood = this.calculateDeadwood(knocker);

    // Find lowest deadwood among other players
    let lowestOther = Infinity;
    let lowestOtherPlayerId: string | null = null;

    this.state.players.forEach((player) => {
      if (player.oderId !== knocker.oderId) {
        const deadwood = this.calculateDeadwood(player);
        player.score = deadwood;
        if (deadwood < lowestOther) {
          lowestOther = deadwood;
          lowestOtherPlayerId = player.oderId;
        }
      }
    });

    knocker.score = knockerDeadwood;

    // Determine winner
    if (knockerDeadwood <= lowestOther) {
      // Knocker wins
      this.state.winnerId = knocker.oderId;
      if (knockerDeadwood === 0) {
        // Gin bonus
        knocker.score = 0;
      }
    } else {
      // Undercut! Other player wins
      if (lowestOtherPlayerId) {
        const winner = this.getPlayer(lowestOtherPlayerId);
        if (winner) {
          this.state.winnerId = winner.oderId;
          winner.score -= DUMMY_SCORING.UNDERCUT_PENALTY;
        }
      }
    }

    this.state.phase = "finished";
  }

  /**
   * Calculate deadwood (unmelded cards) points
   */
  calculateDeadwood(player: DummyPlayer): number {
    return player.hand.reduce((sum, card) => {
      return sum + (DUMMY_CARD_POINTS[card.rank] || 0);
    }, 0);
  }

  /**
   * Validate if cards form a valid meld
   */
  private validateMeld(cards: Card[]): MeldType | null {
    if (cards.length < 3) return null;

    // Check for set (same rank, different suits)
    if (this.isSet(cards)) return "set";

    // Check for run (same suit, consecutive ranks)
    if (this.isRun(cards)) return "run";

    return null;
  }

  /**
   * Check if cards form a set
   */
  private isSet(cards: Card[]): boolean {
    if (cards.length < 3 || cards.length > 4) return false;

    const rank = cards[0].rank;
    const suits = new Set<Suit>();

    for (const card of cards) {
      if (card.rank !== rank) return false;
      if (suits.has(card.suit)) return false;
      suits.add(card.suit);
    }

    return true;
  }

  /**
   * Check if cards form a run
   */
  private isRun(cards: Card[]): boolean {
    if (cards.length < 3) return false;

    const suit = cards[0].suit;
    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);

    // All same suit
    if (!cards.every((c) => c.suit === suit)) return false;

    // Check consecutive
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] - ranks[i - 1] !== 1) {
        // Handle A-2-3 or Q-K-A
        if (!(ranks[i - 1] === 1 && ranks[i] === 2)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a card can be laid off to a meld
   */
  private canLayOff(card: Card, meld: Meld): boolean {
    if (meld.type === "set") {
      // Same rank, different suit
      if (meld.cards.length >= 4) return false;
      if (card.rank !== meld.cards[0].rank) return false;
      if (meld.cards.some((c) => c.suit === card.suit)) return false;
      return true;
    } else {
      // Run - must be same suit and extend the sequence
      if (card.suit !== meld.cards[0].suit) return false;

      const ranks = meld.cards.map((c) => c.rank).sort((a, b) => a - b);
      const minRank = ranks[0];
      const maxRank = ranks[ranks.length - 1];

      // Can extend at start or end
      return card.rank === minRank - 1 || card.rank === maxRank + 1;
    }
  }

  /**
   * Move to next turn
   */
  private nextTurn(): void {
    this.state.currentPlayerIndex =
      (this.state.currentPlayerIndex + 1) % this.state.players.length;
  }

  /**
   * Get player by ID
   */
  private getPlayer(oderId: string): DummyPlayer | null {
    return this.state.players.find((p) => p.oderId === oderId) || null;
  }

  /**
   * Get player index
   */
  private getPlayerIndex(oderId: string): number {
    return this.state.players.findIndex((p) => p.oderId === oderId);
  }

  /**
   * Get possible melds for a player
   */
  getPossibleMelds(oderId: string): Card[][] {
    const player = this.getPlayer(oderId);
    if (!player) return [];

    const possibleMelds: Card[][] = [];
    const hand = player.hand;

    // Find sets (same rank)
    const rankGroups = new Map<number, Card[]>();
    hand.forEach((card) => {
      if (!rankGroups.has(card.rank)) {
        rankGroups.set(card.rank, []);
      }
      rankGroups.get(card.rank)!.push(card);
    });

    rankGroups.forEach((cards) => {
      if (cards.length >= 3) {
        // Add all combinations of 3 or 4
        if (cards.length === 3) {
          possibleMelds.push([...cards]);
        } else if (cards.length === 4) {
          possibleMelds.push([...cards]);
          // Also add 3-card combinations
          for (let i = 0; i < 4; i++) {
            const combo = cards.filter((_, idx) => idx !== i);
            possibleMelds.push(combo);
          }
        }
      }
    });

    // Find runs (same suit, consecutive)
    const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
    suits.forEach((suit) => {
      const suitCards = hand
        .filter((c) => c.suit === suit)
        .sort((a, b) => a.rank - b.rank);

      // Find consecutive sequences
      for (let i = 0; i < suitCards.length - 2; i++) {
        const run: Card[] = [suitCards[i]];
        for (let j = i + 1; j < suitCards.length; j++) {
          if (suitCards[j].rank === run[run.length - 1].rank + 1) {
            run.push(suitCards[j]);
            if (run.length >= 3) {
              possibleMelds.push([...run]);
            }
          } else {
            break;
          }
        }
      }
    });

    return possibleMelds;
  }

  /**
   * Serialize game state for P2P
   */
  serialize(): DummyGameState {
    return { ...this.state };
  }

  /**
   * Deserialize game state from P2P
   */
  static deserialize(data: DummyGameState): DummyGame {
    const game = new DummyGame();
    game.setState(data);
    return game;
  }
}
