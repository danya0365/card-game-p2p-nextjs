/**
 * Card Types for all card games
 */

/**
 * Card suits
 */
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

/**
 * Card ranks (A = 1, J = 11, Q = 12, K = 13)
 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/**
 * Playing card
 */
export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier
}

/**
 * Suit symbols for display
 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/**
 * Suit colors
 */
export const SUIT_COLORS: Record<Suit, "red" | "black"> = {
  hearts: "red",
  diamonds: "red",
  clubs: "black",
  spades: "black",
};

/**
 * Rank display values
 */
export const RANK_DISPLAY: Record<Rank, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

/**
 * All suits in order
 */
export const ALL_SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

/**
 * All ranks in order
 */
export const ALL_RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
