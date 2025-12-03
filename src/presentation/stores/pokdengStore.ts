import { PokDengGame } from "@/src/domain/game/PokDengGame";
import type {
  PokDengAction,
  PokDengGameState,
  PokDengPlayer,
} from "@/src/domain/types/pokdeng.types";
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
 * Pok Deng store state
 */
interface PokDengStoreState {
  game: PokDengGame | null;
  gameState: PokDengGameState | null;
  selectedBet: number;
  error: string | null;
  actionLogs: GameLogEntry[];
}

/**
 * Pok Deng store actions
 */
interface PokDengActions {
  // Game management
  initGame: () => void;
  syncState: (state: PokDengGameState, logs?: GameLogEntry[]) => void;

  // Actions
  startRound: () => void;
  placeBet: (amount: number) => void;
  drawCard: () => void;
  stay: () => void;
  fold: () => void;
  nextRound: () => void;

  // Bet selection
  setSelectedBet: (amount: number) => void;

  // State helpers
  getCurrentPlayer: () => PokDengPlayer | undefined;
  isMyTurn: () => boolean;
  amIDealer: () => boolean;

  // Log
  addLog: (
    type: GameLogEntry["type"],
    message: string,
    playerName?: string,
    icon?: string
  ) => void;
  clearLogs: () => void;

  // Internal
  _handleGameAction: (action: PokDengAction) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

type PokDengStore = PokDengStoreState & PokDengActions;

/**
 * Pok Deng game store
 */
export const usePokDengStore = create<PokDengStore>((set, get) => ({
  // Initial state
  game: null,
  gameState: null,
  selectedBet: 10,
  error: null,
  actionLogs: [],

  // Add log entry
  addLog: (type, message, playerName, icon) => {
    const entry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      playerName,
      icon,
    };
    set((state) => ({
      actionLogs: [...state.actionLogs, entry].slice(-50), // Keep last 50 logs
    }));
  },

  // Clear logs
  clearLogs: () => {
    set({ actionLogs: [] });
  },

  // Initialize game
  initGame: () => {
    const roomStore = useRoomStore.getState();
    const room = roomStore.room;

    if (!room) return;

    const game = new PokDengGame();

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
  syncState: (state: PokDengGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new PokDengGame();
    game.setState(state);
    // Sync logs from host if provided
    if (logs) {
      set({ game, gameState: state, actionLogs: logs });
    } else {
      set({ game, gameState: state });
    }
  },

  // Start a new round (host only)
  startRound: () => {
    const { game, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    game.startRound();
    const newState = game.getState();
    set({ gameState: newState });

    addLog("system", `🎮 เริ่มรอบที่ ${newState.roundNumber}`, undefined, "🎮");
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

    const action: PokDengAction = {
      type: "place_bet",
      oderId: peerStore.peerId,
      amount,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      // Host processes directly
      const success = game.placeBet(peerStore.peerId, amount);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", `เดิมพัน ${amount}`, playerName, "💰");
        get()._broadcastGameState();
      }
    } else {
      // Send to host
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        useUserStore.getState().user?.displayName || "Player"
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
    }
  },

  // Draw card
  drawCard: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "playing") return;

    const action: PokDengAction = {
      type: "draw",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.drawCard(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "จั่วไพ่ใบที่ 3", playerName, "🃏");
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

  // Stay
  stay: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "playing") return;

    const action: PokDengAction = {
      type: "stay",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.stay(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "พอ (ไม่จั่ว)", playerName, "✋");
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

  // Fold
  fold: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: PokDengAction = {
      type: "fold",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.fold(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState() });
        get().addLog("action", "หมอบ (เสียเดิมพัน)", playerName, "🚩");
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
    const peerId = usePeerStore.getState().peerId;

    if (!gameState || !peerId) return undefined;
    return gameState.players.find((p) => p.oderId === peerId);
  },

  // Check if it's my turn
  isMyTurn: () => {
    const { gameState } = get();
    const peerId = usePeerStore.getState().peerId;

    if (!gameState || !peerId) return false;
    if (gameState.phase !== "playing") return false;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer?.oderId === peerId;
  },

  // Check if I'm dealer
  amIDealer: () => {
    const { gameState } = get();
    const peerId = usePeerStore.getState().peerId;

    if (!gameState || !peerId) return false;
    const me = gameState.players.find((p) => p.oderId === peerId);
    return me?.isDealer ?? false;
  },

  // Handle game action from peers
  _handleGameAction: (action: PokDengAction) => {
    const { game, gameState, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    // Find player name
    const player = gameState?.players.find((p) => p.oderId === action.oderId);
    const playerName = player?.displayName || "Player";

    let success = false;
    let logMessage = "";
    let logIcon = "";

    switch (action.type) {
      case "place_bet":
        success = game.placeBet(action.oderId, action.amount || 0);
        logMessage = `เดิมพัน ${action.amount}`;
        logIcon = "💰";
        break;
      case "draw":
        success = game.drawCard(action.oderId);
        logMessage = "จั่วไพ่ใบที่ 3";
        logIcon = "🃏";
        break;
      case "stay":
        success = game.stay(action.oderId);
        logMessage = "พอ (ไม่จั่ว)";
        logIcon = "✋";
        break;
      case "fold":
        success = game.fold(action.oderId);
        logMessage = "หมอบ (เสียเดิมพัน)";
        logIcon = "🚩";
        break;
    }

    if (success) {
      const newState = game.getState();
      set({ gameState: newState });
      addLog("action", logMessage, playerName, logIcon);

      // Add phase change logs
      if (newState.phase === "dealing") {
        addLog("system", "🃏 กำลังแจกไพ่...", undefined, "🃏");
      } else if (newState.phase === "playing") {
        addLog("system", "🎮 เลือกจั่วหรือพอ...", undefined, "🎮");
      } else if (newState.phase === "revealing") {
        addLog("system", "👁️ เปิดไพ่!", undefined, "👁️");
      } else if (newState.phase === "settling") {
        addLog("system", "🏆 สรุปผลรอบ", undefined, "🏆");
        // Log results
        newState.players.forEach((p) => {
          if (p.payout !== 0) {
            const resultIcon = p.payout > 0 ? "✅" : "❌";
            const resultText =
              p.payout > 0 ? `ชนะ +${p.payout}` : `แพ้ ${p.payout}`;
            addLog("result", resultText, p.displayName, resultIcon);
          }
        });
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
        actionLogs: actionLogs, // Include logs in sync
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
