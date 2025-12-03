/**
 * Texas Hold'em Poker Game Logic
 */

import type { Card } from "@/src/domain/types/card.types";
import type {
  PokerGameState,
  PokerHandRank,
  PokerHandResult,
  PokerPlayer,
} from "@/src/domain/types/poker.types";
import {
  HAND_RANK_NAMES,
  HAND_RANK_VALUES,
} from "@/src/domain/types/poker.types";
import { CardDeck } from "./CardDeck";

/**
 * Texas Hold'em Poker Game Engine
 */
export class PokerGame {
  private state: PokerGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(1);
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): PokerGameState {
    return {
      phase: "waiting",
      players: [],
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: 0,
      dealerIndex: 0,
      currentPlayerIndex: 0,
      smallBlind: 5,
      bigBlind: 10,
      roundNumber: 0,
      lastRaiseAmount: 0,
    };
  }

  /**
   * Get current game state
   */
  getState(): PokerGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: PokerGameState): void {
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
      PokerPlayer,
      | "holeCards"
      | "currentBet"
      | "totalBet"
      | "isFolded"
      | "isAllIn"
      | "hasActed"
      | "result"
      | "winAmount"
    >
  ): void {
    const newPlayer: PokerPlayer = {
      ...player,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      isFolded: false,
      isAllIn: false,
      hasActed: false,
      winAmount: 0,
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
   * Start a new hand
   */
  startHand(): void {
    this.deck = new CardDeck(1);
    this.deck.shuffle();

    this.state.roundNumber++;
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.sidePots = [];
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlind;
    this.state.lastRaiseAmount = this.state.bigBlind;

    // Reset player states
    this.state.players.forEach((player) => {
      player.holeCards = [];
      player.currentBet = 0;
      player.totalBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
      player.hasActed = false;
      player.result = undefined;
      player.winAmount = 0;
    });

    // Move dealer button
    this.state.dealerIndex =
      (this.state.dealerIndex + 1) % this.state.players.length;

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Set phase to preflop
    this.state.phase = "preflop";

    // Set current player (after big blind)
    const bbIndex = (this.state.dealerIndex + 2) % this.state.players.length;
    this.state.currentPlayerIndex = (bbIndex + 1) % this.state.players.length;

    this.state.deck = this.deck.serialize().cards;
  }

  /**
   * Post small and big blinds
   */
  private postBlinds(): void {
    const numPlayers = this.state.players.length;
    const sbIndex = (this.state.dealerIndex + 1) % numPlayers;
    const bbIndex = (this.state.dealerIndex + 2) % numPlayers;

    // Small blind
    const sbPlayer = this.state.players[sbIndex];
    const sbAmount = Math.min(this.state.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalBet = sbAmount;
    this.state.pot += sbAmount;

    // Big blind
    const bbPlayer = this.state.players[bbIndex];
    const bbAmount = Math.min(this.state.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalBet = bbAmount;
    this.state.pot += bbAmount;

    this.state.currentBet = bbAmount;
  }

  /**
   * Deal 2 hole cards to each player
   */
  private dealHoleCards(): void {
    this.state.players.forEach((player) => {
      if (!player.isFolded) {
        player.holeCards = this.deck.dealMany(2);
      }
    });
  }

  /**
   * Player folds
   */
  fold(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !this.isPlayerTurn(oderId)) return false;

    player.isFolded = true;
    player.hasActed = true;

    // Check if only one player remains
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      this.awardPot(activePlayers[0].oderId);
      return true;
    }

    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Player checks
   */
  check(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !this.isPlayerTurn(oderId)) return false;
    if (player.currentBet < this.state.currentBet) return false; // Must call or fold

    player.hasActed = true;
    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Player calls
   */
  call(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !this.isPlayerTurn(oderId)) return false;

    const callAmount = this.state.currentBet - player.currentBet;
    if (callAmount <= 0) return false;

    const actualAmount = Math.min(callAmount, player.chips);
    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalBet += actualAmount;
    this.state.pot += actualAmount;

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    player.hasActed = true;
    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Player raises
   */
  raise(oderId: string, raiseAmount: number): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !this.isPlayerTurn(oderId)) return false;

    const callAmount = this.state.currentBet - player.currentBet;
    const totalAmount = callAmount + raiseAmount;

    if (raiseAmount < this.state.minRaise && player.chips > totalAmount) {
      return false; // Raise must be at least min raise (unless all-in)
    }

    const actualAmount = Math.min(totalAmount, player.chips);
    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalBet += actualAmount;
    this.state.pot += actualAmount;

    // Update current bet and min raise
    const actualRaise = player.currentBet - this.state.currentBet;
    this.state.currentBet = player.currentBet;
    this.state.minRaise = Math.max(this.state.minRaise, actualRaise);
    this.state.lastRaiseAmount = actualRaise;

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    // Reset hasActed for all other players
    this.state.players.forEach((p) => {
      if (p.oderId !== oderId && !p.isFolded && !p.isAllIn) {
        p.hasActed = false;
      }
    });

    player.hasActed = true;
    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Player goes all-in
   */
  allIn(oderId: string): boolean {
    const player = this.getPlayer(oderId);
    if (!player || !this.isPlayerTurn(oderId)) return false;

    const allInAmount = player.chips;
    player.currentBet += allInAmount;
    player.totalBet += allInAmount;
    this.state.pot += allInAmount;
    player.chips = 0;
    player.isAllIn = true;

    // Update current bet if this is a raise
    if (player.currentBet > this.state.currentBet) {
      const actualRaise = player.currentBet - this.state.currentBet;
      this.state.currentBet = player.currentBet;

      if (actualRaise >= this.state.minRaise) {
        this.state.minRaise = actualRaise;
        this.state.lastRaiseAmount = actualRaise;

        // Reset hasActed for all other players
        this.state.players.forEach((p) => {
          if (p.oderId !== oderId && !p.isFolded && !p.isAllIn) {
            p.hasActed = false;
          }
        });
      }
    }

    player.hasActed = true;
    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Advance to next player or next phase
   */
  private advanceToNextPlayer(): void {
    // Check if betting round is complete
    const needToAct = this.state.players.filter(
      (p) => !p.isFolded && !p.isAllIn && !p.hasActed
    );

    if (needToAct.length === 0) {
      // Check if all but one folded
      const activePlayers = this.getActivePlayers();
      if (activePlayers.length === 1) {
        this.awardPot(activePlayers[0].oderId);
        return;
      }

      // Move to next phase
      this.advancePhase();
      return;
    }

    // Find next player to act
    let nextIndex =
      (this.state.currentPlayerIndex + 1) % this.state.players.length;
    while (
      this.state.players[nextIndex].isFolded ||
      this.state.players[nextIndex].isAllIn ||
      this.state.players[nextIndex].hasActed
    ) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    this.state.currentPlayerIndex = nextIndex;
  }

  /**
   * Advance to next phase
   */
  private advancePhase(): void {
    // Reset betting for new round
    this.state.players.forEach((p) => {
      p.currentBet = 0;
      p.hasActed = false;
    });
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlind;

    // Set first player to act (first active player after dealer)
    let firstToAct = (this.state.dealerIndex + 1) % this.state.players.length;
    while (
      this.state.players[firstToAct].isFolded ||
      this.state.players[firstToAct].isAllIn
    ) {
      firstToAct = (firstToAct + 1) % this.state.players.length;
      if (firstToAct === this.state.dealerIndex) break;
    }
    this.state.currentPlayerIndex = firstToAct;

    // Check if all players but one are all-in
    const canAct = this.state.players.filter((p) => !p.isFolded && !p.isAllIn);
    const shouldSkipBetting = canAct.length <= 1;

    switch (this.state.phase) {
      case "preflop":
        this.state.phase = "flop";
        this.state.communityCards = this.deck.dealMany(3);
        break;
      case "flop":
        this.state.phase = "turn";
        this.state.communityCards.push(...this.deck.dealMany(1));
        break;
      case "turn":
        this.state.phase = "river";
        this.state.communityCards.push(...this.deck.dealMany(1));
        break;
      case "river":
        this.showdown();
        return;
    }

    this.state.deck = this.deck.serialize().cards;

    // Skip betting if only one player can act
    if (shouldSkipBetting) {
      this.advancePhase();
    }
  }

  /**
   * Showdown - evaluate hands and determine winner
   */
  private showdown(): void {
    this.state.phase = "showdown";

    const activePlayers = this.getActivePlayers();

    // Evaluate each player's hand
    activePlayers.forEach((player) => {
      player.result = this.evaluateHand(
        player.holeCards,
        this.state.communityCards
      );
    });

    // Determine winner(s)
    this.settlePots();
  }

  /**
   * Award pot to winner (when all others fold)
   */
  private awardPot(winnerId: string): void {
    const winner = this.getPlayer(winnerId);
    if (winner) {
      winner.winAmount = this.state.pot;
      winner.chips += this.state.pot;
      this.state.pot = 0;
    }
    this.state.phase = "settling";
  }

  /**
   * Settle pots and award to winners
   */
  private settlePots(): void {
    const activePlayers = this.getActivePlayers()
      .filter((p) => p.result)
      .sort((a, b) => this.compareHands(b.result!, a.result!));

    if (activePlayers.length === 0) return;

    // Simple pot distribution (no side pots for now)
    const winners = [activePlayers[0]];

    // Check for ties
    for (let i = 1; i < activePlayers.length; i++) {
      if (
        this.compareHands(activePlayers[i].result!, winners[0].result!) === 0
      ) {
        winners.push(activePlayers[i]);
      } else {
        break;
      }
    }

    // Split pot among winners
    const winAmount = Math.floor(this.state.pot / winners.length);
    winners.forEach((winner) => {
      winner.winAmount = winAmount;
      winner.chips += winAmount;
    });

    this.state.pot = 0;
    this.state.phase = "settling";
  }

  /**
   * End the hand
   */
  endHand(): void {
    this.state.phase = "finished";
  }

  /**
   * Evaluate a poker hand (hole cards + community cards)
   */
  evaluateHand(holeCards: Card[], communityCards: Card[]): PokerHandResult {
    const allCards = [...holeCards, ...communityCards];

    // Get all 5-card combinations and find the best
    const combinations = this.getCombinations(allCards, 5);
    let bestResult: PokerHandResult | null = null;

    for (const combo of combinations) {
      const result = this.evaluateFiveCards(combo);
      if (!bestResult || this.compareHands(result, bestResult) > 0) {
        bestResult = result;
      }
    }

    return bestResult!;
  }

  /**
   * Evaluate a 5-card hand
   */
  private evaluateFiveCards(cards: Card[]): PokerHandResult {
    const sorted = [...cards].sort(
      (a, b) => this.getCardValue(b) - this.getCardValue(a)
    );
    const suits = cards.map((c) => c.suit);
    const values = sorted.map((c) => this.getCardValue(c));

    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = this.checkStraight(values);
    const groups = this.groupByValue(values);

    let rank: PokerHandRank;
    let description: string;

    if (isFlush && isStraight && values[0] === 14) {
      rank = "royal_flush";
      description = "Royal Flush";
    } else if (isFlush && isStraight) {
      rank = "straight_flush";
      description = `Straight Flush, ${this.getValueName(values[0])} high`;
    } else if (groups[0].count === 4) {
      rank = "four_of_a_kind";
      description = `Four of a Kind, ${this.getValueName(groups[0].value)}s`;
    } else if (groups[0].count === 3 && groups[1].count === 2) {
      rank = "full_house";
      description = `Full House, ${this.getValueName(
        groups[0].value
      )}s full of ${this.getValueName(groups[1].value)}s`;
    } else if (isFlush) {
      rank = "flush";
      description = `Flush, ${this.getValueName(values[0])} high`;
    } else if (isStraight) {
      rank = "straight";
      description = `Straight, ${this.getValueName(values[0])} high`;
    } else if (groups[0].count === 3) {
      rank = "three_of_a_kind";
      description = `Three of a Kind, ${this.getValueName(groups[0].value)}s`;
    } else if (groups[0].count === 2 && groups[1].count === 2) {
      rank = "two_pair";
      description = `Two Pair, ${this.getValueName(
        groups[0].value
      )}s and ${this.getValueName(groups[1].value)}s`;
    } else if (groups[0].count === 2) {
      rank = "one_pair";
      description = `Pair of ${this.getValueName(groups[0].value)}s`;
    } else {
      rank = "high_card";
      description = `${this.getValueName(values[0])} high`;
    }

    return {
      rank,
      rankValue: HAND_RANK_VALUES[rank],
      cards: sorted,
      kickers: sorted.filter((_, i) => i >= groups[0].count),
      description,
    };
  }

  /**
   * Compare two hands
   */
  private compareHands(a: PokerHandResult, b: PokerHandResult): number {
    if (a.rankValue !== b.rankValue) {
      return a.rankValue - b.rankValue;
    }

    // Compare kickers
    const aValues = a.cards.map((c) => this.getCardValue(c));
    const bValues = b.cards.map((c) => this.getCardValue(c));

    for (let i = 0; i < 5; i++) {
      if (aValues[i] !== bValues[i]) {
        return aValues[i] - bValues[i];
      }
    }

    return 0;
  }

  /**
   * Check if values form a straight
   */
  private checkStraight(values: number[]): boolean {
    // Check regular straight
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] - values[i + 1] !== 1) {
        // Check for A-2-3-4-5 (wheel)
        if (values[0] === 14 && values.slice(1).join(",") === "5,4,3,2") {
          return true;
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Group values by count
   */
  private groupByValue(values: number[]): { value: number; count: number }[] {
    const counts = new Map<number, number>();
    values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || b.value - a.value);
  }

  /**
   * Get all combinations of size k
   */
  private getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];

    const [first, ...rest] = arr;
    const withFirst = this.getCombinations(rest, k - 1).map((c) => [
      first,
      ...c,
    ]);
    const withoutFirst = this.getCombinations(rest, k);

    return [...withFirst, ...withoutFirst];
  }

  /**
   * Get card value (A=14, K=13, etc.)
   */
  private getCardValue(card: Card): number {
    if (card.rank === 1) return 14; // Ace high
    return card.rank;
  }

  /**
   * Get value name
   */
  private getValueName(value: number): string {
    const names: Record<number, string> = {
      14: "Ace",
      13: "King",
      12: "Queen",
      11: "Jack",
      10: "Ten",
      9: "Nine",
      8: "Eight",
      7: "Seven",
      6: "Six",
      5: "Five",
      4: "Four",
      3: "Three",
      2: "Two",
    };
    return names[value] || value.toString();
  }

  /**
   * Check if it's the specified player's turn
   */
  private isPlayerTurn(oderId: string): boolean {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    return currentPlayer?.oderId === oderId;
  }

  /**
   * Get player by ID
   */
  private getPlayer(oderId: string): PokerPlayer | undefined {
    return this.state.players.find((p) => p.oderId === oderId);
  }

  /**
   * Get active (non-folded) players
   */
  private getActivePlayers(): PokerPlayer[] {
    return this.state.players.filter((p) => !p.isFolded);
  }

  /**
   * Serialize game state for P2P
   */
  serialize(): PokerGameState {
    return {
      ...this.state,
      deck: this.deck.serialize().cards,
    };
  }

  /**
   * Deserialize game state from P2P
   */
  static deserialize(data: PokerGameState): PokerGame {
    const game = new PokerGame();
    game.setState(data);
    return game;
  }

  /**
   * Get hand rank name in Thai
   */
  static getHandRankName(rank: PokerHandRank): string {
    return HAND_RANK_NAMES[rank];
  }
}
