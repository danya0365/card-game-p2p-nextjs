import { PokerGame } from "@/src/domain/game/PokerGame";
import type {
  PokerActionPayload,
  PokerGameState,
  PokerPlayer,
} from "@/src/domain/types/poker.types";
import { create } from "zustand";
import { createP2PMessage, usePeerStore } from "./peerStore";
import { useRoomStore } from "./roomStore";
import { useUserStore } from "./userStore";

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
 * Poker game store interface
 */
interface PokerStore {
  game: PokerGame | null;
  gameState: PokerGameState | null;
  raiseAmount: number;
  error: string | null;
  actionLogs: GameLogEntry[];

  // Actions
  initGame: () => void;
  syncState: (state: PokerGameState, logs?: GameLogEntry[]) => void;
  startHand: () => void;
  fold: () => void;
  check: () => void;
  call: () => void;
  raise: (amount: number) => void;
  allIn: () => void;
  nextHand: () => void;
  setRaiseAmount: (amount: number) => void;
  getCurrentPlayer: () => PokerPlayer | null;
  getMyPlayer: () => PokerPlayer | null;
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void;

  // Internal
  _handleGameAction: (action: PokerActionPayload, playerName: string) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

export const usePokerStore = create<PokerStore>((set, get) => ({
  game: null,
  gameState: null,
  raiseAmount: 10,
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

    const game = new PokerGame();

    // Add all players from room with starting chips
    room.players.forEach((player) => {
      game.addPlayer({
        oderId: player.peerId,
        odeName: player.peerId,
        displayName: player.displayName,
        avatar: player.avatar,
        chips: 1000, // Starting chips
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
  syncState: (state: PokerGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new PokerGame();
    game.setState(state);
    if (logs) {
      set({ game, gameState: state, actionLogs: logs });
    } else {
      set({ game, gameState: state });
    }
  },

  // Start a new hand (host only)
  startHand: () => {
    const { game, addLog, gameState } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    // End previous hand if in settling
    if (gameState?.phase === "settling") {
      game.endHand();
    }

    game.startHand();
    const newState = game.getState();
    set({ gameState: newState });

    addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
    addLog("system", `🃏 เริ่มมือที่ ${newState.roundNumber}`, undefined, "🃏");
    addLog(
      "system",
      `👥 ผู้เล่น ${newState.players.length} คน`,
      undefined,
      "👥"
    );
    addLog(
      "system",
      `💰 Blinds: ${newState.smallBlind}/${newState.bigBlind}`,
      undefined,
      "💰"
    );

    get()._broadcastGameState();
  },

  // Fold
  fold: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokerActionPayload = {
      type: "fold",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.fold(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "Fold", playerName, "🏳️");
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

  // Check
  check: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokerActionPayload = {
      type: "check",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.check(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "Check", playerName, "✔️");
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

  // Call
  call: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokerActionPayload = {
      type: "call",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";
    const myPlayer = gameState.players.find(
      (p) => p.oderId === peerStore.peerId
    );
    const callAmount = gameState.currentBet - (myPlayer?.currentBet || 0);

    if (roomStore.isHost) {
      const success = game.call(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", `Call ${callAmount}`, playerName, "📞");
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

  // Raise
  raise: (amount: number) => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokerActionPayload = {
      type: "raise",
      oderId: peerStore.peerId,
      amount,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.raise(peerStore.peerId, amount);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", `Raise ${amount}`, playerName, "⬆️");
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

  // All-in
  allIn: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokerActionPayload = {
      type: "all_in",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";
    const myPlayer = gameState.players.find(
      (p) => p.oderId === peerStore.peerId
    );

    if (roomStore.isHost) {
      const success = game.allIn(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog(
          "action",
          `ALL IN! ${myPlayer?.chips || 0}`,
          playerName,
          "🔥"
        );
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

  // Next hand
  nextHand: () => {
    const { game } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    game.endHand();
    set({ gameState: game.getState() });
    get()._broadcastGameState();
  },

  // Set raise amount
  setRaiseAmount: (amount: number) => {
    set({ raiseAmount: amount });
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
  _handleGameAction: (action: PokerActionPayload, playerName: string) => {
    const { game, gameState, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !roomStore.isHost) return;

    let success = false;
    let logMessage = "";
    let logIcon = "";

    const player = gameState.players.find((p) => p.oderId === action.oderId);
    const callAmount = gameState.currentBet - (player?.currentBet || 0);

    switch (action.type) {
      case "fold":
        success = game.fold(action.oderId);
        logMessage = "Fold";
        logIcon = "🏳️";
        break;
      case "check":
        success = game.check(action.oderId);
        logMessage = "Check";
        logIcon = "✔️";
        break;
      case "call":
        success = game.call(action.oderId);
        logMessage = `Call ${callAmount}`;
        logIcon = "📞";
        break;
      case "raise":
        success = game.raise(action.oderId, action.amount || 0);
        logMessage = `Raise ${action.amount}`;
        logIcon = "⬆️";
        break;
      case "all_in":
        success = game.allIn(action.oderId);
        logMessage = `ALL IN! ${player?.chips || 0}`;
        logIcon = "🔥";
        break;
    }

    if (success) {
      const newState = game.getState();
      set({ gameState: newState });
      addLog("action", logMessage, playerName, logIcon);

      // Add phase change logs
      if (gameState.phase !== newState.phase) {
        switch (newState.phase) {
          case "flop":
            addLog("system", "🃏 Flop", undefined, "🃏");
            break;
          case "turn":
            addLog("system", "🃏 Turn", undefined, "🃏");
            break;
          case "river":
            addLog("system", "🃏 River", undefined, "🃏");
            break;
          case "showdown":
            addLog("system", "👁️ Showdown!", undefined, "👁️");
            break;
          case "settling":
            addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
            addLog("system", "🏆 สรุปผล", undefined, "🏆");
            newState.players.forEach((p) => {
              if (p.winAmount > 0) {
                addLog("result", `ชนะ +${p.winAmount}`, p.displayName, "✅");
                if (p.result) {
                  addLog("result", p.result.description, p.displayName, "🃏");
                }
              }
            });
            break;
        }
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
      raiseAmount: 10,
      error: null,
      actionLogs: [],
    });
  },
}));
