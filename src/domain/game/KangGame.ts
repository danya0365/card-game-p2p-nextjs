/**
 * Kang (ไพ่แคง) Game Logic
 * Thai card game where players form sets and pairs
 */

import type { Card } from "@/src/domain/types/card.types";
import type {
  KangGameState,
  KangHand,
  KangHandType,
  KangPlayer,
} from "@/src/domain/types/kang.types";
import { CardDeck } from "./CardDeck";

/**
 * Kang Game Engine
 */
export class KangGame {
  private state: KangGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(1);
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): KangGameState {
    return {
      phase: "waiting",
      players: [],
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pot: 0,
      minBet: 10,
      maxBet: 100,
      roundNumber: 0,
    };
  }

  /**
   * Get current game state (for P2P sync)
   */
  getState(): KangGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: KangGameState): void {
    this.state = state;
    if (state.deck) {
      this.deck = CardDeck.deserialize({ cards: state.deck, dealtCards: [] });
    }
  }

  /**
   * Add player to the game
   */
  addPlayer(
    player: Omit<
      KangPlayer,
      | "hand"
      | "discardedCards"
      | "bet"
      | "payout"
      | "isDealer"
      | "isFolded"
      | "hasDiscarded"
    >
  ): void {
    const newPlayer: KangPlayer = {
      ...player,
      hand: [],
      discardedCards: [],
      bet: 0,
      payout: 0,
      isDealer: this.state.players.length === 0,
      isFolded: false,
      hasDiscarded: false,
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
   * Start a new round
   */
  startRound(): void {
    this.deck = new CardDeck(1);
    this.deck.shuffle();

    this.state.roundNumber++;
    this.state.phase = "betting";
    this.state.pot = 0;
    this.state.currentPlayerIndex = this.getNextPlayerIndex(
      this.state.dealerIndex
    );

    // Reset player states
    this.state.players.forEach((player) => {
      player.hand = [];
      player.discardedCards = [];
      player.bet = 0;
      player.payout = 0;
      player.isFolded = false;
      player.hasDiscarded = false;
      player.result = undefined;
    });

    // Store deck for sync
    this.state.deck = this.deck.serialize().cards;
  }

  /**
   * Place a bet
   */
  placeBet(oderId: string, amount: number): boolean {
    if (this.state.phase !== "betting") return false;

    const player = this.getPlayer(oderId);
    if (!player || player.isDealer) return false;
    if (amount < this.state.minBet || amount > this.state.maxBet) return false;

    player.bet = amount;
    this.state.pot += amount;

    // Check if all non-dealer players have bet
    const allBet = this.state.players
      .filter((p) => !p.isDealer)
      .every((p) => p.bet > 0 || p.isFolded);

    if (allBet) {
      this.dealCards();
    }

    return true;
  }

  /**
   * Deal initial cards to all players
   */
  private dealCards(): void {
    this.state.phase = "dealing";

    // Deal 5 cards to each player
    this.state.players.forEach((player) => {
      if (!player.isFolded) {
        player.hand = this.deck.dealMany(5);
      }
    });

    this.state.deck = this.deck.serialize().cards;
    this.state.phase = "discarding";
    this.state.currentPlayerIndex = this.getNextPlayerIndex(
      this.state.dealerIndex
    );
  }

  /**
   * Player discards cards and draws new ones
   */
  discard(oderId: string, cardIndices: number[]): boolean {
    if (this.state.phase !== "discarding") return false;

    const player = this.getPlayer(oderId);
    if (!player || player.isFolded || player.hasDiscarded) return false;

    // Validate indices
    if (cardIndices.some((i) => i < 0 || i >= player.hand.length)) return false;
    if (cardIndices.length > 4) return false; // Can discard up to 4 cards

    // Store discarded cards
    player.discardedCards = cardIndices.map((i) => player.hand[i]);

    // Remove discarded cards and draw new ones
    const keptCards = player.hand.filter((_, i) => !cardIndices.includes(i));
    const newCards = this.deck.dealMany(cardIndices.length);
    player.hand = [...keptCards, ...newCards];
    player.hasDiscarded = true;

    this.state.deck = this.deck.serialize().cards;

    // Check if all players have discarded
    this.checkDiscardingComplete();

    return true;
  }

  /**
   * Player keeps all cards (no discard)
   */
  keepAll(oderId: string): boolean {
    if (this.state.phase !== "discarding") return false;

    const player = this.getPlayer(oderId);
    if (!player || player.isFolded || player.hasDiscarded) return false;

    player.hasDiscarded = true;

    // Check if all players have discarded
    this.checkDiscardingComplete();

    return true;
  }

  /**
   * Check if all players have finished discarding
   */
  private checkDiscardingComplete(): void {
    const allDiscarded = this.state.players
      .filter((p) => !p.isFolded)
      .every((p) => p.hasDiscarded);

    if (allDiscarded) {
      this.showdown();
    }
  }

  /**
   * Fold (give up)
   */
  fold(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || player.isDealer) return false;

    player.isFolded = true;

    // If in discarding phase, check completion
    if (this.state.phase === "discarding") {
      this.checkDiscardingComplete();
    }

    return true;
  }

  /**
   * Showdown - evaluate all hands and determine winner
   */
  private showdown(): void {
    this.state.phase = "showdown";

    // Evaluate all hands
    this.state.players.forEach((player) => {
      if (!player.isFolded) {
        player.result = this.evaluateHand(player.hand);
      }
    });

    // Short delay then settle
    this.settle();
  }

  /**
   * Settle the round - pay out winners
   */
  private settle(): void {
    this.state.phase = "settling";

    const dealer = this.state.players.find((p) => p.isDealer);
    if (!dealer || !dealer.result) return;

    const dealerRank = dealer.result?.rank ?? 0;
    const dealerHighCard = dealer.result?.highCard ?? 0;

    this.state.players.forEach((player) => {
      if (player.isDealer || player.isFolded) return;

      if (!player.result) {
        // Folded - already lost bet
        player.payout = -player.bet;
        return;
      }

      const playerRank = player.result.rank;

      if (playerRank > dealerRank) {
        // Player wins
        const multiplier = this.getMultiplier(player.result.handType);
        player.payout = player.bet * multiplier;
      } else if (playerRank < dealerRank) {
        // Dealer wins
        player.payout = -player.bet;
      } else {
        // Tie - compare high card
        if (player.result.highCard > dealerHighCard) {
          player.payout = player.bet;
        } else if (player.result.highCard < dealerHighCard) {
          player.payout = -player.bet;
        } else {
          // Complete tie - push (return bet)
          player.payout = 0;
        }
      }
    });
  }

  /**
   * Get payout multiplier for hand type
   */
  private getMultiplier(handType: KangHandType): number {
    switch (handType) {
      case "kang":
        return 3;
      case "tong":
        return 3;
      case "straight_flush":
        return 5;
      case "straight":
        return 2;
      case "flush":
        return 2;
      case "two_pair":
        return 2;
      case "pair":
        return 1;
      case "high_card":
        return 1;
      default:
        return 1;
    }
  }

  /**
   * End the round and rotate dealer
   */
  endRound(): void {
    this.state.phase = "finished";

    // Rotate dealer
    this.state.dealerIndex = this.getNextPlayerIndex(this.state.dealerIndex);
    this.state.players.forEach((p, i) => {
      p.isDealer = i === this.state.dealerIndex;
    });
  }

  /**
   * Evaluate a hand
   */
  evaluateHand(cards: Card[]): KangHand {
    if (cards.length !== 5) {
      return {
        cards,
        handType: "high_card",
        rank: 0,
        highCard: 0,
        description: "ไม่ครบ 5 ใบ",
      };
    }

    // Sort cards by value
    const sorted = [...cards].sort(
      (a, b) => this.getCardValue(b) - this.getCardValue(a)
    );
    const values = sorted.map((c) => this.getCardValue(c));
    const suits = sorted.map((c) => c.suit);

    // Count occurrences
    const valueCounts = this.countValues(values);
    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = this.isStraight(values);

    // Determine hand type
    if (counts[0] === 3 && counts[1] === 2) {
      return {
        cards,
        handType: "kang",
        rank: 800,
        highCard: values[0],
        description: "แคง",
      };
    }

    if (isStraight && isFlush) {
      return {
        cards,
        handType: "straight_flush",
        rank: 900,
        highCard: values[0],
        description: "สเตรทฟลัช",
      };
    }

    if (counts[0] === 3) {
      return {
        cards,
        handType: "tong",
        rank: 600,
        highCard: values[0],
        description: "ตอง",
      };
    }

    if (isFlush) {
      return {
        cards,
        handType: "flush",
        rank: 500,
        highCard: values[0],
        description: "ฟลัช",
      };
    }

    if (isStraight) {
      return {
        cards,
        handType: "straight",
        rank: 400,
        highCard: values[0],
        description: "เรียง",
      };
    }

    if (counts[0] === 2 && counts[1] === 2) {
      return {
        cards,
        handType: "two_pair",
        rank: 300,
        highCard: values[0],
        description: "สองคู่",
      };
    }

    if (counts[0] === 2) {
      return {
        cards,
        handType: "pair",
        rank: 200,
        highCard: values[0],
        description: "คู่",
      };
    }

    return {
      cards,
      handType: "high_card",
      rank: 100,
      highCard: values[0],
      description: "ไฮการ์ด",
    };
  }

  /**
   * Get card value (A = 14, K = 13, Q = 12, J = 11)
   */
  private getCardValue(card: Card): number {
    // Rank is 1-13 where 1=A, 11=J, 12=Q, 13=K
    if (card.rank === 1) return 14; // A is highest
    return card.rank;
  }

  /**
   * Count occurrences of each value
   */
  private countValues(values: number[]): Record<number, number> {
    return values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  /**
   * Check if values form a straight
   */
  private isStraight(values: number[]): boolean {
    const sorted = [...values].sort((a, b) => b - a);

    // Check for regular straight
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] - sorted[i + 1] !== 1) {
        // Check for A-2-3-4-5 straight (wheel)
        if (sorted[0] === 14 && sorted[1] === 5) {
          return sorted
            .slice(1)
            .every((v, i, arr) => i === 0 || arr[i - 1] - v === 1);
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Get next player index
   */
  private getNextPlayerIndex(currentIndex: number): number {
    return (currentIndex + 1) % this.state.players.length;
  }

  /**
   * Get player by ID
   */
  private getPlayer(oderId: string): KangPlayer | undefined {
    return this.state.players.find((p) => p.oderId === oderId);
  }

  /**
   * Serialize game state for P2P
   */
  serialize(): KangGameState {
    return {
      ...this.state,
      deck: this.deck.serialize().cards,
    };
  }

  /**
   * Deserialize game state from P2P
   */
  static deserialize(data: KangGameState): KangGame {
    const game = new KangGame();
    game.setState(data);
    return game;
  }

  /**
   * Get hand type display name in Thai
   */
  static getHandTypeName(handType: KangHandType): string {
    const names: Record<KangHandType, string> = {
      kang: "แคง",
      tong: "ตอง",
      straight_flush: "สเตรทฟลัช",
      straight: "เรียง",
      flush: "ฟลัช",
      two_pair: "สองคู่",
      pair: "คู่",
      high_card: "ไฮการ์ด",
    };
    return names[handType] || handType;
  }
}
