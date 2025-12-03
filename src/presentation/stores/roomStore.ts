import type {
  GameType,
  JoinAcceptedPayload,
  JoinRejectedPayload,
  JoinRequestPayload,
  P2PMessage,
  PeerPlayer,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerReadyPayload,
  RoomConfig,
  RoomState,
  RoomStatePayload,
  RoomStatus,
} from "@/src/domain/types/peer.types";
import { create } from "zustand";
import { createP2PMessage, usePeerStore } from "./peerStore";
import { useUserStore } from "./userStore";

/**
 * Room store state
 */
interface RoomStoreState {
  // Room state
  room: RoomState | null;
  isHost: boolean;
  isInRoom: boolean;
  isReady: boolean;

  // UI state
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
}

/**
 * Room store actions
 */
interface RoomActions {
  // Host actions
  createRoom: (gameType: GameType, roomName?: string) => Promise<string>;
  startGame: () => void;
  kickPlayer: (oderId: string) => void;

  // Guest actions
  joinRoom: (hostPeerId: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;

  // Internal
  _handleMessage: (message: P2PMessage, peerId: string) => void;
  _broadcastRoomState: () => void;
  _updatePlayer: (updates: Partial<PeerPlayer>) => void;
  _reset: () => void;
}

type RoomStore = RoomStoreState & RoomActions;

/**
 * Generate a short room ID
 */
function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get current user as PeerPlayer
 */
function getCurrentPlayer(isHost: boolean): PeerPlayer | null {
  const user = useUserStore.getState().user;
  const peerId = usePeerStore.getState().peerId;

  if (!user || !peerId) return null;

  return {
    peerId: peerId,
    displayName: user.displayName,
    avatar: user.avatar,
    isHost,
    isReady: isHost, // Host is always ready
    isConnected: true,
  };
}

/**
 * Game configurations
 */
const GAME_CONFIG_MAP: Record<
  GameType,
  Omit<RoomConfig, "roomName" | "isPrivate">
> = {
  pokdeng: { gameType: "pokdeng", maxPlayers: 9, minPlayers: 2 },
  kang: { gameType: "kang", maxPlayers: 6, minPlayers: 2 },
  blackjack: { gameType: "blackjack", maxPlayers: 7, minPlayers: 1 },
  poker: { gameType: "poker", maxPlayers: 9, minPlayers: 2 },
  dummy: { gameType: "dummy", maxPlayers: 4, minPlayers: 2 },
  slave: { gameType: "slave", maxPlayers: 4, minPlayers: 2 },
};

/**
 * Room store for managing game rooms
 */
export const useRoomStore = create<RoomStore>((set, get) => {
  let unsubscribeMessage: (() => void) | null = null;
  let unsubscribeConnection: (() => void) | null = null;

  return {
    // Initial state
    room: null,
    isHost: false,
    isInRoom: false,
    isReady: false,
    isCreating: false,
    isJoining: false,
    error: null,

    // Create a new room as host
    createRoom: async (gameType: GameType, roomName?: string) => {
      const peerStore = usePeerStore.getState();
      const user = useUserStore.getState().user;

      set({ isCreating: true, error: null });

      try {
        // Initialize peer if not already
        let peerId = peerStore.peerId;
        if (!peerId) {
          peerId = await peerStore.initialize();
        }

        const currentPlayer = getCurrentPlayer(true);
        if (!currentPlayer) {
          throw new Error("User not found");
        }

        const config = GAME_CONFIG_MAP[gameType];
        const roomId = generateRoomId();

        const room: RoomState = {
          roomId,
          hostPeerId: peerId,
          config: {
            ...config,
            roomName: roomName || `${user?.displayName}'s Room`,
            isPrivate: false,
          },
          players: [currentPlayer],
          status: "waiting",
          createdAt: Date.now(),
        };

        // Subscribe to messages
        unsubscribeMessage = peerStore.onMessage(get()._handleMessage);
        unsubscribeConnection = peerStore.onConnection(
          (connPeerId, connected) => {
            if (!connected) {
              // Player disconnected
              const state = get();
              if (state.room && state.isHost) {
                const updatedPlayers = state.room.players.map((p) =>
                  p.peerId === connPeerId ? { ...p, isConnected: false } : p
                );
                set({
                  room: { ...state.room, players: updatedPlayers },
                });
                get()._broadcastRoomState();
              }
            }
          }
        );

        set({
          room,
          isHost: true,
          isInRoom: true,
          isReady: true,
          isCreating: false,
        });

        return peerId; // Return host peer ID for sharing
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create room";
        set({ isCreating: false, error: errorMessage });
        throw error;
      }
    },

    // Join an existing room
    joinRoom: async (hostPeerId: string) => {
      const peerStore = usePeerStore.getState();

      set({ isJoining: true, error: null });

      try {
        // Initialize peer if not already
        let peerId = peerStore.peerId;
        if (!peerId) {
          peerId = await peerStore.initialize();
        }

        // Connect to host
        await peerStore.connect(hostPeerId);

        // Subscribe to messages
        unsubscribeMessage = peerStore.onMessage(get()._handleMessage);
        unsubscribeConnection = peerStore.onConnection(
          (connPeerId, connected) => {
            if (connPeerId === hostPeerId && !connected) {
              // Lost connection to host
              set({ error: "Lost connection to host" });
              get()._reset();
            }
          }
        );

        // Send join request
        const currentPlayer = getCurrentPlayer(false);
        if (!currentPlayer) {
          throw new Error("User not found");
        }

        const message = createP2PMessage<JoinRequestPayload>(
          "join_request",
          { player: currentPlayer },
          peerId,
          currentPlayer.displayName
        );

        peerStore.send(hostPeerId, message);

        // Wait for response (handled in _handleMessage)
        // Set joining state, actual room state will be set when accepted
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to join room";
        set({ isJoining: false, error: errorMessage });
        throw error;
      }
    },

    // Leave the current room
    leaveRoom: () => {
      const state = get();
      const peerStore = usePeerStore.getState();
      const peerId = peerStore.peerId;

      if (state.room && peerId) {
        if (state.isHost) {
          // Host leaving - notify all players
          const message = createP2PMessage<PlayerLeftPayload>(
            "player_left",
            { oderId: peerId, reason: "left" },
            peerId,
            state.room.players.find((p) => p.isHost)?.displayName || "Host"
          );
          peerStore.broadcast(message);
        } else {
          // Guest leaving - notify host
          const message = createP2PMessage<PlayerLeftPayload>(
            "player_left",
            { oderId: peerId, reason: "left" },
            peerId,
            state.room.players.find((p) => p.peerId === peerId)?.displayName ||
              "Player"
          );
          peerStore.send(state.room.hostPeerId, message);
        }
      }

      peerStore.disconnectAll();
      get()._reset();
    },

    // Set ready state
    setReady: (ready: boolean) => {
      const state = get();
      const peerStore = usePeerStore.getState();
      const peerId = peerStore.peerId;

      if (!state.room || !peerId) return;

      set({ isReady: ready });

      // Update local player
      get()._updatePlayer({ isReady: ready });

      // Notify others
      const message = createP2PMessage<PlayerReadyPayload>(
        ready ? "player_ready" : "player_not_ready",
        { oderId: peerId, isReady: ready },
        peerId,
        state.room.players.find((p) => p.peerId === peerId)?.displayName ||
          "Player"
      );

      if (state.isHost) {
        peerStore.broadcast(message);
      } else {
        peerStore.send(state.room.hostPeerId, message);
      }
    },

    // Start the game (host only)
    startGame: () => {
      const state = get();
      const peerStore = usePeerStore.getState();

      if (!state.isHost || !state.room) return;

      // Check if all players are ready
      const allReady = state.room.players.every((p) => p.isReady);
      const hasMinPlayers =
        state.room.players.length >= state.room.config.minPlayers;

      if (!allReady) {
        set({ error: "Not all players are ready" });
        return;
      }

      if (!hasMinPlayers) {
        set({ error: `Need at least ${state.room.config.minPlayers} players` });
        return;
      }

      // Update room status
      const updatedRoom = { ...state.room, status: "starting" as RoomStatus };
      set({ room: updatedRoom });

      // Broadcast game start
      const peerId = peerStore.peerId!;
      const message = createP2PMessage(
        "game_start",
        { roomState: updatedRoom },
        peerId,
        state.room.players.find((p) => p.isHost)?.displayName || "Host"
      );
      peerStore.broadcast(message);
    },

    // Kick a player (host only)
    kickPlayer: (targetPeerId: string) => {
      const state = get();
      const peerStore = usePeerStore.getState();

      if (!state.isHost || !state.room) return;

      // Remove player from room
      const updatedPlayers = state.room.players.filter(
        (p) => p.peerId !== targetPeerId
      );
      set({
        room: { ...state.room, players: updatedPlayers },
      });

      // Notify kicked player
      const message = createP2PMessage<PlayerLeftPayload>(
        "player_kicked",
        { oderId: targetPeerId, reason: "kicked" },
        peerStore.peerId!,
        state.room.players.find((p) => p.isHost)?.displayName || "Host"
      );
      peerStore.send(targetPeerId, message);

      // Disconnect from kicked player
      peerStore.disconnect(targetPeerId);

      // Broadcast updated room state
      get()._broadcastRoomState();
    },

    // Handle incoming P2P messages
    _handleMessage: (message: P2PMessage, peerId: string) => {
      const state = get();
      const peerStore = usePeerStore.getState();
      const myPeerId = peerStore.peerId;

      console.log(
        "[RoomStore] Received message:",
        message.type,
        "from:",
        peerId
      );

      switch (message.type) {
        case "join_request": {
          if (!state.isHost || !state.room) return;

          const payload = message.payload as JoinRequestPayload;

          // Check if room is full
          if (state.room.players.length >= state.room.config.maxPlayers) {
            const rejectMessage = createP2PMessage<JoinRejectedPayload>(
              "join_rejected",
              { reason: "Room is full" },
              myPeerId!,
              state.room.players.find((p) => p.isHost)?.displayName || "Host"
            );
            peerStore.send(peerId, rejectMessage);
            return;
          }

          // Check if game already started
          if (state.room.status !== "waiting") {
            const rejectMessage = createP2PMessage<JoinRejectedPayload>(
              "join_rejected",
              { reason: "Game already started" },
              myPeerId!,
              state.room.players.find((p) => p.isHost)?.displayName || "Host"
            );
            peerStore.send(peerId, rejectMessage);
            return;
          }

          // Add player to room
          const newPlayer: PeerPlayer = {
            ...payload.player,
            peerId: peerId,
            isHost: false,
            isReady: false,
            isConnected: true,
          };

          const updatedPlayers = [...state.room.players, newPlayer];
          const updatedRoom = { ...state.room, players: updatedPlayers };
          set({ room: updatedRoom });

          // Send acceptance to new player
          const acceptMessage = createP2PMessage<JoinAcceptedPayload>(
            "join_accepted",
            { roomState: updatedRoom },
            myPeerId!,
            state.room.players.find((p) => p.isHost)?.displayName || "Host"
          );
          peerStore.send(peerId, acceptMessage);

          // Broadcast new player to others
          const joinedMessage = createP2PMessage<PlayerJoinedPayload>(
            "player_joined",
            { player: newPlayer },
            myPeerId!,
            state.room.players.find((p) => p.isHost)?.displayName || "Host"
          );
          peerStore.broadcast(joinedMessage, peerId);
          break;
        }

        case "join_accepted": {
          const payload = message.payload as JoinAcceptedPayload;
          set({
            room: payload.roomState,
            isHost: false,
            isInRoom: true,
            isReady: false,
            isJoining: false,
          });
          break;
        }

        case "join_rejected": {
          const payload = message.payload as JoinRejectedPayload;
          set({
            isJoining: false,
            error: payload.reason,
          });
          peerStore.disconnect(peerId);
          break;
        }

        case "player_joined": {
          if (!state.room) return;
          const payload = message.payload as PlayerJoinedPayload;

          // Connect to new player if we're not the host
          if (!state.isHost) {
            peerStore.connect(payload.player.peerId).catch(console.error);
          }

          const updatedPlayers = [...state.room.players, payload.player];
          set({
            room: { ...state.room, players: updatedPlayers },
          });
          break;
        }

        case "player_left":
        case "player_kicked": {
          if (!state.room) return;
          const payload = message.payload as PlayerLeftPayload;

          if (payload.oderId === myPeerId) {
            // We were kicked
            set({ error: "You were kicked from the room" });
            get()._reset();
            return;
          }

          const updatedPlayers = state.room.players.filter(
            (p) => p.peerId !== payload.oderId
          );
          set({
            room: { ...state.room, players: updatedPlayers },
          });
          break;
        }

        case "room_state": {
          const payload = message.payload as RoomStatePayload;
          set({ room: payload.roomState });
          break;
        }

        case "player_ready":
        case "player_not_ready": {
          if (!state.room) return;
          const payload = message.payload as PlayerReadyPayload;

          const updatedPlayers = state.room.players.map((p) =>
            p.peerId === payload.oderId ? { ...p, isReady: payload.isReady } : p
          );

          set({
            room: { ...state.room, players: updatedPlayers },
          });

          // If host, broadcast to all
          if (state.isHost) {
            get()._broadcastRoomState();
          }
          break;
        }

        case "game_start": {
          const payload = message.payload as RoomStatePayload;
          set({ room: payload.roomState });
          break;
        }
      }
    },

    // Broadcast room state to all players
    _broadcastRoomState: () => {
      const state = get();
      const peerStore = usePeerStore.getState();

      if (!state.isHost || !state.room) return;

      const message = createP2PMessage<RoomStatePayload>(
        "room_state",
        { roomState: state.room },
        peerStore.peerId!,
        state.room.players.find((p) => p.isHost)?.displayName || "Host"
      );
      peerStore.broadcast(message);
    },

    // Update current player in room
    _updatePlayer: (updates: Partial<PeerPlayer>) => {
      const state = get();
      const peerId = usePeerStore.getState().peerId;

      if (!state.room || !peerId) return;

      const updatedPlayers = state.room.players.map((p) =>
        p.peerId === peerId ? { ...p, ...updates } : p
      );

      set({
        room: { ...state.room, players: updatedPlayers },
      });
    },

    // Reset room state
    _reset: () => {
      unsubscribeMessage?.();
      unsubscribeConnection?.();
      unsubscribeMessage = null;
      unsubscribeConnection = null;

      set({
        room: null,
        isHost: false,
        isInRoom: false,
        isReady: false,
        isCreating: false,
        isJoining: false,
        error: null,
      });
    },
  };
});
