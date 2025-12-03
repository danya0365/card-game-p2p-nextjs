/**
 * Texas Hold'em Poker Game Types
 */

import type { Card } from "./card.types";

/**
 * Poker hand rankings (highest to lowest)
 */
export type PokerHandRank =
  | "royal_flush" // A K Q J 10 same suit
  | "straight_flush" // 5 consecutive same suit
  | "four_of_a_kind" // 4 same rank
  | "full_house" // 3 of a kind + pair
  | "flush" // 5 same suit
  | "straight" // 5 consecutive
  | "three_of_a_kind" // 3 same rank
  | "two_pair" // 2 pairs
  | "one_pair" // 1 pair
  | "high_card"; // highest card

/**
 * Poker game phases
 */
export type PokerPhase =
  | "waiting" // รอผู้เล่น
  | "preflop" // แจกไพ่ 2 ใบ betting round 1
  | "flop" // เปิดกลาง 3 ใบ betting round 2
  | "turn" // เปิดกลาง 1 ใบ betting round 3
  | "river" // เปิดกลางใบสุดท้าย betting round 4
  | "showdown" // เปิดไพ่
  | "settling" // สรุปผล
  | "finished"; // จบรอบ

/**
 * Player action options
 */
export type PokerAction =
  | "fold" // พับ
  | "check" // เช็ค (ไม่ลง)
  | "call" // ตาม
  | "raise" // เพิ่ม
  | "all_in"; // ลงทั้งหมด

/**
 * Player position at table
 */
export type PokerPosition =
  | "dealer" // D button
  | "small_blind" // SB
  | "big_blind" // BB
  | "utg" // Under the Gun
  | "middle" // Middle position
  | "cutoff" // CO
  | "button"; // Same as dealer

/**
 * Poker hand result
 */
export interface PokerHandResult {
  rank: PokerHandRank;
  rankValue: number; // Numeric value for comparison
  cards: Card[]; // Best 5 cards
  kickers: Card[]; // Kicker cards for tiebreaker
  description: string; // e.g., "Full House, Kings full of Aces"
}

/**
 * Poker player state
 */
export interface PokerPlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  holeCards: Card[]; // 2 private cards
  chips: number; // Current chip count
  currentBet: number; // Current bet this round
  totalBet: number; // Total bet this hand
  isFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean; // Has acted this betting round
  position?: PokerPosition;
  result?: PokerHandResult;
  winAmount: number;
}

/**
 * Side pot for all-in situations
 */
export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs who can win this pot
}

/**
 * Poker game state
 */
export interface PokerGameState {
  phase: PokerPhase;
  players: PokerPlayer[];
  communityCards: Card[]; // 0-5 cards on the table
  pot: number; // Main pot
  sidePots: SidePot[]; // Side pots from all-ins
  currentBet: number; // Current bet to call
  minRaise: number; // Minimum raise amount
  dealerIndex: number; // Position of dealer button
  currentPlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  roundNumber: number;
  lastRaiseAmount: number;
  deck?: Card[];
}

/**
 * Poker action payload
 */
export interface PokerActionPayload {
  type: PokerAction | "start_hand";
  oderId: string;
  amount?: number; // For raise/all-in
}

/**
 * Hand rank values for comparison
 */
export const HAND_RANK_VALUES: Record<PokerHandRank, number> = {
  royal_flush: 10,
  straight_flush: 9,
  four_of_a_kind: 8,
  full_house: 7,
  flush: 6,
  straight: 5,
  three_of_a_kind: 4,
  two_pair: 3,
  one_pair: 2,
  high_card: 1,
};

/**
 * Hand rank descriptions in Thai
 */
export const HAND_RANK_NAMES: Record<PokerHandRank, string> = {
  royal_flush: "รอยัลฟลัช",
  straight_flush: "สเตรทฟลัช",
  four_of_a_kind: "โฟร์ออฟอะไคนด์",
  full_house: "ฟูลเฮ้าส์",
  flush: "ฟลัช",
  straight: "สเตรท",
  three_of_a_kind: "ทรีออฟอะไคนด์",
  two_pair: "ทูแพร์",
  one_pair: "วันแพร์",
  high_card: "ไฮการ์ด",
};
