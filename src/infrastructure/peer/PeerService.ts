import type { P2PMessage } from "@/src/domain/types/peer.types";
import Peer, { DataConnection } from "peerjs";

/**
 * PeerJS Service wrapper
 * Handles P2P connection management
 */
export class PeerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Set<(message: P2PMessage, peerId: string) => void> =
    new Set();
  private connectionHandlers: Set<
    (peerId: string, connected: boolean) => void
  > = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();

  /**
   * Initialize PeerJS with optional custom ID
   */
  async initialize(customId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create peer with optional custom ID
        this.peer = customId ? new Peer(customId) : new Peer();

        this.peer.on("open", (id) => {
          console.log("[PeerService] Connected with ID:", id);
          resolve(id);
        });

        this.peer.on("error", (error) => {
          console.error("[PeerService] Error:", error);
          this.errorHandlers.forEach((handler) => handler(error));
          reject(error);
        });

        this.peer.on("connection", (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on("disconnected", () => {
          console.log("[PeerService] Disconnected from server");
        });

        this.peer.on("close", () => {
          console.log("[PeerService] Peer closed");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming connection from another peer
   */
  private handleIncomingConnection(conn: DataConnection) {
    console.log("[PeerService] Incoming connection from:", conn.peer);

    conn.on("open", () => {
      console.log("[PeerService] Connection opened with:", conn.peer);
      this.connections.set(conn.peer, conn);
      this.connectionHandlers.forEach((handler) => handler(conn.peer, true));
    });

    conn.on("data", (data) => {
      const message = data as P2PMessage;
      console.log(
        "[PeerService] Received message from",
        conn.peer,
        ":",
        message.type
      );
      this.messageHandlers.forEach((handler) => handler(message, conn.peer));
    });

    conn.on("close", () => {
      console.log("[PeerService] Connection closed with:", conn.peer);
      this.connections.delete(conn.peer);
      this.connectionHandlers.forEach((handler) => handler(conn.peer, false));
    });

    conn.on("error", (error) => {
      console.error(
        "[PeerService] Connection error with",
        conn.peer,
        ":",
        error
      );
      this.errorHandlers.forEach((handler) => handler(error));
    });
  }

  /**
   * Connect to another peer
   */
  async connect(peerId: string): Promise<DataConnection> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
      }

      if (this.connections.has(peerId)) {
        resolve(this.connections.get(peerId)!);
        return;
      }

      console.log("[PeerService] Connecting to:", peerId);
      const conn = this.peer.connect(peerId, { reliable: true });

      conn.on("open", () => {
        console.log("[PeerService] Connected to:", peerId);
        this.connections.set(peerId, conn);
        this.connectionHandlers.forEach((handler) => handler(peerId, true));
        resolve(conn);
      });

      conn.on("data", (data) => {
        const message = data as P2PMessage;
        console.log(
          "[PeerService] Received message from",
          peerId,
          ":",
          message.type
        );
        this.messageHandlers.forEach((handler) => handler(message, peerId));
      });

      conn.on("close", () => {
        console.log("[PeerService] Connection closed with:", peerId);
        this.connections.delete(peerId);
        this.connectionHandlers.forEach((handler) => handler(peerId, false));
      });

      conn.on("error", (error) => {
        console.error("[PeerService] Connection error:", error);
        this.errorHandlers.forEach((handler) => handler(error));
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.connections.has(peerId)) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * Send message to a specific peer
   */
  send(peerId: string, message: P2PMessage): boolean {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
      return true;
    }
    console.warn("[PeerService] Cannot send to", peerId, "- not connected");
    return false;
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message: P2PMessage, excludePeerId?: string): void {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(message);
      }
    });
  }

  /**
   * Disconnect from a specific peer
   */
  disconnect(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  /**
   * Disconnect from all peers and destroy
   */
  destroy(): void {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.errorHandlers.clear();
  }

  /**
   * Get current peer ID
   */
  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  /**
   * Check if connected to a peer
   */
  isConnectedTo(peerId: string): boolean {
    const conn = this.connections.get(peerId);
    return conn?.open ?? false;
  }

  /**
   * Get all connected peer IDs
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys()).filter(
      (peerId) => this.connections.get(peerId)?.open
    );
  }

  /**
   * Register message handler
   */
  onMessage(
    handler: (message: P2PMessage, peerId: string) => void
  ): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register connection handler
   */
  onConnection(
    handler: (peerId: string, connected: boolean) => void
  ): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Check if peer is initialized
   */
  isInitialized(): boolean {
    return this.peer !== null && !this.peer.destroyed;
  }
}

// Singleton instance
let peerServiceInstance: PeerService | null = null;

/**
 * Get or create PeerService singleton
 */
export function getPeerService(): PeerService {
  if (!peerServiceInstance) {
    peerServiceInstance = new PeerService();
  }
  return peerServiceInstance;
}

/**
 * Reset PeerService (for testing or cleanup)
 */
export function resetPeerService(): void {
  peerServiceInstance?.destroy();
  peerServiceInstance = null;
}
