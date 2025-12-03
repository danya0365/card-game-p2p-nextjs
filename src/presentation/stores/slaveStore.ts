import { SlaveGame } from "@/src/domain/game/SlaveGame";
import type { Card } from "@/src/domain/types/card.types";
import type {
  SlaveActionPayload,
  SlaveGameState,
  SlavePlayer,
} from "@/src/domain/types/slave.types";
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
 * Slave game store interface
 */
interface SlaveStore {
  game: SlaveGame | null;
  gameState: SlaveGameState | null;
  selectedCards: Card[];
  error: string | null;
  actionLogs: GameLogEntry[];

  // Actions
  initGame: () => void;
  syncState: (state: SlaveGameState, logs?: GameLogEntry[]) => void;
  startGame: () => void;
  playCards: () => void;
  pass: () => void;
  nextGame: () => void;
  selectCard: (card: Card) => void;
  deselectCard: (card: Card) => void;
  clearSelection: () => void;
  getCurrentPlayer: () => SlavePlayer | null;
  getMyPlayer: () => SlavePlayer | null;
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void;

  // Internal
  _handleGameAction: (action: SlaveActionPayload, playerName: string) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

export const useSlaveStore = create<SlaveStore>((set, get) => ({
  game: null,
  gameState: null,
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
      actionLogs: [...state.actionLogs, newLog].slice(-50),
    }));
  },

  // Initialize game
  initGame: () => {
    const roomStore = useRoomStore.getState();
    const room = roomStore.room;

    if (!room) return;

    const game = new SlaveGame();

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
      selectedCards: [],
      error: null,
    });

    // If host, broadcast initial state
    if (roomStore.isHost) {
      get()._broadcastGameState();
    }
  },

  // Sync state from host
  syncState: (state: SlaveGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new SlaveGame();
    game.setState(state);
    if (logs) {
      set({ game, gameState: state, actionLogs: logs, selectedCards: [] });
    } else {
      set({ game, gameState: state, selectedCards: [] });
    }
  },

  // Start a new game (host only)
  startGame: () => {
    const { game, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    game.startGame();
    const newState = game.getState();
    set({ gameState: newState, selectedCards: [] });

    addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
    addLog("system", `🎮 เริ่มเกมที่ ${newState.gameNumber}`, undefined, "🎮");
    addLog(
      "system",
      `👥 ผู้เล่น ${newState.players.length} คน`,
      undefined,
      "👥"
    );
    addLog("system", "ทิ้งไพ่ให้หมดมือก่อนชนะ!", undefined, "🃏");

    get()._broadcastGameState();
  },

  // Play cards
  playCards: () => {
    const { game, gameState, selectedCards } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId || selectedCards.length === 0)
      return;

    const action: SlaveActionPayload = {
      type: "play",
      oderId: peerStore.peerId,
      cards: selectedCards,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.playCards(peerStore.peerId, selectedCards);
      if (success) {
        set({ gameState: game.getState(), selectedCards: [] });

        const cardsText = selectedCards
          .map(
            (c) =>
              `${
                c.rank === 1
                  ? "A"
                  : c.rank === 11
                  ? "J"
                  : c.rank === 12
                  ? "Q"
                  : c.rank === 13
                  ? "K"
                  : c.rank
              }`
          )
          .join(", ");
        get().addLog("action", `ทิ้ง ${cardsText}`, playerName, "🃏");

        // Check for game end
        const newState = game.getState();
        if (newState.phase === "finished") {
          get().addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
          get().addLog("system", "🏆 จบเกม!", undefined, "🏆");
          newState.players
            .sort((a, b) => a.finishOrder - b.finishOrder)
            .forEach((p) => {
              if (p.rank) {
                get().addLog(
                  "result",
                  SlaveGame.getRankName(p.rank),
                  p.displayName,
                  ""
                );
              }
            });
        }

        get()._broadcastGameState();
      } else {
        set({ error: "ไม่สามารถทิ้งไพ่ชุดนี้ได้" });
      }
    } else {
      const message = createP2PMessage(
        "game_action",
        action,
        peerStore.peerId,
        playerName
      );
      peerStore.send(roomStore.room!.hostPeerId, message);
      set({ selectedCards: [] });
    }
  },

  // Pass
  pass: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: SlaveActionPayload = {
      type: "pass",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.pass(peerStore.peerId);
      if (success) {
        set({ gameState: game.getState(), selectedCards: [] });
        get().addLog("action", "ผ่าน", playerName, "⏭️");
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

  // Next game
  nextGame: () => {
    const roomStore = useRoomStore.getState();

    if (!roomStore.isHost) return;

    get().startGame();
  },

  // Select card
  selectCard: (card: Card) => {
    set((state) => ({
      selectedCards: [...state.selectedCards, card],
    }));
  },

  // Deselect card
  deselectCard: (card: Card) => {
    set((state) => ({
      selectedCards: state.selectedCards.filter(
        (c) => !(c.suit === card.suit && c.rank === card.rank)
      ),
    }));
  },

  // Clear selection
  clearSelection: () => {
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
  _handleGameAction: (action: SlaveActionPayload, playerName: string) => {
    const { game, gameState, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !roomStore.isHost) return;

    let success = false;

    switch (action.type) {
      case "play":
        if (action.cards) {
          success = game.playCards(action.oderId, action.cards);
          if (success) {
            const cardsText = action.cards
              .map(
                (c) =>
                  `${
                    c.rank === 1
                      ? "A"
                      : c.rank === 11
                      ? "J"
                      : c.rank === 12
                      ? "Q"
                      : c.rank === 13
                      ? "K"
                      : c.rank
                  }`
              )
              .join(", ");
            addLog("action", `ทิ้ง ${cardsText}`, playerName, "🃏");
          }
        }
        break;
      case "pass":
        success = game.pass(action.oderId);
        if (success) {
          addLog("action", "ผ่าน", playerName, "⏭️");
        }
        break;
    }

    if (success) {
      const newState = game.getState();
      set({ gameState: newState });

      // Check for game end
      if (newState.phase === "finished") {
        addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
        addLog("system", "🏆 จบเกม!", undefined, "🏆");
        newState.players
          .sort((a, b) => a.finishOrder - b.finishOrder)
          .forEach((p) => {
            if (p.rank) {
              addLog(
                "result",
                SlaveGame.getRankName(p.rank),
                p.displayName,
                ""
              );
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
      selectedCards: [],
      error: null,
      actionLogs: [],
    });
  },
}));
