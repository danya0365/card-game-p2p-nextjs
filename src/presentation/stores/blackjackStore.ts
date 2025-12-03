import { BlackjackGame } from "@/src/domain/game/BlackjackGame";
import type {
  BlackjackActionPayload,
  BlackjackGameState,
  BlackjackPlayer,
} from "@/src/domain/types/blackjack.types";
import { create } from "zustand";
import { createP2PMessage, usePeerStore } from "./peerStore";
import { useRoomStore } from "./roomStore";
import { useUserStore } from "./userStore";

/**
 * Helper function to log phase changes with detailed info
 */
function _logPhaseChange(
  state: BlackjackGameState,
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void
): void {
  const dealerValue = new BlackjackGame().calculateHandValue.call(
    { calculateHandValue: BlackjackGame.prototype.calculateHandValue },
    state.dealer.hand
  );

  switch (state.phase) {
    case "dealing":
      addLog("system", "🃏 แจกไพ่ 2 ใบให้ทุกคน", undefined, "🃏");
      break;

    case "player_turn":
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer) {
        addLog("system", `ตา ${currentPlayer.displayName}`, undefined, "👤");
      }
      break;

    case "dealer_turn":
      addLog("system", "👑 ตาเจ้ามือ", undefined, "👑");
      break;

    case "settling":
      addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
      addLog("system", "🏆 สรุปผลรอบที่ " + state.roundNumber, undefined, "🏆");

      // Dealer result
      const dealerBust = dealerValue > 21;
      addLog(
        "system",
        `เจ้ามือ: ${dealerValue} แต้ม${dealerBust ? " (บัสต์!)" : ""}`,
        undefined,
        "👑"
      );

      // Player results
      state.players.forEach((p) => {
        p.hands.forEach((hand, idx) => {
          const handLabel = p.hands.length > 1 ? ` (มือ ${idx + 1})` : "";
          const result = BlackjackGame.getResultDescription(
            hand.result || "lose"
          );
          const payout = hand.payout;

          if (payout > 0) {
            addLog(
              "result",
              `${result}${handLabel} +${payout}`,
              p.displayName,
              "✅"
            );
          } else if (payout < 0) {
            addLog(
              "result",
              `${result}${handLabel} ${payout}`,
              p.displayName,
              "❌"
            );
          } else {
            addLog("result", `${result}${handLabel}`, p.displayName, "⚖️");
          }
        });
      });
      addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
      break;

    case "finished":
      addLog("system", "🎊 จบเกม!", undefined, "🎊");
      break;
  }
}

/**
 * Game log entry
 */
export interface GameLogEntry {
  id: string;
  timestamp: number;
  type: "system" | "action" | "result";
  message: string;
  playerName?: string;
  icon?: string;
}

/**
 * Blackjack game store interface
 */
interface BlackjackStore {
  game: BlackjackGame | null;
  gameState: BlackjackGameState | null;
  selectedBet: number;
  error: string | null;
  actionLogs: GameLogEntry[];

  // Actions
  initGame: () => void;
  syncState: (state: BlackjackGameState, logs?: GameLogEntry[]) => void;
  startRound: () => void;
  placeBet: (amount: number) => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  split: () => void;
  surrender: () => void;
  nextRound: () => void;
  setSelectedBet: (amount: number) => void;
  getCurrentPlayer: () => BlackjackPlayer | null;
  getMyPlayer: () => BlackjackPlayer | null;
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void;

  // Internal
  _handleGameAction: (
    action: BlackjackActionPayload,
    playerName: string
  ) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

export const useBlackjackStore = create<BlackjackStore>((set, get) => ({
  game: null,
  gameState: null,
  selectedBet: 10,
  error: null,
  actionLogs: [],

  // Add log entry
  addLog: (type, message, playerName, icon) => {
    const newLog: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      playerName,
      icon,
    };
    set((state) => ({
      actionLogs: [...state.actionLogs, newLog].slice(-50),
    }));
  },

  // Initialize game
  initGame: () => {
    const roomStore = useRoomStore.getState();
    const room = roomStore.room;

    if (!room) return;

    const game = new BlackjackGame();

    // Add all players from room
    room.players.forEach((player) => {
      game.addPlayer({
        oderId: player.peerId,
        odeName: player.peerId,
        displayName: player.displayName,
        avatar: player.avatar,
      });
    });

    set({
      game,
      gameState: game.getState(),
      error: null,
    });

    // If host, broadcast initial state
    if (roomStore.isHost) {
      get()._broadcastGameState();
    }
  },

  // Sync state from host
  syncState: (state: BlackjackGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new BlackjackGame();
    game.setState(state);
    if (logs) {
      set({ game, gameState: state, actionLogs: logs });
    } else {
      set({ game, gameState: state });
    }
  },

  // Start a new round (host only)
  startRound: () => {
    const { game, addLog, gameState } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    // End previous round if in settling
    if (gameState?.phase === "settling") {
      game.endRound();
    }

    game.startRound();
    const newState = game.getState();
    set({ gameState: newState });

    addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
    addLog("system", `🎮 เริ่มรอบที่ ${newState.roundNumber}`, undefined, "🎮");
    addLog(
      "system",
      `👥 ผู้เล่น ${newState.players.length} คน`,
      undefined,
      "👥"
    );
    addLog("system", "💰 รอผู้เล่นเดิมพัน...", undefined, "💰");

    get()._broadcastGameState();
  },

  // Place bet
  placeBet: (amount: number) => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "betting") return;

    const action: BlackjackActionPayload = {
      type: "place_bet",
      oderId: peerStore.peerId,
      amount,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.placeBet(peerStore.peerId, amount);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", `เดิมพัน ${amount}`, playerName, "💰");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Hit
  hit: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "player_turn") return;

    const action: BlackjackActionPayload = {
      type: "hit",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.hit(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "จั่วไพ่", playerName, "🃏");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Stand
  stand: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "player_turn") return;

    const action: BlackjackActionPayload = {
      type: "stand",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.stand(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "หยุด", playerName, "✋");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Double
  double: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "player_turn") return;

    const action: BlackjackActionPayload = {
      type: "double",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.double(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "ดับเบิ้ล!", playerName, "💎");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Split
  split: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "player_turn") return;

    const action: BlackjackActionPayload = {
      type: "split",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.split(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "แยกไพ่!", playerName, "✂️");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Surrender
  surrender: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "player_turn") return;

    const action: BlackjackActionPayload = {
      type: "surrender",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.surrender(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "ยอมแพ้", playerName, "🏳️");
        get()._broadcastGameState();
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Next round
  nextRound: () => {
    const { game } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    game.endRound();
    set({ gameState: game.getState() });
    get()._broadcastGameState();
  },

  // Set selected bet
  setSelectedBet: (amount: number) => {
    set({ selectedBet: amount });
  },

  // Get current player
  getCurrentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  },

  // Get my player
  getMyPlayer: () => {
    const { gameState } = get();
    const peerStore = usePeerStore.getState();

    if (!gameState || !peerStore.peerId) return null;
    return gameState.players.find((p) => p.oderId === peerStore.peerId) || null;
  },

  // Handle game action from peers (host only)
  _handleGameAction: (action: BlackjackActionPayload, playerName: string) => {
    const { game, gameState, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !roomStore.isHost) return;

    let success = false;
    let logMessage = "";
    let logIcon = "";

    switch (action.type) {
      case "place_bet":
        success = game.placeBet(action.oderId, action.amount || 0);
        logMessage = `เดิมพัน ${action.amount}`;
        logIcon = "💰";
        break;
      case "hit":
        success = game.hit(action.oderId);
        logMessage = "จั่วไพ่";
        logIcon = "🃏";
        break;
      case "stand":
        success = game.stand(action.oderId);
        logMessage = "หยุด";
        logIcon = "✋";
        break;
      case "double":
        success = game.double(action.oderId);
        logMessage = "ดับเบิ้ล!";
        logIcon = "💎";
        break;
      case "split":
        success = game.split(action.oderId);
        logMessage = "แยกไพ่!";
        logIcon = "✂️";
        break;
      case "surrender":
        success = game.surrender(action.oderId);
        logMessage = "ยอมแพ้";
        logIcon = "🏳️";
        break;
    }

    if (success) {
      const newState = game.getState();
      const prevPhase = gameState?.phase;
      set({ gameState: newState });
      addLog("action", logMessage, playerName, logIcon);

      // Add detailed phase change logs
      if (prevPhase !== newState.phase) {
        _logPhaseChange(newState, addLog);
      }

      get()._broadcastGameState();
    }
  },

  // Broadcast game state to all peers
  _broadcastGameState: () => {
    const { game, actionLogs } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost || !peerStore.peerId) return;

    const message = createP2PMessage(
      "game_state",
      {
        gameState: game.serialize(),
        actionLogs: actionLogs,
      },
      peerStore.peerId,
      useUserStore.getState().user?.displayName || "Host"
    );

    peerStore.broadcast(message);
  },

  // Reset store
  _reset: () => {
    set({
      game: null,
      gameState: null,
      selectedBet: 10,
      error: null,
      actionLogs: [],
    });
  },
}));
