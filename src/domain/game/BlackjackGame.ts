/**
 * Blackjack (แบล็คแจ็ค) Game Logic
 * Goal: Get as close to 21 as possible without going over
 */

import type {
  BlackjackGameState,
  BlackjackHand,
  BlackjackHandResult,
  BlackjackPlayer,
} from "@/src/domain/types/blackjack.types";
import type { Card } from "@/src/domain/types/card.types";
import { CardDeck } from "./CardDeck";

/**
 * Blackjack Game Engine
 */
export class BlackjackGame {
  private state: BlackjackGameState;
  private deck: CardDeck;

  constructor() {
    this.deck = new CardDeck(6); // Use 6 decks like real casinos
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   */
  private createInitialState(): BlackjackGameState {
    return {
      phase: "waiting",
      players: [],
      dealer: {
        hand: [],
        isHoleCardRevealed: false,
      },
      currentPlayerIndex: 0,
      minBet: 10,
      maxBet: 500,
      roundNumber: 0,
    };
  }

  /**
   * Get current game state
   */
  getState(): BlackjackGameState {
    return { ...this.state };
  }

  /**
   * Set game state (for P2P sync)
   */
  setState(state: BlackjackGameState): void {
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
      BlackjackPlayer,
      | "hands"
      | "currentHandIndex"
      | "totalBet"
      | "totalPayout"
      | "hasInsurance"
      | "insuranceBet"
      | "hasSurrendered"
    >
  ): void {
    const newPlayer: BlackjackPlayer = {
      ...player,
      hands: [],
      currentHandIndex: 0,
      totalBet: 0,
      totalPayout: 0,
      hasInsurance: false,
      insuranceBet: 0,
      hasSurrendered: false,
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
    // Reshuffle if less than 25% cards remain
    if (this.deck.remaining() < 78) {
      this.deck = new CardDeck(6);
      this.deck.shuffle();
    }

    this.state.roundNumber++;
    this.state.phase = "betting";
    this.state.currentPlayerIndex = 0;

    // Reset dealer
    this.state.dealer = {
      hand: [],
      isHoleCardRevealed: false,
    };

    // Reset player states
    this.state.players.forEach((player) => {
      player.hands = [];
      player.currentHandIndex = 0;
      player.totalBet = 0;
      player.totalPayout = 0;
      player.hasInsurance = false;
      player.insuranceBet = 0;
      player.hasSurrendered = false;
    });

    this.state.deck = this.deck.serialize().cards;
  }

  /**
   * Place a bet
   */
  placeBet(oderId: string, amount: number): boolean {
    if (this.state.phase !== "betting") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (amount < this.state.minBet || amount > this.state.maxBet) return false;

    // Create initial hand with bet
    player.hands = [
      {
        cards: [],
        bet: amount,
        isDoubled: false,
        isSplit: false,
        isStand: false,
        isBust: false,
        isBlackjack: false,
        payout: 0,
      },
    ];
    player.totalBet = amount;

    // Check if all players have bet
    const allBet = this.state.players.every((p) => p.hands.length > 0);
    if (allBet) {
      this.dealInitialCards();
    }

    return true;
  }

  /**
   * Deal initial 2 cards to each player and dealer
   */
  private dealInitialCards(): void {
    this.state.phase = "dealing";

    // Deal 2 cards to each player
    this.state.players.forEach((player) => {
      if (player.hands.length > 0) {
        player.hands[0].cards = this.deck.dealMany(2);

        // Check for blackjack
        if (this.calculateHandValue(player.hands[0].cards) === 21) {
          player.hands[0].isBlackjack = true;
          player.hands[0].isStand = true;
        }
      }
    });

    // Deal 2 cards to dealer (second card is hole card)
    this.state.dealer.hand = this.deck.dealMany(2);

    this.state.deck = this.deck.serialize().cards;

    // Check if dealer shows Ace (for insurance)
    // For simplicity, skip insurance and go directly to player turns
    this.state.phase = "player_turn";
    this.state.currentPlayerIndex = 0;

    // Skip players who already have blackjack
    this.advanceToNextActivePlayer();
  }

  /**
   * Player hits (takes another card)
   */
  hit(oderId: string, handIndex: number = 0): boolean {
    if (this.state.phase !== "player_turn") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (!this.isPlayerTurn(oderId)) return false;

    const hand = player.hands[handIndex];
    if (!hand || hand.isStand || hand.isBust) return false;

    // Deal one card
    const newCard = this.deck.deal();
    if (newCard) {
      hand.cards.push(newCard);
    }

    // Check for bust
    const value = this.calculateHandValue(hand.cards);
    if (value > 21) {
      hand.isBust = true;
      hand.result = "bust";
    }

    this.state.deck = this.deck.serialize().cards;

    // If bust or 21, move to next hand/player
    if (hand.isBust || value === 21) {
      hand.isStand = true;
      this.advanceToNextActivePlayer();
    }

    return true;
  }

  /**
   * Player stands (stops taking cards)
   */
  stand(oderId: string, handIndex: number = 0): boolean {
    if (this.state.phase !== "player_turn") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (!this.isPlayerTurn(oderId)) return false;

    const hand = player.hands[handIndex];
    if (!hand || hand.isStand) return false;

    hand.isStand = true;
    this.advanceToNextActivePlayer();

    return true;
  }

  /**
   * Player doubles down (double bet, take one card, then stand)
   */
  double(oderId: string, handIndex: number = 0): boolean {
    if (this.state.phase !== "player_turn") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (!this.isPlayerTurn(oderId)) return false;

    const hand = player.hands[handIndex];
    if (!hand || hand.isStand || hand.cards.length !== 2) return false;

    // Double the bet
    player.totalBet += hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;

    // Take one card
    const newCard = this.deck.deal();
    if (newCard) {
      hand.cards.push(newCard);
    }

    // Check for bust
    const value = this.calculateHandValue(hand.cards);
    if (value > 21) {
      hand.isBust = true;
      hand.result = "bust";
    }

    hand.isStand = true;
    this.state.deck = this.deck.serialize().cards;
    this.advanceToNextActivePlayer();

    return true;
  }

  /**
   * Player splits (if two cards of same rank)
   */
  split(oderId: string, handIndex: number = 0): boolean {
    if (this.state.phase !== "player_turn") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (!this.isPlayerTurn(oderId)) return false;

    const hand = player.hands[handIndex];
    if (!hand || hand.cards.length !== 2) return false;

    // Check if cards have same rank
    if (hand.cards[0].rank !== hand.cards[1].rank) return false;

    // Create two new hands
    const newHand1: BlackjackHand = {
      cards: [hand.cards[0]],
      bet: hand.bet,
      isDoubled: false,
      isSplit: true,
      isStand: false,
      isBust: false,
      isBlackjack: false,
      payout: 0,
    };

    const newHand2: BlackjackHand = {
      cards: [hand.cards[1]],
      bet: hand.bet,
      isDoubled: false,
      isSplit: true,
      isStand: false,
      isBust: false,
      isBlackjack: false,
      payout: 0,
    };

    // Deal one card to each new hand
    const card1 = this.deck.deal();
    const card2 = this.deck.deal();
    if (card1) newHand1.cards.push(card1);
    if (card2) newHand2.cards.push(card2);

    // Replace original hand with two new hands
    player.hands.splice(handIndex, 1, newHand1, newHand2);
    player.totalBet += hand.bet; // Additional bet for split

    this.state.deck = this.deck.serialize().cards;

    return true;
  }

  /**
   * Player surrenders (lose half bet)
   */
  surrender(oderId: string): boolean {
    if (this.state.phase !== "player_turn") return false;

    const player = this.getPlayer(oderId);
    if (!player) return false;
    if (!this.isPlayerTurn(oderId)) return false;

    const hand = player.hands[0];
    if (!hand || hand.cards.length !== 2 || player.hands.length > 1)
      return false;

    player.hasSurrendered = true;
    hand.result = "surrender";
    hand.payout = -hand.bet / 2;
    hand.isStand = true;

    this.advanceToNextActivePlayer();

    return true;
  }

  /**
   * Advance to next active player or dealer's turn
   */
  private advanceToNextActivePlayer(): void {
    // Check if current player has more hands to play
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer) {
      for (let i = 0; i < currentPlayer.hands.length; i++) {
        if (!currentPlayer.hands[i].isStand && !currentPlayer.hands[i].isBust) {
          currentPlayer.currentHandIndex = i;
          return;
        }
      }
    }

    // Move to next player
    for (
      let i = this.state.currentPlayerIndex + 1;
      i < this.state.players.length;
      i++
    ) {
      const player = this.state.players[i];
      const hasActiveHand = player.hands.some(
        (h) => !h.isStand && !h.isBust && !h.isBlackjack
      );
      if (hasActiveHand) {
        this.state.currentPlayerIndex = i;
        player.currentHandIndex = player.hands.findIndex(
          (h) => !h.isStand && !h.isBust
        );
        return;
      }
    }

    // All players done, dealer's turn
    this.dealerTurn();
  }

  /**
   * Dealer plays (hit until 17 or higher)
   */
  private dealerTurn(): void {
    this.state.phase = "dealer_turn";
    this.state.dealer.isHoleCardRevealed = true;

    // Check if any player hasn't busted or surrendered
    const hasActivePlayers = this.state.players.some((p) =>
      p.hands.some((h) => !h.isBust && h.result !== "surrender")
    );

    if (hasActivePlayers) {
      // Dealer hits until 17 or higher
      while (this.calculateHandValue(this.state.dealer.hand) < 17) {
        const card = this.deck.deal();
        if (card) {
          this.state.dealer.hand.push(card);
        }
      }
    }

    this.state.deck = this.deck.serialize().cards;
    this.settle();
  }

  /**
   * Settle all bets
   */
  private settle(): void {
    this.state.phase = "settling";

    const dealerValue = this.calculateHandValue(this.state.dealer.hand);
    const dealerBust = dealerValue > 21;
    const dealerBlackjack =
      this.state.dealer.hand.length === 2 && dealerValue === 21;

    this.state.players.forEach((player) => {
      player.hands.forEach((hand) => {
        if (hand.result) return; // Already has result (bust, surrender)

        const playerValue = this.calculateHandValue(hand.cards);

        // Blackjack beats regular 21
        if (hand.isBlackjack && !dealerBlackjack) {
          hand.result = "blackjack";
          hand.payout = hand.bet * 1.5; // 3:2 payout
        } else if (hand.isBlackjack && dealerBlackjack) {
          hand.result = "push";
          hand.payout = 0;
        } else if (dealerBlackjack) {
          hand.result = "lose";
          hand.payout = -hand.bet;
        } else if (dealerBust) {
          hand.result = "win";
          hand.payout = hand.bet;
        } else if (playerValue > dealerValue) {
          hand.result = "win";
          hand.payout = hand.bet;
        } else if (playerValue < dealerValue) {
          hand.result = "lose";
          hand.payout = -hand.bet;
        } else {
          hand.result = "push";
          hand.payout = 0;
        }

        player.totalPayout += hand.payout;
      });
    });
  }

  /**
   * End the round
   */
  endRound(): void {
    this.state.phase = "finished";
  }

  /**
   * Calculate hand value (A = 1 or 11)
   */
  calculateHandValue(cards: Card[]): number {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      const rank = card.rank;
      if (rank === 1) {
        // Ace
        aces++;
        value += 11;
      } else if (rank >= 10) {
        // 10, J, Q, K
        value += 10;
      } else {
        value += rank;
      }
    }

    // Convert aces from 11 to 1 if over 21
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
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
  private getPlayer(oderId: string): BlackjackPlayer | undefined {
    return this.state.players.find((p) => p.oderId === oderId);
  }

  /**
   * Serialize game state for P2P
   */
  serialize(): BlackjackGameState {
    return {
      ...this.state,
      deck: this.deck.serialize().cards,
    };
  }

  /**
   * Deserialize game state from P2P
   */
  static deserialize(data: BlackjackGameState): BlackjackGame {
    const game = new BlackjackGame();
    game.setState(data);
    return game;
  }

  /**
   * Get result description in Thai
   */
  static getResultDescription(result: BlackjackHandResult): string {
    const descriptions: Record<BlackjackHandResult, string> = {
      blackjack: "แบล็คแจ็ค!",
      win: "ชนะ",
      lose: "แพ้",
      push: "เสมอ",
      bust: "บัสต์ (เกิน 21)",
      surrender: "ยอมแพ้",
    };
    return descriptions[result] || result;
  }
}
