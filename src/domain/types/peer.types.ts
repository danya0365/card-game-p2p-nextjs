/**
 * P2P Message Types for PeerJS communication
 */

/**
 * Supported game types
 */
export type GameType =
  | "pokdeng"
  | "kang"
  | "blackjack"
  | "poker"
  | "dummy"
  | "slave";

/**
 * Player info sent over P2P
 */
export interface PeerPlayer {
  peerId: string;
  displayName: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
}

/**
 * Room configuration
 */
export interface RoomConfig {
  gameType: GameType;
  maxPlayers: number;
  minPlayers: number;
  roomName: string;
  isPrivate: boolean;
}

/**
 * Room state shared between peers
 */
export interface RoomState {
  roomId: string;
  hostPeerId: string;
  config: RoomConfig;
  players: PeerPlayer[];
  status: RoomStatus;
  createdAt: number;
}

/**
 * Room status
 */
export type RoomStatus = "waiting" | "starting" | "playing" | "finished";

/**
 * P2P Message types
 */
export type P2PMessageType =
  // Connection messages
  | "join_request"
  | "join_accepted"
  | "join_rejected"
  | "player_joined"
  | "player_left"
  | "player_kicked"
  // Room messages
  | "room_state"
  | "player_ready"
  | "player_not_ready"
  | "game_start"
  | "game_end"
  // Game messages
  | "game_action"
  | "game_state"
  // Chat messages
  | "chat_message"
  // System messages
  | "ping"
  | "pong"
  | "error";

/**
 * Base P2P message structure
 */
export interface P2PMessage<T = unknown> {
  type: P2PMessageType;
  senderId: string;
  senderName: string;
  timestamp: number;
  payload: T;
}

/**
 * Join request payload
 */
export interface JoinRequestPayload {
  player: PeerPlayer;
}

/**
 * Join accepted payload
 */
export interface JoinAcceptedPayload {
  roomState: RoomState;
}

/**
 * Join rejected payload
 */
export interface JoinRejectedPayload {
  reason: string;
}

/**
 * Player joined payload
 */
export interface PlayerJoinedPayload {
  player: PeerPlayer;
}

/**
 * Player left payload
 */
export interface PlayerLeftPayload {
  oderId: string;
  reason: "left" | "disconnected" | "kicked";
}

/**
 * Room state payload
 */
export interface RoomStatePayload {
  roomState: RoomState;
}

/**
 * Player ready payload
 */
export interface PlayerReadyPayload {
  oderId: string;
  isReady: boolean;
}

/**
 * Game action payload (generic for all games)
 */
export interface GameActionPayload<T = unknown> {
  actionType: string;
  data: T;
}

/**
 * Game state payload (generic for all games)
 */
export interface GameStatePayload<T = unknown> {
  gameState: T;
}

/**
 * Chat message payload
 */
export interface ChatMessagePayload {
  message: string;
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
}

/**
 * Game config per game type
 */
export const GAME_CONFIGS: Record<
  GameType,
  Omit<RoomConfig, "roomName" | "isPrivate">
> = {
  pokdeng: {
    gameType: "pokdeng",
    maxPlayers: 9,
    minPlayers: 2,
  },
  kang: {
    gameType: "kang",
    maxPlayers: 6,
    minPlayers: 2,
  },
  blackjack: {
    gameType: "blackjack",
    maxPlayers: 7,
    minPlayers: 1,
  },
  poker: {
    gameType: "poker",
    maxPlayers: 9,
    minPlayers: 2,
  },
  dummy: {
    gameType: "dummy",
    maxPlayers: 4,
    minPlayers: 2,
  },
  slave: {
    gameType: "slave",
    maxPlayers: 4,
    minPlayers: 2,
  },
};

/**
 * Game display names
 */
export const GAME_NAMES: Record<GameType, { th: string; en: string }> = {
  pokdeng: { th: "ป๊อกเดง", en: "Pok Deng" },
  kang: { th: "ไพ่แคง", en: "Kang" },
  blackjack: { th: "แบล็คแจ็ค", en: "Blackjack" },
  poker: { th: "โปกเกอร์", en: "Texas Hold'em" },
  dummy: { th: "ไทยดัมมี่", en: "Thai Dummy" },
  slave: { th: "ไพ่สลาฟ", en: "Slave" },
};
