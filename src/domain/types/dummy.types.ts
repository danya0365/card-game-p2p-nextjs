/**
 * Dummy (Rummy) Game Types
 * เกมดัมมี่ - จับคู่ไพ่เป็นชุด ลดแต้มในมือ
 */

import type { Card } from "./card.types";

/**
 * Game phases
 */
export type DummyPhase =
  | "waiting" // รอผู้เล่น
  | "dealing" // แจกไพ่
  | "playing" // กำลังเล่น
  | "knocked" // มีคนเคาะ
  | "finished"; // จบเกม

/**
 * Player action options
 */
export type DummyAction =
  | "draw_deck" // จั่วไพ่จากกอง
  | "draw_discard" // หยิบไพ่จากกองทิ้ง
  | "discard" // ทิ้งไพ่
  | "meld" // วางชุดไพ่
  | "lay_off" // ต่อไพ่กับชุดที่มีอยู่
  | "knock" // เคาะ (จบเกม)
  | "dummy"; // ดัมมี่ (ชนะทันที)

/**
 * Meld types (card combinations)
 */
export type MeldType =
  | "set" // 3-4 ใบหน้าเหมือนกัน (ตอง)
  | "run"; // 3+ ใบเรียงสีเดียว (เรียง)

/**
 * A meld (combination of cards)
 */
export interface Meld {
  id: string;
  type: MeldType;
  cards: Card[];
  ownerId: string; // Player who melded it
}

/**
 * Dummy player state
 */
export interface DummyPlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  hand: Card[]; // ไพ่ในมือ
  melds: Meld[]; // ชุดไพ่ที่วางแล้ว
  score: number; // คะแนนรวม (แต้มที่เหลือในมือ)
  isKnocker: boolean; // เป็นคนเคาะไหม
  hasDrawn: boolean; // จั่วไพ่แล้วหรือยัง (ต้องจั่วก่อนทิ้ง)
}

/**
 * Dummy game state
 */
export interface DummyGameState {
  phase: DummyPhase;
  players: DummyPlayer[];
  deck: Card[]; // ไพ่ในกอง
  discardPile: Card[]; // กองทิ้ง
  allMelds: Meld[]; // ชุดไพ่ทั้งหมดบนโต๊ะ
  currentPlayerIndex: number;
  gameNumber: number;
  knockerId: string | null; // ใครเคาะ
  winnerId: string | null;
}

/**
 * Dummy action payload
 */
export interface DummyActionPayload {
  type: DummyAction | "start_game";
  oderId: string;
  card?: Card; // สำหรับ discard
  cards?: Card[]; // สำหรับ meld
  meldId?: string; // สำหรับ lay_off
}

/**
 * Card point values for scoring
 * A = 1, 2-10 = face value, J/Q/K = 10
 */
export const DUMMY_CARD_POINTS: Record<number, number> = {
  1: 15, // A = 15 แต้ม
  2: 5,
  3: 5,
  4: 5,
  5: 5,
  6: 5,
  7: 5,
  8: 5,
  9: 5,
  10: 10,
  11: 10, // J
  12: 10, // Q
  13: 10, // K
};

/**
 * Special scoring
 */
export const DUMMY_SCORING = {
  DUMMY_BONUS: 50, // โบนัสถ้าดัมมี่ (วางหมดมือรอบแรก)
  KNOCK_BONUS: 10, // โบนัสถ้าเคาะและชนะ
  UNDERCUT_PENALTY: 10, // ถูกตัดหน้า
};
