/**
 * Slave (President/Asshole) Game Types
 * เกมไพ่สลาฟ - ทิ้งไพ่ให้หมดมือก่อนชนะ
 */

import type { Card } from "./card.types";

/**
 * Game phases
 */
export type SlavePhase =
  | "waiting" // รอผู้เล่น
  | "dealing" // แจกไพ่
  | "playing" // กำลังเล่น
  | "round_end" // จบรอบ (มีคนทิ้งไพ่หมด)
  | "finished"; // จบเกม

/**
 * Player action options
 */
export type SlaveAction =
  | "play" // ทิ้งไพ่
  | "pass"; // ผ่าน

/**
 * Player ranking/title
 */
export type SlaveRank =
  | "president" // ชนะที่ 1 (ประธานาธิบดี)
  | "vice_president" // ชนะที่ 2
  | "citizen" // กลาง
  | "vice_slave" // รอง Slave
  | "slave"; // แพ้ (ทาส)

/**
 * Play type (single, pair, triple, etc.)
 */
export type PlayType =
  | "single" // ไพ่เดี่ยว
  | "pair" // คู่
  | "triple" // ตอง
  | "quadruple" // 4 ใบ (bomb)
  | "straight"; // เรียง (3+ ใบ)

/**
 * Current play on table
 */
export interface CurrentPlay {
  cards: Card[];
  playType: PlayType;
  value: number; // Highest card value
  playerId: string;
}

/**
 * Slave player state
 */
export interface SlavePlayer {
  oderId: string;
  odeName: string;
  displayName: string;
  avatar: string;
  hand: Card[]; // ไพ่ในมือ
  rank?: SlaveRank; // ตำแหน่ง (หลังจบเกม)
  finishOrder: number; // ลำดับที่ทิ้งไพ่หมด (0 = ยังไม่หมด)
  passedThisRound: boolean;
  isOut: boolean; // ไพ่หมดแล้ว
}

/**
 * Slave game state
 */
export interface SlaveGameState {
  phase: SlavePhase;
  players: SlavePlayer[];
  currentPlay: CurrentPlay | null; // ไพ่บนโต๊ะ
  currentPlayerIndex: number;
  roundStarterIndex: number; // คนเริ่มรอบใหม่
  passCount: number; // จำนวนคนที่ Pass ติดต่อกัน
  gameNumber: number; // เกมที่เท่าไหร่
  finishCount: number; // จำนวนคนที่ทิ้งไพ่หมดแล้ว
  lastPlayerId: string | null; // คนสุดท้ายที่ทิ้งไพ่
  deck?: Card[];
}

/**
 * Slave action payload
 */
export interface SlaveActionPayload {
  type: SlaveAction | "start_game";
  oderId: string;
  cards?: Card[]; // สำหรับ play action
}

/**
 * Card value for Slave (2 is highest)
 * 3 = lowest, 2 = highest
 * Order: 3,4,5,6,7,8,9,10,J,Q,K,A,2
 */
export const SLAVE_CARD_VALUES: Record<number, number> = {
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9, // J
  12: 10, // Q
  13: 11, // K
  1: 12, // A
  2: 13, // 2 (highest)
};

/**
 * Rank names in Thai
 */
export const SLAVE_RANK_NAMES: Record<SlaveRank, string> = {
  president: "ประธานาธิบดี 👑",
  vice_president: "รองประธาน 🥈",
  citizen: "พลเมือง",
  vice_slave: "รองทาส",
  slave: "ทาส 😢",
};
