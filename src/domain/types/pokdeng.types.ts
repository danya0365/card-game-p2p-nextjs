/**
 * Pok Deng (ป๊อกเดง) Game Types
 */

import type { Card } from "./card.types";

/**
 * Pok Deng hand types (special combinations)
 */
export type PokDengHandType =
  | "pok8" // ป๊อกแปด - 8 points with 2 cards
  | "pok9" // ป๊อกเก้า - 9 points with 2 cards
  | "tong" // ตอง - Three of a kind
  | "straight_flush" // สเตรทฟลัช - 3 sequential same suit
  | "straight" // สเตรท - 3 sequential cards
  | "flush" // ฟลัช - 3 same suit
  | "pair" // ไพ่คู่ - Pair in 2 cards
  | "normal"; // ไพ่ธรรมดา - Normal hand

/**
 * Hand evaluation result
 */
export interface PokDengHand {
  cards: Card[];
  points: number; // 0-9 points
  handType: PokDengHandType;
  multiplier: number; // Payout multiplier (1-5)
  isPok: boolean; // Is Pok (8 or 9 with 2 cards)
}

/**
 * Player state in Pok Deng
 */
export interface PokDengPlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  hand: Card[];
  bet: number;
  result?: PokDengHand;
  payout: number; // Positive = win, negative = lose
  isDealer: boolean;
  isFolded: boolean;
  hasDrawn: boolean; // Has drawn 3rd card
}

/**
 * Game phases
 */
export type PokDengPhase =
  | "waiting" // Waiting for players
  | "betting" // Players place bets
  | "dealing" // Dealing cards
  | "playing" // Players decide to draw or stay
  | "revealing" // Revealing hands
  | "settling" // Calculating payouts
  | "finished"; // Round finished

/**
 * Pok Deng game state
 */
export interface PokDengGameState {
  phase: PokDengPhase;
  players: PokDengPlayer[];
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  minBet: number;
  maxBet: number;
  roundNumber: number;
  deck?: Card[]; // Only host has this
  lastAction?: string;
}

/**
 * Pok Deng action types
 */
export type PokDengActionType =
  | "place_bet" // Place bet
  | "draw" // Draw 3rd card
  | "stay" // Stay with 2 cards
  | "fold" // Fold (forfeit bet)
  | "reveal" // Reveal hand
  | "next_round"; // Start next round

/**
 * Pok Deng action payload
 */
export interface PokDengAction {
  type: PokDengActionType;
  oderId: string;
  amount?: number; // For bets
}

/**
 * Win/lose comparison result
 */
export interface CompareResult {
  winnerId: string;
  loserId: string;
  multiplier: number;
  reason: string;
}
