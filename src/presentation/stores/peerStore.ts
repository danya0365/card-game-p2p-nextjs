import type { P2PMessage } from "@/src/domain/types/peer.types";
import {
  getPeerService,
  PeerService,
} from "@/src/infrastructure/peer/PeerService";
import { create } from "zustand";

/**
 * Peer connection status
 */
export type PeerStatus = "idle" | "connecting" | "connected" | "error";

/**
 * Peer store state
 */
interface PeerState {
  peerId: string | null;
  status: PeerStatus;
  error: string | null;
  connectedPeers: string[];
}

/**
 * Peer store actions
 */
interface PeerActions {
  // Connection management
  initialize: (customId?: string) => Promise<string>;
  connect: (peerId: string) => Promise<void>;
  disconnect: (peerId: string) => void;
  disconnectAll: () => void;
  destroy: () => void;

  // Messaging
  send: (peerId: string, message: P2PMessage) => boolean;
  broadcast: (message: P2PMessage, excludePeerId?: string) => void;

  // Event handlers
  onMessage: (
    handler: (message: P2PMessage, peerId: string) => void
  ) => () => void;
  onConnection: (
    handler: (peerId: string, connected: boolean) => void
  ) => () => void;
  onError: (handler: (error: Error) => void) => () => void;

  // Internal
  _updateConnectedPeers: () => void;
  _setError: (error: string | null) => void;
}

type PeerStore = PeerState & PeerActions;

/**
 * Peer store for managing PeerJS connections
 */
export const usePeerStore = create<PeerStore>((set, get) => {
  let peerService: PeerService | null = null;

  return {
    // Initial state
    peerId: null,
    status: "idle",
    error: null,
    connectedPeers: [],

    // Initialize PeerJS
    initialize: async (customId?: string) => {
      const currentStatus = get().status;
      if (currentStatus === "connected" || currentStatus === "connecting") {
        const existingId = get().peerId;
        if (existingId) return existingId;
      }

      set({ status: "connecting", error: null });

      try {
        peerService = getPeerService();

        // Set up connection change handler
        peerService.onConnection(() => {
          get()._updateConnectedPeers();
        });

        const id = await peerService.initialize(customId);
        set({ peerId: id, status: "connected" });
        return id;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize peer";
        set({ status: "error", error: errorMessage });
        throw error;
      }
    },

    // Connect to another peer
    connect: async (peerId: string) => {
      if (!peerService) {
        throw new Error("Peer not initialized");
      }

      try {
        await peerService.connect(peerId);
        get()._updateConnectedPeers();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to connect";
        set({ error: errorMessage });
        throw error;
      }
    },

    // Disconnect from a peer
    disconnect: (peerId: string) => {
      peerService?.disconnect(peerId);
      get()._updateConnectedPeers();
    },

    // Disconnect from all peers
    disconnectAll: () => {
      const peers = get().connectedPeers;
      peers.forEach((peerId) => peerService?.disconnect(peerId));
      get()._updateConnectedPeers();
    },

    // Destroy peer connection
    destroy: () => {
      peerService?.destroy();
      peerService = null;
      set({
        peerId: null,
        status: "idle",
        error: null,
        connectedPeers: [],
      });
    },

    // Send message to a peer
    send: (peerId: string, message: P2PMessage) => {
      if (!peerService) return false;
      return peerService.send(peerId, message);
    },

    // Broadcast message to all peers
    broadcast: (message: P2PMessage, excludePeerId?: string) => {
      peerService?.broadcast(message, excludePeerId);
    },

    // Register message handler
    onMessage: (handler) => {
      if (!peerService) return () => {};
      return peerService.onMessage(handler);
    },

    // Register connection handler
    onConnection: (handler) => {
      if (!peerService) return () => {};
      return peerService.onConnection(handler);
    },

    // Register error handler
    onError: (handler) => {
      if (!peerService) return () => {};
      return peerService.onError(handler);
    },

    // Update connected peers list
    _updateConnectedPeers: () => {
      const peers = peerService?.getConnectedPeers() ?? [];
      set({ connectedPeers: peers });
    },

    // Set error
    _setError: (error: string | null) => {
      set({ error });
    },
  };
});

/**
 * Helper to create a P2P message
 */
export function createP2PMessage<T>(
  type: P2PMessage["type"],
  payload: T,
  senderId: string,
  senderName: string
): P2PMessage<T> {
  return {
    type,
    senderId,
    senderName,
    timestamp: Date.now(),
    payload,
  };
}
