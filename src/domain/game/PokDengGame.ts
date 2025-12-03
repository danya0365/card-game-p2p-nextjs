/**
 * Pok Deng (ป๊อกเดง) Game Logic
 * Thai card game where players compare hands against the dealer
 */

import type { Card } from "@/src/domain/types/card.types";
import type {
  PokDengGameState,
  PokDengHand,
  PokDengHandType,
  PokDengPlayer,
} from "@/src/domain/types/pokdeng.types";
import { CardDeck } from "./CardDeck";

/**
 * Pok Deng Game Engine
 */
export class PokDengGame {
  private state: PokDengGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(1);
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): PokDengGameState {
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
  getState(): PokDengGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: PokDengGameState): void {
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
      PokDengPlayer,
      "hand" | "bet" | "payout" | "isDealer" | "isFolded" | "hasDrawn"
    >
  ): void {
    const newPlayer: PokDengPlayer = {
      ...player,
      hand: [],
      bet: 0,
      payout: 0,
      isDealer: this.state.players.length === 0,
      isFolded: false,
      hasDrawn: false,
    };
    this.state.players.push(newPlayer);
  }

  /**
   * Remove player from the game
   */
  removePlayer(oderId: string): void {
    const index = this.state.players.findIndex((p) => p.oderId === oderId);
    if (index !== -1) {
      this.state.players.splice(index, 1);
      // Reassign dealer if needed
      if (this.state.players.length > 0) {
        this.state.dealerIndex =
          this.state.dealerIndex % this.state.players.length;
        this.state.players.forEach((p, i) => {
          p.isDealer = i === this.state.dealerIndex;
        });
      }
    }
  }

  /**
   * Start a new round
   */
  startRound(): void {
    // Reset deck and shuffle
    this.deck.reset();

    // Reset player states
    this.state.players.forEach((player) => {
      player.hand = [];
      player.bet = 0;
      player.payout = 0;
      player.result = undefined;
      player.isFolded = false;
      player.hasDrawn = false;
    });

    this.state.phase = "betting";
    this.state.pot = 0;
    this.state.roundNumber++;
    this.state.currentPlayerIndex = this.getNextPlayerIndex(
      this.state.dealerIndex
    );
  }

  /**
   * Place a bet
   */
  placeBet(oderId: string, amount: number): boolean {
    if (this.state.phase !== "betting") return false;

    const player = this.getPlayer(oderId);
    if (!player || player.isDealer) return false;

    // Validate bet amount
    if (amount < this.state.minBet || amount > this.state.maxBet) return false;

    player.bet = amount;
    this.state.pot += amount;

    // Check if all non-dealer players have bet
    const allBet = this.state.players
      .filter((p) => !p.isDealer)
      .every((p) => p.bet > 0);

    if (allBet) {
      this.dealInitialCards();
    }

    return true;
  }

  /**
   * Deal initial 2 cards to each player
   */
  private dealInitialCards(): void {
    this.state.phase = "dealing";

    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of this.state.players) {
        const card = this.deck.deal();
        if (card) {
          player.hand.push(card);
        }
      }
    }

    // Check for Pok (natural 8 or 9)
    const hasPok = this.state.players.some((p) => {
      const hand = this.evaluateHand(p.hand);
      return hand.isPok;
    });

    if (hasPok) {
      // If any player has Pok, skip to revealing
      this.state.phase = "revealing";
      this.revealAndSettle();
    } else {
      // Move to playing phase
      this.state.phase = "playing";
      this.state.currentPlayerIndex = this.getNextPlayerIndex(
        this.state.dealerIndex
      );
    }
  }

  /**
   * Player draws a third card
   */
  drawCard(oderId: string): boolean {
    if (this.state.phase !== "playing") return false;

    const player = this.getPlayer(oderId);
    if (!player || player.hasDrawn || player.hand.length >= 3) return false;

    const card = this.deck.deal();
    if (card) {
      player.hand.push(card);
      player.hasDrawn = true;
    }

    this.moveToNextPlayer();
    return true;
  }

  /**
   * Player stays with current hand
   */
  stay(oderId: string): boolean {
    if (this.state.phase !== "playing") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;

    player.hasDrawn = true; // Mark as done
    this.moveToNextPlayer();
    return true;
  }

  /**
   * Player folds
   */
  fold(oderId: string): boolean {
    if (this.state.phase !== "playing" && this.state.phase !== "betting")
      return false;

    const player = this.getPlayer(oderId);
    if (!player || player.isDealer) return false;

    player.isFolded = true;
    this.moveToNextPlayer();
    return true;
  }

  /**
   * Move to next player or phase
   */
  private moveToNextPlayer(): void {
    const activePlayers = this.state.players.filter(
      (p) => !p.isFolded && !p.hasDrawn
    );

    if (activePlayers.length === 0) {
      // All players done, reveal and settle
      this.state.phase = "revealing";
      this.revealAndSettle();
    } else {
      // Find next active player
      let nextIndex = this.state.currentPlayerIndex;
      do {
        nextIndex = this.getNextPlayerIndex(nextIndex);
        const player = this.state.players[nextIndex];
        if (!player.isFolded && !player.hasDrawn) {
          break;
        }
      } while (nextIndex !== this.state.currentPlayerIndex);

      this.state.currentPlayerIndex = nextIndex;
    }
  }

  /**
   * Reveal hands and settle bets
   */
  private revealAndSettle(): void {
    // Evaluate all hands
    this.state.players.forEach((player) => {
      player.result = this.evaluateHand(player.hand);
    });

    const dealer = this.state.players[this.state.dealerIndex];
    const dealerHand = dealer.result!;

    // Compare each player against dealer
    this.state.players.forEach((player) => {
      if (player.isDealer || player.isFolded) return;

      const comparison = this.compareHands(player.result!, dealerHand);

      if (comparison > 0) {
        // Player wins
        const winAmount = player.bet * player.result!.multiplier;
        player.payout = winAmount;
        dealer.payout -= winAmount;
      } else if (comparison < 0) {
        // Dealer wins
        player.payout = -player.bet;
        dealer.payout += player.bet;
      } else {
        // Tie - return bet
        player.payout = 0;
      }
    });

    this.state.phase = "settling";
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
   * Get next player index
   */
  private getNextPlayerIndex(currentIndex: number): number {
    return (currentIndex + 1) % this.state.players.length;
  }

  /**
   * Get player by ID
   */
  private getPlayer(oderId: string): PokDengPlayer | undefined {
    return this.state.players.find((p) => p.oderId === oderId);
  }

  /**
   * Evaluate a hand and return points, type, and multiplier
   */
  evaluateHand(cards: Card[]): PokDengHand {
    if (cards.length < 2) {
      return {
        cards,
        points: 0,
        handType: "normal",
        multiplier: 1,
        isPok: false,
      };
    }

    // Calculate points (sum of card values mod 10)
    const points =
      cards.reduce((sum, card) => {
        return sum + CardDeck.getPokDengValue(card);
      }, 0) % 10;

    // Check for special hands
    const handType = this.getHandType(cards, points);
    const multiplier = this.getMultiplier(handType);
    const isPok = cards.length === 2 && (points === 8 || points === 9);

    return {
      cards,
      points,
      handType,
      multiplier,
      isPok,
    };
  }

  /**
   * Determine hand type
   */
  private getHandType(cards: Card[], points: number): PokDengHandType {
    // Check for Pok (8 or 9 with 2 cards)
    if (cards.length === 2) {
      if (points === 9) return "pok9";
      if (points === 8) return "pok8";

      // Check for pair
      if (cards[0].rank === cards[1].rank) return "pair";
    }

    if (cards.length === 3) {
      // Check for Tong (three of a kind)
      if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
        return "tong";
      }

      // Sort cards for straight check
      const sorted = [...cards].sort((a, b) => a.rank - b.rank);
      const isSequential =
        sorted[1].rank === sorted[0].rank + 1 &&
        sorted[2].rank === sorted[1].rank + 1;

      // Check for same suit
      const sameSuit = cards.every((c) => c.suit === cards[0].suit);

      if (isSequential && sameSuit) return "straight_flush";
      if (sameSuit) return "flush";
      if (isSequential) return "straight";
    }

    return "normal";
  }

  /**
   * Get payout multiplier based on hand type
   */
  private getMultiplier(handType: PokDengHandType): number {
    switch (handType) {
      case "tong":
        return 5;
      case "straight_flush":
        return 5;
      case "straight":
        return 3;
      case "flush":
        return 3;
      case "pok9":
        return 2;
      case "pok8":
        return 2;
      case "pair":
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Compare two hands. Returns:
   * > 0 if hand1 wins
   * < 0 if hand2 wins
   * = 0 if tie
   */
  compareHands(hand1: PokDengHand, hand2: PokDengHand): number {
    // Pok beats non-Pok
    if (hand1.isPok && !hand2.isPok) return 1;
    if (!hand1.isPok && hand2.isPok) return -1;

    // Higher points wins
    if (hand1.points !== hand2.points) {
      return hand1.points - hand2.points;
    }

    // Same points - check hand type priority
    const typePriority: Record<PokDengHandType, number> = {
      tong: 7,
      straight_flush: 6,
      straight: 5,
      flush: 4,
      pok9: 3,
      pok8: 2,
      pair: 1,
      normal: 0,
    };

    return typePriority[hand1.handType] - typePriority[hand2.handType];
  }

  /**
   * Get hand type display name in Thai
   */
  static getHandTypeName(handType: PokDengHandType): string {
    const names: Record<PokDengHandType, string> = {
      pok9: "ป๊อกเก้า",
      pok8: "ป๊อกแปด",
      tong: "ตอง",
      straight_flush: "สเตรทฟลัช",
      straight: "สเตรท",
      flush: "สามดอก",
      pair: "ไพ่คู่",
      normal: "ไพ่ธรรมดา",
    };
    return names[handType];
  }

  /**
   * Serialize for P2P transmission
   */
  serialize(): PokDengGameState {
    return {
      ...this.state,
      deck: this.deck.serialize().cards,
    };
  }
}
