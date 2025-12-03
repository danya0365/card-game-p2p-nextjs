import { DummyGame } from "@/src/domain/game/DummyGame";
import type { Card } from "@/src/domain/types/card.types";
import type {
  DummyActionPayload,
  DummyGameState,
  DummyPlayer,
} from "@/src/domain/types/dummy.types";
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
 * Dummy game store interface
 */
interface DummyStore {
  game: DummyGame | null;
  gameState: DummyGameState | null;
  selectedCards: Card[];
  selectedMeldId: string | null;
  error: string | null;
  actionLogs: GameLogEntry[];

  // Actions
  initGame: () => void;
  syncState: (state: DummyGameState, logs?: GameLogEntry[]) => void;
  startGame: () => void;
  drawFromDeck: () => void;
  drawFromDiscard: () => void;
  discard: (card: Card) => void;
  meld: () => void;
  layOff: (card: Card) => void;
  knock: () => void;
  nextGame: () => void;
  selectCard: (card: Card) => void;
  deselectCard: (card: Card) => void;
  clearSelection: () => void;
  selectMeld: (meldId: string | null) => void;
  getCurrentPlayer: () => DummyPlayer | null;
  getMyPlayer: () => DummyPlayer | null;
  addLog: (
    type: "system" | "action" | "result",
    message: string,
    playerName?: string,
    icon?: string
  ) => void;

  // Internal
  _handleGameAction: (action: DummyActionPayload, playerName: string) => void;
  _broadcastGameState: () => void;
  _reset: () => void;
}

export const useDummyStore = create<DummyStore>((set, get) => ({
  game: null,
  gameState: null,
  selectedCards: [],
  selectedMeldId: null,
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

    const game = new DummyGame();

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
      selectedMeldId: null,
      error: null,
    });

    // If host, broadcast initial state
    if (roomStore.isHost) {
      get()._broadcastGameState();
    }
  },

  // Sync state from host
  syncState: (state: DummyGameState, logs?: GameLogEntry[]) => {
    const game = get().game || new DummyGame();
    game.setState(state);
    if (logs) {
      set({
        game,
        gameState: state,
        actionLogs: logs,
        selectedCards: [],
        selectedMeldId: null,
      });
    } else {
      set({ game, gameState: state, selectedCards: [], selectedMeldId: null });
    }
  },

  // Start a new game (host only)
  startGame: () => {
    const { game, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !roomStore.isHost) return;

    game.startGame();
    const newState = game.getState();
    set({ gameState: newState, selectedCards: [], selectedMeldId: null });

    addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
    addLog("system", `🎮 เริ่มเกมที่ ${newState.gameNumber}`, undefined, "🎮");
    addLog(
      "system",
      `👥 ผู้เล่น ${newState.players.length} คน`,
      undefined,
      "👥"
    );
    addLog("system", "จั่ว ทิ้ง วางชุด ลดแต้ม!", undefined, "🃏");

    get()._broadcastGameState();
  },

  // Draw from deck
  drawFromDeck: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: DummyActionPayload = {
      type: "draw_deck",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const card = game.drawFromDeck(peerStore.peerId);
      if (card) {
        set({ gameState: game.getState() });
        get().addLog("action", "จั่วไพ่จากกอง", playerName, "📤");
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

  // Draw from discard pile
  drawFromDiscard: () => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: DummyActionPayload = {
      type: "draw_discard",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const card = game.drawFromDiscard(peerStore.peerId);
      if (card) {
        set({ gameState: game.getState() });
        const cardText = `${
          card.rank === 1
            ? "A"
            : card.rank === 11
            ? "J"
            : card.rank === 12
            ? "Q"
            : card.rank === 13
            ? "K"
            : card.rank
        }`;
        get().addLog("action", `หยิบ ${cardText} จากกองทิ้ง`, playerName, "📥");
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

  // Discard a card
  discard: (card: Card) => {
    const { game, gameState } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: DummyActionPayload = {
      type: "discard",
      oderId: peerStore.peerId,
      card,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.discard(peerStore.peerId, card);
      if (success) {
        set({ gameState: game.getState(), selectedCards: [] });
        const cardText = `${
          card.rank === 1
            ? "A"
            : card.rank === 11
            ? "J"
            : card.rank === 12
            ? "Q"
            : card.rank === 13
            ? "K"
            : card.rank
        }`;
        get().addLog("action", `ทิ้ง ${cardText}`, playerName, "🃏");
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
      set({ selectedCards: [] });
    }
  },

  // Meld cards
  meld: () => {
    const { game, gameState, selectedCards, addLog } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId || selectedCards.length < 3)
      return;

    const action: DummyActionPayload = {
      type: "meld",
      oderId: peerStore.peerId,
      cards: selectedCards,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const meld = game.meld(peerStore.peerId, selectedCards);
      if (meld) {
        set({ gameState: game.getState(), selectedCards: [] });
        addLog(
          "action",
          `วางชุด ${meld.type === "set" ? "ตอง" : "เรียง"} ${
            meld.cards.length
          } ใบ`,
          playerName,
          "✨"
        );

        // Check for win
        const newState = game.getState();
        if (newState.phase === "finished") {
          addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
          addLog("system", "🏆 ดัมมี่! ชนะทันที!", playerName, "🏆");
        }

        get()._broadcastGameState();
      } else {
        set({ error: "ไม่สามารถวางชุดนี้ได้" });
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

  // Lay off a card to existing meld
  layOff: (card: Card) => {
    const { game, gameState, selectedMeldId } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId || !selectedMeldId) return;

    const action: DummyActionPayload = {
      type: "lay_off",
      oderId: peerStore.peerId,
      card,
      meldId: selectedMeldId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.layOff(peerStore.peerId, card, selectedMeldId);
      if (success) {
        set({ gameState: game.getState(), selectedMeldId: null });
        const cardText = `${
          card.rank === 1
            ? "A"
            : card.rank === 11
            ? "J"
            : card.rank === 12
            ? "Q"
            : card.rank === 13
            ? "K"
            : card.rank
        }`;
        get().addLog("action", `ต่อ ${cardText}`, playerName, "➕");
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
      set({ selectedMeldId: null });
    }
  },

  // Knock
  knock: () => {
    const { game, gameState, addLog } = get();
    const peerStore = usePeerStore.getState();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !peerStore.peerId) return;

    const action: DummyActionPayload = {
      type: "knock",
      oderId: peerStore.peerId,
    };

    const playerName = useUserStore.getState().user?.displayName || "Player";

    if (roomStore.isHost) {
      const success = game.knock(peerStore.peerId);
      if (success) {
        const newState = game.getState();
        set({ gameState: newState });
        addLog("action", "เคาะ!", playerName, "🔔");

        // Show results
        addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
        addLog("system", "🏆 จบเกม!", undefined, "🏆");

        const winner = newState.players.find(
          (p) => p.oderId === newState.winnerId
        );
        if (winner) {
          addLog(
            "result",
            `ชนะด้วย ${winner.score} แต้ม`,
            winner.displayName,
            "👑"
          );
        }

        newState.players.forEach((p) => {
          if (p.oderId !== newState.winnerId) {
            addLog("result", `${p.score} แต้ม`, p.displayName, "");
          }
        });

        get()._broadcastGameState();
      } else {
        set({ error: "ไม่สามารถเคาะได้ (ต้องมีแต้มไม่เกิน 10)" });
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
    set({ selectedCards: [], selectedMeldId: null });
  },

  // Select meld
  selectMeld: (meldId: string | null) => {
    set({ selectedMeldId: meldId });
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
  _handleGameAction: (action: DummyActionPayload, playerName: string) => {
    const { game, gameState, addLog } = get();
    const roomStore = useRoomStore.getState();

    if (!game || !gameState || !roomStore.isHost) return;

    let success = false;

    switch (action.type) {
      case "draw_deck": {
        const card = game.drawFromDeck(action.oderId);
        if (card) {
          addLog("action", "จั่วไพ่จากกอง", playerName, "📤");
          success = true;
        }
        break;
      }
      case "draw_discard": {
        const card = game.drawFromDiscard(action.oderId);
        if (card) {
          const cardText = `${
            card.rank === 1
              ? "A"
              : card.rank === 11
              ? "J"
              : card.rank === 12
              ? "Q"
              : card.rank === 13
              ? "K"
              : card.rank
          }`;
          addLog("action", `หยิบ ${cardText} จากกองทิ้ง`, playerName, "📥");
          success = true;
        }
        break;
      }
      case "discard": {
        if (action.card) {
          success = game.discard(action.oderId, action.card);
          if (success) {
            const cardText = `${
              action.card.rank === 1
                ? "A"
                : action.card.rank === 11
                ? "J"
                : action.card.rank === 12
                ? "Q"
                : action.card.rank === 13
                ? "K"
                : action.card.rank
            }`;
            addLog("action", `ทิ้ง ${cardText}`, playerName, "🃏");
          }
        }
        break;
      }
      case "meld": {
        if (action.cards) {
          const meld = game.meld(action.oderId, action.cards);
          if (meld) {
            addLog(
              "action",
              `วางชุด ${meld.type === "set" ? "ตอง" : "เรียง"} ${
                meld.cards.length
              } ใบ`,
              playerName,
              "✨"
            );
            const newState = game.getState();
            if (newState.phase === "finished") {
              addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
              addLog("system", "🏆 ดัมมี่! ชนะทันที!", playerName, "🏆");
            }
            success = true;
          }
        }
        break;
      }
      case "lay_off": {
        if (action.card && action.meldId) {
          success = game.layOff(action.oderId, action.card, action.meldId);
          if (success) {
            const cardText = `${
              action.card.rank === 1
                ? "A"
                : action.card.rank === 11
                ? "J"
                : action.card.rank === 12
                ? "Q"
                : action.card.rank === 13
                ? "K"
                : action.card.rank
            }`;
            addLog("action", `ต่อ ${cardText}`, playerName, "➕");
          }
        }
        break;
      }
      case "knock": {
        success = game.knock(action.oderId);
        if (success) {
          addLog("action", "เคาะ!", playerName, "🔔");
          const newState = game.getState();
          addLog("system", "━━━━━━━━━━━━━━━━━━━━━━", undefined, "");
          addLog("system", "🏆 จบเกม!", undefined, "🏆");
          const winner = newState.players.find(
            (p) => p.oderId === newState.winnerId
          );
          if (winner) {
            addLog(
              "result",
              `ชนะด้วย ${winner.score} แต้ม`,
              winner.displayName,
              "👑"
            );
          }
          newState.players.forEach((p) => {
            if (p.oderId !== newState.winnerId) {
              addLog("result", `${p.score} แต้ม`, p.displayName, "");
            }
          });
        }
        break;
      }
    }

    if (success) {
      set({ gameState: game.getState() });
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
      selectedMeldId: null,
      error: null,
      actionLogs: [],
    });
  },
}));
