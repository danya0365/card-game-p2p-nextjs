/**
 * Kang (ไพ่แคง) Game Types
 * Thai card game where players form sets and pairs
 */

import type { Card } from "./card.types";

/**
 * Kang hand types ranked from highest to lowest
 */
export type KangHandType =
  | "kang" // แคง - ตอง + คู่ (3 of a kind + pair) - Full House
  | "tong" // ตอง - 3 ใบเหมือน (3 of a kind)
  | "straight_flush" // สเตรทฟลัช - เรียง + ดอกเดียว
  | "straight" // เรียง - 5 ใบเรียงกัน
  | "flush" // สี - 5 ใบดอกเดียว
  | "two_pair" // สองคู่ - 2 pairs
  | "pair" // คู่ - 2 ใบเหมือน
  | "high_card"; // ไฮการ์ด - ไพ่สูง

/**
 * Kang hand evaluation result
 */
export interface KangHand {
  cards: Card[];
  handType: KangHandType;
  rank: number; // Ranking value for comparison
  highCard: number; // Highest card value for tie-breaker
  description: string; // Thai description
}

/**
 * Kang game phases
 */
export type KangPhase =
  | "waiting" // รอผู้เล่น
  | "betting" // วางเดิมพัน
  | "dealing" // แจกไพ่
  | "discarding" // ทิ้งไพ่ / เลือกไพ่ที่จะเปลี่ยน
  | "drawing" // จั่วไพ่ใหม่
  | "showdown" // เปิดไพ่
  | "settling" // สรุปผล
  | "finished"; // จบรอบ

/**
 * Kang player state
 */
export interface KangPlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  hand: Card[];
  discardedCards: Card[]; // Cards player chose to discard
  bet: number;
  payout: number;
  isDealer: boolean;
  isFolded: boolean;
  hasDiscarded: boolean; // Has player finished discarding
  result?: KangHand;
}

/**
 * Kang game state
 */
export interface KangGameState {
  phase: KangPhase;
  players: KangPlayer[];
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  minBet: number;
  maxBet: number;
  roundNumber: number;
  deck?: Card[];
}

/**
 * Kang game actions
 */
export type KangActionType =
  | "place_bet"
  | "discard" // เลือกไพ่ที่จะทิ้ง
  | "keep_all" // เก็บไพ่ทั้งหมด (ไม่เปลี่ยน)
  | "fold";

/**
 * Kang action payload
 */
export interface KangAction {
  type: KangActionType;
  oderId: string;
  amount?: number; // For betting
  cardIndices?: number[]; // Indices of cards to discard (0-4)
}
