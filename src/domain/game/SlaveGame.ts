/**
 * Slave (President/Asshole) Game Logic
 * เกมไพ่สลาฟ - ทิ้งไพ่ให้หมดมือก่อนชนะ
 */

import type { Card } from "@/src/domain/types/card.types";
import type {
  PlayType,
  SlaveGameState,
  SlavePlayer,
  SlaveRank,
} from "@/src/domain/types/slave.types";
import {
  SLAVE_CARD_VALUES,
  SLAVE_RANK_NAMES,
  SLAVE_SUIT_VALUES,
} from "@/src/domain/types/slave.types";
import { CardDeck } from "./CardDeck";

/**
 * Slave Game Engine
 */
export class SlaveGame {
  private state: SlaveGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(1);
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): SlaveGameState {
    return {
      phase: "waiting",
      players: [],
      currentPlay: null,
      currentPlayerIndex: 0,
      roundStarterIndex: 0,
      passCount: 0,
      gameNumber: 0,
      finishCount: 0,
      lastPlayerId: null,
    };
  }

  /**
   * Get current game state
   */
  getState(): SlaveGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: SlaveGameState): void {
    this.state = state;
  }

  /**
   * Add player to the game
   */
  addPlayer(
    player: Omit<
      SlavePlayer,
      "hand" | "rank" | "finishOrder" | "passedThisRound" | "isOut"
    >
  ): void {
    const newPlayer: SlavePlayer = {
      ...player,
      hand: [],
      finishOrder: 0,
      passedThisRound: false,
      isOut: false,
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
    this.state.currentPlay = null;
    this.state.passCount = 0;
    this.state.finishCount = 0;
    this.state.lastPlayerId = null;

    // Reset player states
    this.state.players.forEach((player) => {
      player.hand = [];
      player.rank = undefined;
      player.finishOrder = 0;
      player.passedThisRound = false;
      player.isOut = false;
    });

    // Deal all cards
    this.dealCards();

    // Find starting player (3♣ for first game, Slave for subsequent)
    this.findStartingPlayer();

    this.state.phase = "playing";
    this.state.deck = this.deck.serialize().cards;
  }

  /**
   * Deal all cards to players
   */
  private dealCards(): void {
    const numPlayers = this.state.players.length;
    const allCards = this.deck.dealMany(52);

    // Distribute cards evenly
    let cardIndex = 0;
    while (cardIndex < allCards.length) {
      for (let i = 0; i < numPlayers && cardIndex < allCards.length; i++) {
        this.state.players[i].hand.push(allCards[cardIndex]);
        cardIndex++;
      }
    }

    // Sort each player's hand
    this.state.players.forEach((player) => {
      player.hand.sort((a, b) => this.getCardValue(a) - this.getCardValue(b));
    });
  }

  /**
   * Find player with 3 of Clubs (lowest card) to start
   */
  private findStartingPlayer(): void {
    // First game: player with 3 of Clubs (ดอกจิก) starts
    if (this.state.gameNumber === 1) {
      for (let i = 0; i < this.state.players.length; i++) {
        const has3Clubs = this.state.players[i].hand.some(
          (c) => c.rank === 3 && c.suit === "clubs"
        );
        if (has3Clubs) {
          this.state.currentPlayerIndex = i;
          this.state.roundStarterIndex = i;
          return;
        }
      }
    } else {
      // Subsequent games: previous Slave starts
      const slavePlayer = this.state.players.find((p) => p.rank === "slave");
      if (slavePlayer) {
        const slaveIndex = this.state.players.findIndex(
          (p) => p.oderId === slavePlayer.oderId
        );
        if (slaveIndex !== -1) {
          this.state.currentPlayerIndex = slaveIndex;
          this.state.roundStarterIndex = slaveIndex;
          return;
        }
      }
    }

    // Fallback: first player
    this.state.currentPlayerIndex = 0;
    this.state.roundStarterIndex = 0;
  }

  /**
   * Play cards
   */
  playCards(oderId: string, cards: Card[]): boolean {
    const playerIndex = this.state.players.findIndex(
      (p) => p.oderId === oderId
    );
    const player = this.state.players[playerIndex];

    if (!player || playerIndex !== this.state.currentPlayerIndex) return false;
    if (player.isOut) return false;
    if (cards.length === 0) return false;

    // Validate play
    const playType = this.getPlayType(cards);
    if (!playType) return false;

    const playValue = this.getPlayValue(cards);

    // Check if play beats current play
    if (this.state.currentPlay) {
      const currentType = this.state.currentPlay.playType;
      const currentValue = this.state.currentPlay.value;

      // Check valid play combinations
      if (playType !== currentType) {
        // Triple can beat single
        if (playType === "triple" && currentType === "single") {
          // Triple always wins against single (no value check needed)
        }
        // Quadruple (bomb) can beat single or pair
        else if (
          playType === "quadruple" &&
          (currentType === "single" || currentType === "pair")
        ) {
          // Quadruple always wins against single or pair
        }
        // Quadruple can beat quadruple with higher value
        else if (playType === "quadruple" && currentType === "quadruple") {
          if (playValue <= currentValue) return false;
        }
        // Other type mismatches are invalid
        else {
          return false;
        }
      } else {
        // Same type must have higher value
        if (playValue <= currentValue) return false;
      }
    }

    // Remove cards from hand
    const cardIds = cards.map((c) => `${c.suit}-${c.rank}`);
    player.hand = player.hand.filter(
      (c) => !cardIds.includes(`${c.suit}-${c.rank}`)
    );

    // Set current play
    this.state.currentPlay = {
      cards,
      playType,
      value: playValue,
      playerId: oderId,
    };

    this.state.lastPlayerId = oderId;
    this.state.passCount = 0;

    // Reset passedThisRound for all players
    this.state.players.forEach((p) => {
      p.passedThisRound = false;
    });

    // Check if player is out
    if (player.hand.length === 0) {
      this.state.finishCount++;
      player.finishOrder = this.state.finishCount;
      player.isOut = true;

      // Check if game is over (only 1 player left with cards)
      const playersWithCards = this.state.players.filter((p) => !p.isOut);
      if (playersWithCards.length <= 1) {
        this.endGame();
        return true;
      }
    }

    // Move to next player
    this.advanceToNextPlayer();
    return true;
  }

  /**
   * Pass (skip turn)
   */
  pass(oderId: string): boolean {
    const playerIndex = this.state.players.findIndex(
      (p) => p.oderId === oderId
    );
    const player = this.state.players[playerIndex];

    if (!player || playerIndex !== this.state.currentPlayerIndex) return false;
    if (player.isOut) return false;

    // Can't pass if no current play (must play something)
    if (!this.state.currentPlay) return false;

    player.passedThisRound = true;
    this.state.passCount++;

    // Check if all other players passed
    const activePlayers = this.state.players.filter((p) => !p.isOut);
    const allPassed = activePlayers.every(
      (p) => p.passedThisRound || p.oderId === this.state.lastPlayerId
    );

    if (allPassed) {
      // Start new round - last player who played starts
      this.startNewRound();
    } else {
      this.advanceToNextPlayer();
    }

    return true;
  }

  /**
   * Start a new round (after all pass)
   */
  private startNewRound(): void {
    this.state.currentPlay = null;
    this.state.passCount = 0;

    this.state.players.forEach((p) => {
      p.passedThisRound = false;
    });

    // Find the last player who played
    const lastPlayerIndex = this.state.players.findIndex(
      (p) => p.oderId === this.state.lastPlayerId
    );

    if (lastPlayerIndex !== -1) {
      const lastPlayer = this.state.players[lastPlayerIndex];
      if (lastPlayer.isOut) {
        // If last player is out, move to next active player
        this.state.currentPlayerIndex = lastPlayerIndex;
        this.advanceToNextPlayer();
      } else {
        this.state.currentPlayerIndex = lastPlayerIndex;
      }
      this.state.roundStarterIndex = this.state.currentPlayerIndex;
    }
  }

  /**
   * Advance to next player
   */
  private advanceToNextPlayer(): void {
    const numPlayers = this.state.players.length;
    let nextIndex = (this.state.currentPlayerIndex + 1) % numPlayers;
    let attempts = 0;

    // Find next player who is still in the game
    while (this.state.players[nextIndex].isOut && attempts < numPlayers) {
      nextIndex = (nextIndex + 1) % numPlayers;
      attempts++;
    }

    this.state.currentPlayerIndex = nextIndex;
  }

  /**
   * End the game and assign ranks
   */
  private endGame(): void {
    this.state.phase = "round_end";

    // Assign rank to last player with cards
    const lastPlayer = this.state.players.find((p) => !p.isOut);
    if (lastPlayer) {
      this.state.finishCount++;
      lastPlayer.finishOrder = this.state.finishCount;
      lastPlayer.isOut = true;
    }

    // Assign ranks based on finish order
    const numPlayers = this.state.players.length;
    this.state.players.forEach((player) => {
      const order = player.finishOrder;
      if (numPlayers === 2) {
        player.rank = order === 1 ? "president" : "slave";
      } else if (numPlayers === 3) {
        player.rank =
          order === 1 ? "president" : order === 2 ? "citizen" : "slave";
      } else {
        // 4 players
        player.rank =
          order === 1
            ? "president"
            : order === 2
            ? "vice_president"
            : order === 3
            ? "vice_slave"
            : "slave";
      }
    });

    this.state.phase = "finished";
  }

  /**
   * Get play type from cards
   */
  private getPlayType(cards: Card[]): PlayType | null {
    const length = cards.length;
    if (length === 0) return null;

    // Use rank values only for determining play type
    const rankValues = cards.map((c) => this.getRankValue(c));
    const uniqueRanks = new Set(rankValues);

    if (length === 1) return "single";

    if (length === 2 && uniqueRanks.size === 1) return "pair";

    if (length === 3 && uniqueRanks.size === 1) return "triple";

    if (length === 4 && uniqueRanks.size === 1) return "quadruple";

    // Check for straight (3+ consecutive singles)
    if (length >= 3 && uniqueRanks.size === length) {
      const sorted = [...rankValues].sort((a, b) => a - b);
      let isConsecutive = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] !== 1) {
          isConsecutive = false;
          break;
        }
      }
      // Don't allow 2 in straight (rank value 13)
      if (isConsecutive && !rankValues.includes(13)) return "straight";
    }

    return null;
  }

  /**
   * Get play value (highest card value)
   */
  private getPlayValue(cards: Card[]): number {
    return Math.max(...cards.map((c) => this.getCardValue(c)));
  }

  /**
   * Get card value for Slave (2 is highest)
   * Combines rank and suit: rank * 10 + suit
   * This ensures 5♠ > 5♥ > 5♦ > 5♣
   */
  private getCardValue(card: Card): number {
    const rankValue = SLAVE_CARD_VALUES[card.rank] || 0;
    const suitValue = SLAVE_SUIT_VALUES[card.suit] || 0;
    return rankValue * 10 + suitValue;
  }

  /**
   * Get rank-only value (for grouping same rank cards)
   */
  private getRankValue(card: Card): number {
    return SLAVE_CARD_VALUES[card.rank] || 0;
  }

  /**
   * Get playable cards for current player
   */
  getPlayableCards(playerId: string): Card[][] {
    const player = this.state.players.find((p) => p.oderId === playerId);
    if (!player) return [];

    const playable: Card[][] = [];
    const hand = player.hand;

    // If no current play, can play anything
    if (!this.state.currentPlay) {
      // Singles
      hand.forEach((c) => playable.push([c]));
      // Pairs
      this.findGroups(hand, 2).forEach((g) => playable.push(g));
      // Triples
      this.findGroups(hand, 3).forEach((g) => playable.push(g));
      // Quadruples
      this.findGroups(hand, 4).forEach((g) => playable.push(g));
      // Straights
      this.findStraights(hand).forEach((s) => playable.push(s));
      return playable;
    }

    const currentType = this.state.currentPlay.playType;
    const currentValue = this.state.currentPlay.value;

    // Must beat current play
    if (currentType === "single") {
      // Higher singles
      hand
        .filter((c) => this.getCardValue(c) > currentValue)
        .forEach((c) => playable.push([c]));
      // Triple can beat single (no value check needed)
      this.findGroups(hand, 3).forEach((g) => playable.push(g));
    } else if (currentType === "pair") {
      // Higher pairs
      this.findGroups(hand, 2)
        .filter((g) => this.getPlayValue(g) > currentValue)
        .forEach((g) => playable.push(g));
      // Quadruple can beat pair (added below in bomb section)
    } else if (currentType === "triple") {
      this.findGroups(hand, 3)
        .filter((g) => this.getPlayValue(g) > currentValue)
        .forEach((g) => playable.push(g));
    } else if (currentType === "quadruple") {
      this.findGroups(hand, 4)
        .filter((g) => this.getPlayValue(g) > currentValue)
        .forEach((g) => playable.push(g));
    } else if (currentType === "straight") {
      const straightLen = this.state.currentPlay.cards.length;
      this.findStraights(hand, straightLen)
        .filter((s) => this.getPlayValue(s) > currentValue)
        .forEach((s) => playable.push(s));
    }

    // Quadruple (bomb) can beat single or pair
    if (currentType === "single" || currentType === "pair") {
      this.findGroups(hand, 4).forEach((g) => playable.push(g));
    }
    // Quadruple can beat quadruple with higher value (handled above)

    return playable;
  }

  /**
   * Find groups of same rank cards (pairs, triples, quadruples)
   */
  private findGroups(hand: Card[], size: number): Card[][] {
    const groups: Card[][] = [];
    const rankGroups = new Map<number, Card[]>();

    // Group by rank only (not suit)
    hand.forEach((card) => {
      const rank = this.getRankValue(card);
      if (!rankGroups.has(rank)) {
        rankGroups.set(rank, []);
      }
      rankGroups.get(rank)!.push(card);
    });

    rankGroups.forEach((cards) => {
      if (cards.length >= size) {
        // Get all combinations of 'size' cards
        const combos = this.getCombinations(cards, size);
        combos.forEach((combo) => groups.push(combo));
      }
    });

    return groups;
  }

  /**
   * Find straights in hand
   */
  private findStraights(hand: Card[], minLength: number = 3): Card[][] {
    const straights: Card[][] = [];
    const valueCards = new Map<number, Card[]>();

    // Group by value (excluding 2s)
    hand.forEach((card) => {
      const value = this.getCardValue(card);
      if (value === 13) return; // Skip 2s
      if (!valueCards.has(value)) {
        valueCards.set(value, []);
      }
      valueCards.get(value)!.push(card);
    });

    const values = Array.from(valueCards.keys()).sort((a, b) => a - b);

    // Find consecutive sequences
    for (let i = 0; i < values.length; i++) {
      const sequence: number[] = [values[i]];
      let j = i + 1;
      while (j < values.length && values[j] === values[j - 1] + 1) {
        sequence.push(values[j]);
        j++;
      }

      if (sequence.length >= minLength) {
        // Generate straights of various lengths
        for (let len = minLength; len <= sequence.length; len++) {
          for (let start = 0; start <= sequence.length - len; start++) {
            const straightValues = sequence.slice(start, start + len);
            const straightCards = straightValues.map(
              (v) => valueCards.get(v)![0]
            );
            straights.push(straightCards);
          }
        }
      }
    }

    return straights;
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
   * Serialize game state for P2P
   */
  serialize(): SlaveGameState {
    return {
      ...this.state,
      deck: this.deck.serialize().cards,
    };
  }

  /**
   * Deserialize game state from P2P
   */
  static deserialize(data: SlaveGameState): SlaveGame {
    const game = new SlaveGame();
    game.setState(data);
    return game;
  }

  /**
   * Get rank name in Thai
   */
  static getRankName(rank: SlaveRank): string {
    return SLAVE_RANK_NAMES[rank];
  }
}
