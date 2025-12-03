/**
 * Blackjack (แบล็คแจ็ค) Game Types
 * Goal: Get as close to 21 as possible without going over
 */

import type { Card } from "./card.types";

/**
 * Blackjack hand result
 */
export type BlackjackHandResult =
  | "blackjack" // A + 10/J/Q/K = 21 (pays 3:2)
  | "win" // Beat dealer
  | "lose" // Dealer wins or bust
  | "push" // Tie with dealer
  | "bust" // Over 21
  | "surrender"; // Player surrendered (lose half bet)

/**
 * Blackjack game phases
 */
export type BlackjackPhase =
  | "waiting" // รอผู้เล่น
  | "betting" // วางเดิมพัน
  | "dealing" // แจกไพ่
  | "player_turn" // ตาผู้เล่น
  | "dealer_turn" // ตาเจ้ามือ
  | "settling" // สรุปผล
  | "finished"; // จบรอบ

/**
 * Player action options
 */
export type BlackjackAction =
  | "hit" // จั่วไพ่เพิ่ม
  | "stand" // หยุดจั่ว
  | "double" // ดับเบิ้ล (จั่ว 1 ใบ แล้วหยุด)
  | "split" // แยกไพ่ (ถ้าไพ่ 2 ใบเท่ากัน)
  | "surrender" // ยอมแพ้ (เสียครึ่งเดิมพัน)
  | "insurance"; // ประกัน (ถ้าเจ้ามือมี A)

/**
 * Blackjack hand (can have multiple hands from split)
 */
export interface BlackjackHand {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isStand: boolean;
  isBust: boolean;
  isBlackjack: boolean;
  result?: BlackjackHandResult;
  payout: number;
}

/**
 * Blackjack player state
 */
export interface BlackjackPlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  hands: BlackjackHand[]; // Can have multiple hands from split
  currentHandIndex: number; // Which hand is active
  totalBet: number;
  totalPayout: number;
  hasInsurance: boolean;
  insuranceBet: number;
  hasSurrendered: boolean;
}

/**
 * Dealer state
 */
export interface BlackjackDealer {
  hand: Card[];
  isHoleCardRevealed: boolean; // Second card hidden until dealer's turn
}

/**
 * Blackjack game state
 */
export interface BlackjackGameState {
  phase: BlackjackPhase;
  players: BlackjackPlayer[];
  dealer: BlackjackDealer;
  currentPlayerIndex: number;
  minBet: number;
  maxBet: number;
  roundNumber: number;
  deck?: Card[];
}

/**
 * Blackjack action payload
 */
export interface BlackjackActionPayload {
  type: "place_bet" | BlackjackAction;
  oderId: string;
  amount?: number; // For betting/insurance
  handIndex?: number; // For split hands
}
