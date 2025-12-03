"use client";

import type { GameType } from "@/src/domain/types/peer.types";
import { GAME_NAMES } from "@/src/domain/types/peer.types";
import { usePeerStore } from "@/src/presentation/stores/peerStore";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { useUserStore } from "@/src/presentation/stores/userStore";
import {
  ArrowLeft,
  Check,
  Circle,
  Copy,
  Crown,
  Loader2,
  LogIn,
  Plus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface GameLobbyProps {
  gameType: GameType;
  onGameStart?: () => void;
}

/**
 * Reusable Game Lobby component
 * Handles room creation, joining, and waiting room UI
 */
export function GameLobby({ gameType, onGameStart }: GameLobbyProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { user, isHydrated, createUser } = useUserStore();
  const { peerId } = usePeerStore();
  const {
    room,
    isHost,
    isInRoom,
    isReady,
    isCreating,
    isJoining,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
  } = useRoomStore();

  const gameName = GAME_NAMES[gameType];

  // Ensure user exists
  useEffect(() => {
    if (isHydrated && !user) {
      createUser("");
    }
  }, [isHydrated, user, createUser]);

  // Handle game start
  useEffect(() => {
    if (room?.status === "starting" || room?.status === "playing") {
      onGameStart?.();
    }
  }, [room?.status, onGameStart]);

  // Copy room code to clipboard
  const handleCopyCode = async () => {
    const codeToCopy = room?.hostPeerId;
    if (codeToCopy) {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Create a new room
  const handleCreateRoom = async () => {
    try {
      await createRoom(gameType);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  // Join a room
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    try {
      await joinRoom(roomCode.trim());
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  // Leave room and go back
  const handleLeave = () => {
    leaveRoom();
    setMode("menu");
    setRoomCode("");
  };

  // Check if can start game
  const canStart =
    isHost &&
    room &&
    room.players.length >= room.config.minPlayers &&
    room.players.every((p) => p.isReady);

  // Loading state
  if (!isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-success" />
      </div>
    );
  }

  // In room - show waiting room
  if (isInRoom && room) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ออกจากห้อง</span>
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {gameName.th}
            </h1>
            <p className="text-sm text-muted">{room.config.roomName}</p>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>

        {/* Room Code */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-muted mb-2">รหัสห้อง (Room Code)</p>
            <div className="flex items-center justify-center gap-3">
              <code className="font-mono font-bold text-foreground bg-background px-4 py-2 rounded-lg break-all text-xs sm:text-base">
                {room.hostPeerId}
              </code>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                title="คัดลอก"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วมห้อง
            </p>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              ผู้เล่น ({room.players.length}/{room.config.maxPlayers})
            </h2>
            <span className="text-sm text-muted">
              ต้องการขั้นต่ำ {room.config.minPlayers} คน
            </span>
          </div>

          <div className="space-y-3">
            {room.players.map((player) => (
              <div
                key={player.peerId}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  player.peerId === peerId
                    ? "bg-success/10 border border-success/30"
                    : "bg-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-success to-success-dark flex items-center justify-center text-2xl">
                    {player.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {player.displayName}
                      </span>
                      {player.isHost && (
                        <Crown className="w-4 h-4 text-warning" />
                      )}
                      {player.peerId === peerId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">
                          คุณ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Circle
                        className={`w-2 h-2 ${
                          player.isConnected
                            ? "text-success fill-success"
                            : "text-error fill-error"
                        }`}
                      />
                      <span className="text-muted">
                        {player.isConnected
                          ? "เชื่อมต่อแล้ว"
                          : "หลุดการเชื่อมต่อ"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player.isReady ? (
                    <span className="px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                      พร้อม
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-muted-light text-muted text-sm">
                      รอ...
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({
              length: room.config.maxPlayers - room.players.length,
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-4 rounded-xl bg-background border-2 border-dashed border-border"
              >
                <span className="text-muted">รอผู้เล่น...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          {!isHost && (
            <button
              onClick={() => setReady(!isReady)}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
                isReady
                  ? "bg-muted-light text-muted hover:bg-error/10 hover:text-error"
                  : "bg-success hover:bg-success-dark text-white"
              }`}
            >
              {isReady ? "ยกเลิกพร้อม" : "พร้อมเล่น"}
            </button>
          )}

          {isHost && (
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
                canStart
                  ? "bg-success hover:bg-success-dark text-white"
                  : "bg-muted-light text-muted cursor-not-allowed"
              }`}
            >
              {!canStart && room.players.length < room.config.minPlayers
                ? `รอผู้เล่นอีก ${
                    room.config.minPlayers - room.players.length
                  } คน`
                : !canStart
                ? "รอผู้เล่นทุกคนพร้อม"
                : "เริ่มเกม!"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Menu mode - choose create or join
  if (mode === "menu") {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {gameName.th}
          </h1>
          <p className="text-muted">{gameName.en}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode("create")}
            className="w-full flex items-center justify-center gap-3 p-6 rounded-xl bg-success hover:bg-success-dark text-white font-semibold text-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
            สร้างห้องใหม่
          </button>

          <button
            onClick={() => setMode("join")}
            className="w-full flex items-center justify-center gap-3 p-6 rounded-xl bg-surface border border-border hover:border-success/50 text-foreground font-semibold text-lg transition-colors"
          >
            <LogIn className="w-6 h-6" />
            เข้าร่วมห้อง
          </button>

          <button
            onClick={() => router.push("/games")}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            กลับหน้ารวมเกม
          </button>
        </div>
      </div>
    );
  }

  // Create mode
  if (mode === "create") {
    return (
      <div className="max-w-md mx-auto p-6">
        <button
          onClick={() => setMode("menu")}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>กลับ</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            สร้างห้อง {gameName.th}
          </h1>
          <p className="text-muted">สร้างห้องใหม่และเชิญเพื่อนมาเล่น</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-success to-success-dark flex items-center justify-center text-3xl">
              {user?.avatar}
            </div>
            <div>
              <p className="font-medium text-foreground">{user?.displayName}</p>
              <p className="text-sm text-muted">Host</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              <Users className="w-4 h-4 inline mr-1" />
              ผู้เล่น 2-9 คน
            </span>
          </div>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="w-full py-4 rounded-xl bg-success hover:bg-success-dark text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังสร้างห้อง...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              สร้างห้อง
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Join mode
  if (mode === "join") {
    return (
      <div className="max-w-md mx-auto p-6">
        <button
          onClick={() => setMode("menu")}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>กลับ</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            เข้าร่วมห้อง {gameName.th}
          </h1>
          <p className="text-muted">ใส่รหัสห้องที่ได้รับจากเพื่อน</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              รหัสห้อง (Room Code)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.trim())}
              placeholder="ใส่รหัสห้อง..."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-success focus:ring-2 focus:ring-success/20 outline-none text-foreground font-mono text-lg text-center"
              disabled={isJoining}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isJoining || !roomCode.trim()}
            className="w-full py-4 rounded-xl bg-success hover:bg-success-dark text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเข้าร่วม...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                เข้าร่วมห้อง
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
