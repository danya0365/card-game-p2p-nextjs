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
  Wifi,
  WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface GameLobbyV2Props {
  gameType: GameType;
  onGameStart?: () => void;
}

/**
 * Redesigned Game Lobby - Full Screen, No Scroll
 */
export function GameLobbyV2({ gameType, onGameStart }: GameLobbyV2Props) {
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

  // Copy room code
  const handleCopyCode = async () => {
    if (room?.hostPeerId) {
      await navigator.clipboard.writeText(room.hostPeerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateRoom = async () => {
    try {
      await createRoom(gameType);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    try {
      await joinRoom(roomCode.trim());
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setMode("menu");
    setRoomCode("");
  };

  const canStart =
    isHost &&
    room &&
    room.players.length >= room.config.minPlayers &&
    room.players.every((p) => p.isReady);

  // Loading
  if (!isHydrated) {
    return (
      <div className="fixed inset-0 bg-linear-to-b from-green-800 via-green-900 to-green-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  // ========== WAITING ROOM ==========
  if (isInRoom && room) {
    return (
      <div className="fixed inset-0 bg-linear-to-b from-green-800 via-green-900 to-green-950 overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5 bg-repeat"
          style={{
            backgroundImage:
              "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 z-20 p-2 sm:p-3">
          <div className="flex items-center justify-between">
            {/* Left: Back & Room Code */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLeave}
                className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-lg text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleCopyCode}
                className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2"
              >
                <span className="text-white/70 text-xs hidden sm:inline">
                  ห้อง:
                </span>
                <span className="text-white font-mono text-xs sm:text-sm font-bold">
                  {room.hostPeerId?.slice(-8)}
                </span>
                {copied ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-white/50" />
                )}
              </button>
              <div
                className={`p-1.5 sm:p-2 rounded-lg ${
                  peerId ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                {peerId ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            {/* Center: Game Name */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2">
              <span className="text-white font-bold text-sm sm:text-base">
                🎴 {gameName.th}
              </span>
            </div>

            {/* Right: Player Count */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white font-bold">
                {room.players.length}/{room.config.maxPlayers}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Players Grid */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-32 sm:pt-20 sm:pb-40 px-4">
          <div className="w-full max-w-2xl">
            {/* Status Banner */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full">
                <span className="text-white/70 text-sm">
                  {room.players.length < room.config.minPlayers
                    ? `รอผู้เล่นอีก ${
                        room.config.minPlayers - room.players.length
                      } คน`
                    : room.players.every((p) => p.isReady)
                    ? "พร้อมเริ่มเกม!"
                    : "รอผู้เล่นกดพร้อม..."}
                </span>
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {room.players.map((player) => (
                <div
                  key={player.peerId}
                  className={`relative p-3 sm:p-4 rounded-xl backdrop-blur-sm transition-all ${
                    player.peerId === peerId
                      ? "bg-green-500/20 border-2 border-green-500/50"
                      : "bg-black/30 border border-white/10"
                  }`}
                >
                  {/* Host Crown */}
                  {player.isHost && (
                    <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 drop-shadow-lg" />
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-linear-to-b from-green-500 to-green-600 flex items-center justify-center text-2xl sm:text-3xl mb-2 border-2 border-white/20">
                      {player.avatar}
                    </div>
                    <p className="text-white font-medium text-sm truncate w-full">
                      {player.displayName}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Circle
                        className={`w-2 h-2 ${
                          player.isConnected
                            ? "text-green-400 fill-green-400"
                            : "text-red-400 fill-red-400"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          player.isReady ? "text-green-400" : "text-white/50"
                        }`}
                      >
                        {player.isReady ? "พร้อม" : "รอ..."}
                      </span>
                    </div>
                    {player.peerId === peerId && (
                      <span className="text-[10px] px-2 py-0.5 mt-1 rounded-full bg-blue-500/30 text-blue-300">
                        คุณ
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({
                length: Math.min(
                  room.config.maxPlayers - room.players.length,
                  6
                ),
              }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-3 sm:p-4 rounded-xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center min-h-[120px]"
                >
                  <span className="text-white/30 text-sm">รอผู้เล่น...</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-linear-to-t from-black/60 to-transparent">
          <div className="max-w-md mx-auto space-y-3">
            {!isHost && (
              <button
                onClick={() => setReady(!isReady)}
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all ${
                  isReady
                    ? "bg-white/10 text-white/70 hover:bg-red-500/30 hover:text-red-300"
                    : "bg-green-500 hover:bg-green-400 text-white shadow-lg"
                }`}
              >
                {isReady ? "✓ พร้อมแล้ว (กดเพื่อยกเลิก)" : "🎮 พร้อมเล่น!"}
              </button>
            )}

            {isHost && (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all ${
                  canStart
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {canStart
                  ? "🚀 เริ่มเกม!"
                  : room.players.length < room.config.minPlayers
                  ? `รอผู้เล่นอีก ${
                      room.config.minPlayers - room.players.length
                    } คน`
                  : "รอผู้เล่นทุกคนพร้อม"}
              </button>
            )}
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-500/90 text-white rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ========== MENU / CREATE / JOIN ==========
  return (
    <div className="fixed inset-0 bg-linear-to-b from-green-800 via-green-900 to-green-950 overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5 bg-repeat"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Top HUD - Back Button */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 sm:p-3">
        <button
          onClick={() =>
            mode === "menu" ? router.push("/games") : setMode("menu")
          }
          className="p-2 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Game Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎴</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {gameName.th}
            </h1>
            <p className="text-white/50 text-sm">{gameName.en}</p>
          </div>

          {/* Menu Mode */}
          {mode === "menu" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("create")}
                className="w-full flex items-center justify-center gap-3 p-4 sm:p-5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-lg transition-all shadow-lg"
              >
                <Plus className="w-6 h-6" />
                สร้างห้องใหม่
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full flex items-center justify-center gap-3 p-4 sm:p-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-lg transition-all border border-white/20"
              >
                <LogIn className="w-6 h-6" />
                เข้าร่วมห้อง
              </button>
            </div>
          )}

          {/* Create Mode */}
          {mode === "create" && (
            <div className="space-y-4">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-linear-to-b from-green-500 to-green-600 flex items-center justify-center text-3xl border-2 border-white/20">
                  {user?.avatar}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.displayName}</p>
                  <p className="text-white/50 text-sm flex items-center gap-1">
                    <Crown className="w-3 h-3 text-yellow-400" /> Host
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    สร้างห้อง
                  </>
                )}
              </button>
            </div>
          )}

          {/* Join Mode */}
          {mode === "join" && (
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  รหัสห้อง
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.trim())}
                  placeholder="วางรหัสห้องที่นี่..."
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/20 text-white font-mono text-center text-lg placeholder-white/30 outline-none focus:border-green-500"
                  disabled={isJoining}
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomCode.trim()}
                className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-center text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
