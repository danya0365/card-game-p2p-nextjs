import { KangGame } from "@/src/domain/game/KangGame";
import type {
  KangAction,
  KangGameState,
  KangPlayer,
} from "@/src/domain/types/kang.types";
import { create } from "zustand";
import { createP2PMessage, usePeerStore } from "./peerStore";
import { useRoomStore } from "./roomStore";
import { useUserStore } from "./userStore";

/**
 * Helper function to log phase changes with detailed info
 */
function _logPhaseChange(
  state: KangGameState,
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void
): void {
  const dealer = state.players.find((p) => p.isDealer);

  switch (state.phase) {
    case "dealing":
      addLog("system", "🃏 แจกไพ่ให้ผู้เล่นทุกคน คนละ 5 ใบ", undefined, "🃏");
      break;

    case "discarding":
      addLog(
        "system",
        "🔄 เลือกไพ่ที่ต้องการเปลี่ยน (สูงสุด 4 ใบ)",
        undefined,
        "🔄"
      );
      break;

    case "showdown":
      addLog("system", "👁️ เปิดไพ่ทุกคน!", undefined, "👁️");
      // Log each player's hand
      state.players.forEach((p) => {
        if (p.result && !p.isFolded) {
          if (p.isDealer) {
            addLog(
              "result",
              `${p.result.description}`,
              `👑 ${p.displayName}`,
              "🎴"
            );
          } else {
            addLog("result", `${p.result.description}`, p.displayName, "🎴");
          }
        }
      });
      break;

    case "settling":
      addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
      addLog("system", "🏆 สรุปผลรอบที่ " + state.roundNumber, undefined, "🏆");

      // Dealer result first
      if (dealer?.result) {
        addLog(
          "system",
          `เจ้ามือ: ${dealer.result.description}`,
          undefined,
          "👑"
        );
      }

      // Player results
      let totalDealerWin = 0;
      let totalDealerLose = 0;

      state.players.forEach((p) => {
        if (p.isDealer) return;

        if (p.isFolded) {
          addLog("result", `หมอบ เสีย ${p.bet}`, p.displayName, "🚩");
          totalDealerWin += p.bet;
        } else if (p.payout > 0) {
          const handType = p.result?.description || "";
          addLog(
            "result",
            `ชนะ! +${p.payout} (${handType})`,
            p.displayName,
            "✅"
          );
          totalDealerLose += p.payout;
        } else if (p.payout < 0) {
          addLog("result", `แพ้ ${p.payout}`, p.displayName, "❌");
          totalDealerWin += Math.abs(p.payout);
        } else {
          addLog("result", `เสมอ (ไม่เสียเงิน)`, p.displayName, "⚖️");
        }
      });

      // Summary
      const dealerNet = totalDealerWin - totalDealerLose;
      if (dealerNet > 0) {
        addLog("system", `เจ้ามือชนะรวม +${dealerNet}`, undefined, "💰");
      } else if (dealerNet < 0) {
        addLog("system", `เจ้ามือเสียรวม ${dealerNet}`, undefined, "💸");
      } else {
        addLog("system", `เจ้ามือเสมอ (ไม่ได้/เสีย)`, undefined, "⚖️");
      }
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
 * Kang game store interface
 */
interface KangStore {
  game: KangGame | null;
  gameState: KangGameState | null;
  selectedBet: number;
  selectedCards: number[]; // Indices of cards selected for discard
  error: string | null;
  actionLogs: GameLogEntry[];

  // Actions
  initGame: () => void;
  syncState: (state: KangGameState, logs?: GameLogEntry[]) => void;
  startRound: () => void;
  placeBet: (amount: number) => void;
  discardCards: () => void;
  keepAll: () => void;
  fold: () => void;
  nextRound: () => void;
  setSelectedBet: (amount: number) => void;
  toggleCardSelection: (index: number) => void;
  clearCardSelection: () => void;
  getCurrentPlayer: () => KangPlayer | null;
  getMyPlayer: () => KangPlayer | null;
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void;

  // Internal
  _handleGameAction: (action: KangAction, playerName: string) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

export const useKangStore = create<KangStore>((set, get) => ({
  game: null,
  gameState: null,
  selectedBet: 10,
  selectedCards: [],
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
      actionLogs: [...state.actionLogs, newLog].slice(-50), // Keep last 50 logs
    }));
  },

  // Initialize game
  initGame: () => {
    const roomStore = useRoomStore.getState();
    const room = roomStore.room;

    if (!room) return;

    const game = new KangGame();

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
  syncState: (state: KangGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new KangGame();
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
    const { game, addLog, gameState } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    // If coming from settling phase, end round first to rotate dealer
    if (gameState?.phase === "settling") {
      game.endRound();
    }

    game.startRound();
    const newState = game.getState();
    set({ gameState: newState, selectedCards: [] });

    const dealer = newState.players.find((p) => p.isDealer);
    const playerCount = newState.players.length;

    addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
    addLog("system", `🎮 เริ่มรอบที่ ${newState.roundNumber}`, undefined, "🎮");
    addLog("system", `👥 ผู้เล่น ${playerCount} คน`, undefined, "👥");
    if (dealer) {
      addLog("system", `👑 เจ้ามือ: ${dealer.displayName}`, undefined, "👑");
    }
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

    const action: KangAction = {
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

  // Discard selected cards
  discardCards: () => {
    const { game, gameState, selectedCards } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "discarding") return;

    const action: KangAction = {
      type: "discard",
      oderId: peerStore.peerId,
      cardIndices: selectedCards,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.discard(peerStore.peerId, selectedCards);
      if (success) {
        set({ gameState: game.getState(), selectedCards: [] });
        get().addLog(
          "action",
          `เปลี่ยนไพ่ ${selectedCards.length} ใบ`,
          playerName,
          "🔄"
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

  // Keep all cards
  keepAll: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;
    if (gameState.phase !== "discarding") return;

    const action: KangAction = {
      type: "keep_all",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.keepAll(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState(), selectedCards: [] });
        get().addLog("action", "เก็บไพ่ทั้งหมด", playerName, "✋");
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

    const action: KangAction = {
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

  // Toggle card selection for discard
  toggleCardSelection: (index: number) => {
    set((state) => {
      const selected = [...state.selectedCards];
      const idx = selected.indexOf(index);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else if (selected.length < 4) {
        selected.push(index);
      }
      return { selectedCards: selected };
    });
  },

  // Clear card selection
  clearCardSelection: () => {
    set({ selectedCards: [] });
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
  _handleGameAction: (action: KangAction, playerName: string) => {
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
      case "discard":
        success = game.discard(action.oderId, action.cardIndices || []);
        logMessage = `เปลี่ยนไพ่ ${action.cardIndices?.length || 0} ใบ`;
        logIcon = "🔄";
        break;
      case "keep_all":
        success = game.keepAll(action.oderId);
        logMessage = "เก็บไพ่ทั้งหมด";
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
      selectedCards: [],
      error: null,
      actionLogs: [],
    });
  },
}));
