"use client";

import { PokDengGame } from "@/src/domain/game/PokDengGame";
import type {
  PokDengAction,
  PokDengGameState,
  PokDengPlayer,
} from "@/src/domain/types/pokdeng.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
import { SoundSettingsPanel } from "@/src/presentation/components/molecules/SoundSettingsPanel";
import { useSound } from "@/src/presentation/hooks/useSound";
import {
  createP2PMessage,
  usePeerStore,
} from "@/src/presentation/stores/peerStore";
import {
  usePokDengStore,
  type GameLogEntry,
} from "@/src/presentation/stores/pokdengStore";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { useUserStore } from "@/src/presentation/stores/userStore";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Crown,
  HelpCircle,
  History,
  LogOut,
  MessageCircle,
  Send,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Chat message type
 */
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

/**
 * Redesigned Pok Deng Game Table - Casino Style
 */
export function PokDengTableV2() {
  const { peerId } = usePeerStore();
  const { isHost, room } = useRoomStore();
  const user = useUserStore((s) => s.user);
  const {
    gameState,
    selectedBet,
    actionLogs,
    initGame,
    syncState,
    startRound,
    placeBet,
    drawCard,
    stay,
    fold,
    nextRound,
    setSelectedBet,
    getCurrentPlayer,
    isMyTurn,
    amIDealer,
  } = usePokDengStore();

  const router = useRouter();
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  // Sound hooks
  const {
    playGameStart,
    playCardPlay,
    playBet,
    playWin,
    playLose,
    playClick,
    startGameBgm,
    stopBgm,
  } = useSound();

  // HUD States
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMyCards, setShowMyCards] = useState(true);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    if (room && !gameState) {
      initGame();
    }
  }, [room, gameState, initGame]);

  // Listen for game state and chat updates
  useEffect(() => {
    const peerStore = usePeerStore.getState();

    const unsubscribe = peerStore.onMessage((message) => {
      if (message.type === "game_state") {
        const payload = message.payload as {
          gameState: PokDengGameState;
          actionLogs?: GameLogEntry[];
        };
        syncState(payload.gameState, payload.actionLogs);
      } else if (message.type === "game_action" && isHost) {
        usePokDengStore
          .getState()
          ._handleGameAction(message.payload as PokDengAction);
      } else if (message.type === "chat_message") {
        const chatPayload = message.payload as ChatMessage;
        setChatMessages((prev) => [...prev, chatPayload].slice(-100));
      }
    });

    return unsubscribe;
  }, [isHost, syncState]);

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto scroll history
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop =
        historyScrollRef.current.scrollHeight;
    }
  }, [actionLogs]);

  // Auto show result modal when settling phase
  useEffect(() => {
    if (gameState?.phase === "settling") {
      setShowResult(true);
    }
  }, [gameState?.phase]);

  // Auto-start BGM when game is ready
  const bgmStarted = useRef(false);
  useEffect(() => {
    if (gameState && !bgmStarted.current) {
      startGameBgm();
      bgmStarted.current = true;
    }
    return () => {
      stopBgm();
    };
  }, [gameState, startGameBgm, stopBgm]);

  // Play sound on phase changes
  const prevPhase = useRef(gameState?.phase);
  useEffect(() => {
    if (!gameState) return;
    if (prevPhase.current !== gameState.phase) {
      if (gameState.phase === "dealing") {
        playGameStart();
      } else if (gameState.phase === "settling") {
        // Just play win sound for settling phase
        playWin();
      }
      prevPhase.current = gameState.phase;
    }
  }, [gameState, playGameStart, playWin]);

  // Send chat message
  const sendChat = () => {
    if (!chatInput.trim() || !peerId) return;

    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: peerId,
      senderName: user?.displayName || "Player",
      message: chatInput.trim(),
      timestamp: Date.now(),
    };

    // Add to local state
    setChatMessages((prev) => [...prev, chatMessage].slice(-100));

    // Broadcast to others
    const peerStore = usePeerStore.getState();
    const p2pMessage = createP2PMessage(
      "chat_message",
      chatMessage,
      peerId,
      user?.displayName || "Player"
    );
    peerStore.broadcast(p2pMessage);

    setChatInput("");
  };

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    if (room?.roomId) {
      await navigator.clipboard.writeText(room.roomId);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    }
  };

  // Handle exit room
  const handleExit = () => {
    leaveRoom();
    router.push("/games");
  };

  if (!gameState) {
    return (
      <div className="fixed inset-0 bg-green-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">🎴</div>
          <p className="text-lg">กำลังโหลดเกม...</p>
        </div>
      </div>
    );
  }

  const myPlayer = getCurrentPlayer();
  const dealer = gameState.players.find((p) => p.isDealer);
  const otherPlayers = gameState.players.filter(
    (p) => p.oderId !== peerId && !p.isDealer
  );
  const iAmDealer = amIDealer();
  const myTurn = isMyTurn();
  const betOptions = [10, 20, 50, 100];

  return (
    <div className="fixed inset-0 bg-linear-to-b from-green-800 via-green-900 to-green-950 overflow-hidden">
      {/* Table felt texture overlay */}
      <div
        className="absolute inset-0 opacity-5 bg-repeat"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Top HUD - Responsive */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Exit & Room */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-lg text-white transition-colors"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={copyRoomId}
              className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2"
            >
              <span className="text-white font-mono text-xs sm:text-sm font-bold">
                {room?.roomId}
              </span>
              {copiedRoomId ? (
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-white/50" />
              )}
            </button>
            {/* Connection - Mobile: Icon only */}
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

          {/* Center: Game Status & Pot */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5 items-center gap-2">
              <span className="text-white/70 text-xs">
                รอบ {gameState.roundNumber}
              </span>
              <div
                className={`px-2 py-0.5 rounded text-xs font-medium ${getPhaseStyle(
                  gameState.phase
                )}`}
              >
                {getPhaseText(gameState.phase)}
              </div>
            </div>
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm sm:text-base">
                {gameState.pot}
              </span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className={`p-1.5 sm:p-2 backdrop-blur-sm rounded-lg transition-colors relative ${
                showPlayers
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70"
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white">
                {gameState.players.length}
              </span>
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`hidden sm:block p-2 backdrop-blur-sm rounded-lg transition-colors ${
                showHelp
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70"
              }`}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                playClick();
                setShowSoundSettings(!showSoundSettings);
              }}
              className={`p-1.5 sm:p-2 backdrop-blur-sm rounded-lg transition-colors ${
                showSoundSettings
                  ? "bg-purple-500 text-white"
                  : "bg-black/40 text-white/70"
              }`}
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 sm:p-2 backdrop-blur-sm rounded-lg transition-colors ${
                showHistory
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70"
              }`}
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-1.5 sm:p-2 backdrop-blur-sm rounded-lg transition-colors relative ${
                showChat
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70"
              }`}
              title="แชท"
            >
              <MessageCircle className="w-5 h-5" />
              {chatMessages.length > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                  {Math.min(chatMessages.length, 99)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Current Action Banner */}
      <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-10 w-[90%] sm:w-auto">
        <ActionBanner
          phase={gameState.phase}
          isHost={isHost}
          isDealer={iAmDealer}
          isMyTurn={myTurn}
          myBet={myPlayer?.bet || 0}
          hasDrawn={myPlayer?.hasDrawn || false}
        />
      </div>

      {/* Game Table - Center Area */}
      <div className="absolute inset-0 flex items-center justify-center pt-24 sm:pt-28 pb-40 sm:pb-52">
        {/* Table */}
        <div className="relative w-[95vw] sm:w-[85vw] max-w-2xl aspect-[4/3] sm:aspect-[16/10]">
          {/* Table border glow */}
          <div className="absolute inset-0 rounded-[40px] sm:rounded-[80px] bg-linear-to-b from-yellow-600/30 to-yellow-900/30 blur-xl" />

          {/* Table surface */}
          <div className="absolute inset-1 sm:inset-2 rounded-[35px] sm:rounded-[70px] bg-linear-to-b from-green-700 to-green-800 border-2 sm:border-4 border-yellow-700/50 shadow-2xl" />

          {/* Table inner line */}
          <div className="absolute inset-4 sm:inset-6 rounded-[25px] sm:rounded-[55px] border border-yellow-600/20" />

          {/* Dealer in Center */}
          {dealer && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-linear-to-b from-yellow-500 to-yellow-600 flex items-center justify-center text-2xl sm:text-3xl shadow-lg border-2 border-yellow-400">
                  {dealer.avatar}
                </div>
                <Crown className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 drop-shadow-lg" />
              </div>
              <p className="text-white font-medium text-sm mt-1 text-shadow">
                {dealer.displayName}
              </p>
              <p className="text-yellow-400 text-xs">เจ้ามือ</p>

              {/* Dealer's cards */}
              {dealer.hand.length > 0 && (
                <div className="mt-2">
                  <CardHand
                    cards={dealer.hand}
                    faceDown={
                      gameState.phase !== "revealing" &&
                      gameState.phase !== "settling"
                    }
                    size="sm"
                  />
                </div>
              )}

              {/* Dealer result */}
              {dealer.result &&
                (gameState.phase === "revealing" ||
                  gameState.phase === "settling") && (
                  <div className="mt-1 bg-black/50 rounded px-2 py-0.5">
                    <span className="text-white font-bold">
                      {dealer.result.points}
                    </span>
                    <span className="text-yellow-400 text-xs ml-1">
                      {PokDengGame.getHandTypeName(dealer.result.handType)}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Other Players around the table */}
          {otherPlayers.map((player, index) => {
            const position = getPlayerPosition(index);
            return (
              <PlayerSeat
                key={player.oderId}
                player={player}
                position={position}
                isCurrentTurn={
                  gameState.players[gameState.currentPlayerIndex]?.oderId ===
                  player.oderId
                }
                showCards={
                  gameState.phase === "revealing" ||
                  gameState.phase === "settling"
                }
              />
            );
          })}
        </div>
      </div>

      {/* Bottom HUD - My Player Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {myPlayer && (
          <div className="bg-linear-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
            {/* My Cards - Collapsible */}
            <div className="max-w-2xl mx-auto">
              {/* Toggle Button */}
              <button
                onClick={() => setShowMyCards(!showMyCards)}
                className="mx-auto mb-2 flex items-center gap-1 px-3 py-1 bg-black/40 rounded-full text-white/70 text-xs hover:text-white transition-colors"
              >
                {showMyCards ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
                {showMyCards ? "ซ่อนไพ่" : "แสดงไพ่"}
              </button>

              {showMyCards && (
                <>
                  {/* My Info */}
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{myPlayer.avatar}</span>
                      <div>
                        <p className="text-white font-medium">
                          {myPlayer.displayName}
                        </p>
                        <p className="text-white/50 text-xs">
                          {iAmDealer
                            ? "เจ้ามือ"
                            : `เดิมพัน: ${myPlayer.bet || "-"}`}
                        </p>
                      </div>
                    </div>
                    {myPlayer.payout !== 0 &&
                      gameState.phase === "settling" && (
                        <div
                          className={`text-xl font-bold ${
                            myPlayer.payout > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {myPlayer.payout > 0
                            ? `+${myPlayer.payout}`
                            : myPlayer.payout}
                        </div>
                      )}
                  </div>

                  {/* My Cards */}
                  {myPlayer.hand.length > 0 && (
                    <div className="flex justify-center mb-3">
                      <CardHand cards={myPlayer.hand} size="md" />
                    </div>
                  )}

                  {/* My Result */}
                  {myPlayer.result && (
                    <div className="text-center mb-3">
                      <span className="text-2xl font-bold text-white">
                        {myPlayer.result.points} แต้ม
                      </span>
                      <span className="ml-2 px-2 py-1 bg-yellow-500/30 text-yellow-400 rounded text-sm">
                        {PokDengGame.getHandTypeName(myPlayer.result.handType)}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-3">
                    {/* Waiting - Start Round */}
                    {gameState.phase === "waiting" && isHost && (
                      <button
                        onClick={startRound}
                        className="px-8 py-3 rounded-xl bg-linear-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold shadow-lg transition-all hover:scale-105"
                      >
                        🎮 เริ่มรอบใหม่
                      </button>
                    )}

                    {/* Betting Phase */}
                    {gameState.phase === "betting" &&
                      !iAmDealer &&
                      myPlayer.bet === 0 && (
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {betOptions.map((bet) => (
                              <button
                                key={bet}
                                onClick={() => setSelectedBet(bet)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                  selectedBet === bet
                                    ? "bg-yellow-500 text-black scale-110"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                              >
                                {bet}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => placeBet(selectedBet)}
                            className="px-6 py-2 rounded-xl bg-linear-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold shadow-lg transition-all hover:scale-105"
                          >
                            💰 เดิมพัน {selectedBet}
                          </button>
                        </div>
                      )}

                    {/* Playing Phase */}
                    {gameState.phase === "playing" &&
                      myTurn &&
                      !myPlayer.hasDrawn && (
                        <div className="flex gap-3">
                          <button
                            onClick={drawCard}
                            disabled={myPlayer.hand.length >= 3}
                            className="px-6 py-3 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            🃏 จั่วไพ่
                          </button>
                          <button
                            onClick={stay}
                            className="px-6 py-3 rounded-xl bg-linear-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold shadow-lg transition-all hover:scale-105"
                          >
                            ✋ พอ
                          </button>
                          <button
                            onClick={fold}
                            className="px-6 py-3 rounded-xl bg-linear-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold shadow-lg transition-all hover:scale-105"
                          >
                            🚩 หมอบ
                          </button>
                        </div>
                      )}

                    {/* Settling - Next Round */}
                    {(gameState.phase === "settling" ||
                      gameState.phase === "finished") &&
                      isHost && (
                        <button
                          onClick={() => {
                            if (gameState.phase === "settling") nextRound();
                            startRound();
                          }}
                          className="px-8 py-3 rounded-xl bg-linear-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold shadow-lg transition-all hover:scale-105"
                        >
                          ▶️ รอบถัดไป
                        </button>
                      )}

                    {/* Waiting message */}
                    {gameState.phase === "playing" &&
                      !myTurn &&
                      !myPlayer.hasDrawn && (
                        <div className="text-white/70 py-3">
                          ⏳ รอผู้เล่นคนอื่น...
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel - Mobile: Bottom sheet, Desktop: Right side */}
      {showChat && (
        <div className="absolute inset-x-2 bottom-2 sm:inset-auto sm:right-4 sm:top-14 sm:bottom-44 sm:w-72 h-64 sm:h-auto bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col z-30">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-white font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> แชท
            </h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {chatMessages.length === 0 ? (
              <p className="text-white/30 text-center text-sm py-4">
                ยังไม่มีข้อความ
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${msg.senderId === peerId ? "text-right" : ""}`}
                >
                  <div
                    className={`inline-block max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.senderId === peerId ? "bg-blue-500/50" : "bg-white/10"
                    }`}
                  >
                    {msg.senderId !== peerId && (
                      <p className="text-xs text-white/50 mb-1">
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-white text-sm">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 outline-none focus:ring-2 ring-blue-500/50"
              />
              <button
                onClick={sendChat}
                className="p-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel - Mobile: Bottom sheet, Desktop: Left side */}
      {showHistory && (
        <div className="absolute inset-x-2 bottom-2 sm:inset-auto sm:left-4 sm:top-14 sm:bottom-44 sm:w-72 h-64 sm:h-auto bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col z-30">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-white font-medium flex items-center gap-2">
              <History className="w-4 h-4" /> ประวัติ ({actionLogs.length})
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            ref={historyScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {actionLogs.length === 0 ? (
              <p className="text-white/30 text-center text-sm py-4">
                ยังไม่มีประวัติ
              </p>
            ) : (
              actionLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <span className="text-base">{log.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {log.playerName && (
                        <span className="font-medium text-white">
                          {log.playerName}
                        </span>
                      )}
                      <span className={getLogColor(log.type, log.message)}>
                        {log.message}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(log.timestamp).toLocaleTimeString("th-TH")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Players Panel */}
      {showPlayers && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 z-40">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Users className="w-5 h-5" /> ผู้เล่นในห้อง (
              {gameState.players.length})
            </h3>
            <button
              onClick={() => setShowPlayers(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {gameState.players.map((player) => (
              <div
                key={player.oderId}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
              >
                <span className="text-2xl">{player.avatar}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{player.displayName}</p>
                  <p className="text-xs text-white/50">
                    {player.isDealer
                      ? "👑 เจ้ามือ"
                      : `เดิมพัน: ${player.bet || 0}`}
                  </p>
                </div>
                {player.oderId === peerId && (
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded text-white">
                    คุณ
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 z-40 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-medium flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> วิธีเล่นป๊อกเดง
            </h3>
            <button
              onClick={() => setShowHelp(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] text-white/80 text-sm">
            <div>
              <h4 className="text-white font-bold mb-2">🎯 เป้าหมาย</h4>
              <p>ทำแต้มให้ได้ 8 หรือ 9 (ป๊อก) หรือมากกว่าเจ้ามือ</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🃏 การนับแต้ม</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>A = 1, 2-9 = ตามหน้าไพ่, 10/J/Q/K = 0</li>
                <li>รวมแต้มแล้วเอาเฉพาะหลักหน่วย (เช่น 15 = 5 แต้ม)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🏆 มือพิเศษ</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="text-yellow-400">ป๊อก 9</span> - 2 ใบได้ 9
                  แต้ม (x3)
                </li>
                <li>
                  <span className="text-yellow-400">ป๊อก 8</span> - 2 ใบได้ 8
                  แต้ม (x2)
                </li>
                <li>
                  <span className="text-purple-400">ตอง</span> - 3 ใบเหมือนกัน
                  (x5)
                </li>
                <li>
                  <span className="text-blue-400">สเตรทฟลัช</span> -
                  เรียงดอกเดียว (x5)
                </li>
                <li>
                  <span className="text-green-400">สเตรท</span> - เรียง (x3)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🎮 วิธีเล่น</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>วางเดิมพัน (ยกเว้นเจ้ามือ)</li>
                <li>รับไพ่ 2 ใบ</li>
                <li>เลือก: จั่ว (ไพ่ใบที่ 3) / พอ / หมอบ</li>
                <li>เปิดไพ่เปรียบกับเจ้ามือ</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showResult && gameState.phase === "settling" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                🏆 สรุปผลรอบที่ {gameState.roundNumber}
              </h2>
            </div>

            {/* Dealer Result */}
            {dealer && (
              <div className="p-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-2xl border-2 border-yellow-400">
                      {dealer.avatar}
                    </div>
                    <div>
                      <p className="text-white font-bold flex items-center gap-1">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        {dealer.displayName}
                      </p>
                      <p className="text-yellow-400 text-sm">เจ้ามือ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {dealer.result?.points || 0} แต้ม
                    </p>
                    <p className="text-white/60 text-sm">
                      {dealer.result
                        ? PokDengGame.getHandTypeName(dealer.result.handType)
                        : "-"}
                    </p>
                  </div>
                </div>
                {dealer.hand.length > 0 && (
                  <div className="mt-3 flex justify-center">
                    <CardHand cards={dealer.hand} size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* Players Results */}
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {gameState.players
                .filter((p) => !p.isDealer)
                .map((player) => {
                  const isMe = player.oderId === peerId;
                  const won = player.payout > 0;
                  const lost = player.payout < 0;
                  const tied = player.payout === 0 && !player.isFolded;

                  return (
                    <div
                      key={player.oderId}
                      className={`p-3 rounded-xl ${
                        isMe
                          ? won
                            ? "bg-green-500/20 border border-green-500/50"
                            : lost
                            ? "bg-red-500/20 border border-red-500/50"
                            : "bg-blue-500/20 border border-blue-500/50"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                            {player.avatar}
                          </div>
                          <div>
                            <p className="text-white font-medium flex items-center gap-1">
                              {player.displayName}
                              {isMe && (
                                <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded">
                                  คุณ
                                </span>
                              )}
                            </p>
                            <p className="text-white/50 text-xs">
                              {player.isFolded
                                ? "หมอบ"
                                : player.result
                                ? `${
                                    player.result.points
                                  } แต้ม (${PokDengGame.getHandTypeName(
                                    player.result.handType
                                  )})`
                                : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {player.isFolded ? (
                            <p className="text-red-400 font-bold">🚩 หมอบ</p>
                          ) : won ? (
                            <p className="text-green-400 font-bold text-lg">
                              +{player.payout}
                            </p>
                          ) : lost ? (
                            <p className="text-red-400 font-bold text-lg">
                              {player.payout}
                            </p>
                          ) : tied ? (
                            <p className="text-white/50 font-bold">เสมอ</p>
                          ) : null}
                        </div>
                      </div>
                      {/* Show player cards */}
                      {!player.isFolded && player.hand.length > 0 && (
                        <div className="mt-2 flex justify-center scale-75 origin-center">
                          <CardHand cards={player.hand} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              {isHost ? (
                <button
                  onClick={() => {
                    setShowResult(false);
                  }}
                  className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-colors"
                >
                  ปิด
                </button>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setShowResult(false)}
                    className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    ปิด
                  </button>
                  <p className="text-white/50 text-sm mt-2">
                    รอ Host เริ่มรอบถัดไป...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 border border-white/10">
            <h3 className="text-white text-lg font-bold mb-2">ออกจากห้อง?</h3>
            <p className="text-white/70 text-sm mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการออกจากห้องนี้?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleExit}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                ออกจากห้อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sound Settings Panel */}
      <SoundSettingsPanel
        isOpen={showSoundSettings}
        onClose={() => setShowSoundSettings(false)}
      />
    </div>
  );
}

/**
 * Player Seat Component
 */
function PlayerSeat({
  player,
  position,
  isCurrentTurn,
  showCards,
}: {
  player: PokDengPlayer;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  isCurrentTurn: boolean;
  showCards: boolean;
}) {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={position}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div className="absolute -inset-2 rounded-xl bg-yellow-400/30 animate-pulse" />
      )}

      {/* Avatar */}
      <div
        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 ${
          isCurrentTurn
            ? "border-yellow-400 bg-yellow-500/20"
            : "border-white/30 bg-black/30"
        }`}
      >
        {player.avatar}
      </div>

      {/* Name & Bet */}
      <p className="text-white font-medium text-xs mt-1 text-shadow">
        {player.displayName}
      </p>
      {player.bet > 0 && !player.isDealer && (
        <p className="text-yellow-400 text-xs">💰 {player.bet}</p>
      )}

      {/* Cards */}
      {player.hand.length > 0 && (
        <div className="mt-1 scale-75">
          <CardHand cards={player.hand} faceDown={!showCards} size="sm" />
        </div>
      )}

      {/* Result */}
      {player.result && showCards && (
        <div className="mt-1 bg-black/60 rounded px-2 py-0.5">
          <span className="text-white font-bold text-xs">
            {player.result.points}
          </span>
        </div>
      )}

      {/* Payout */}
      {player.payout !== 0 && showCards && (
        <div
          className={`text-xs font-bold ${
            player.payout > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {player.payout > 0 ? `+${player.payout}` : player.payout}
        </div>
      )}

      {/* Folded status */}
      {player.isFolded && <p className="text-red-400 text-xs">หมอบ</p>}
    </div>
  );
}

/**
 * Action Banner Component
 */
function ActionBanner({
  phase,
  isHost,
  isDealer,
  isMyTurn,
  myBet,
  hasDrawn,
}: {
  phase: string;
  isHost: boolean;
  isDealer: boolean;
  isMyTurn: boolean;
  myBet: number;
  hasDrawn: boolean;
}) {
  let icon = "💡";
  let message = "";
  let bgClass = "from-blue-500/80 to-blue-600/80";

  switch (phase) {
    case "waiting":
      icon = isHost ? "🎮" : "⏳";
      message = isHost ? "กดปุ่ม 'เริ่มรอบใหม่'" : "รอเจ้าห้องเริ่มเกม...";
      bgClass = isHost
        ? "from-green-500/80 to-green-600/80"
        : "from-gray-500/80 to-gray-600/80";
      break;
    case "betting":
      if (isDealer) {
        icon = "👑";
        message = "รอผู้เล่นวางเดิมพัน";
      } else if (myBet > 0) {
        icon = "✅";
        message = `เดิมพันแล้ว ${myBet}`;
        bgClass = "from-green-500/80 to-green-600/80";
      } else {
        icon = "💰";
        message = "เลือกจำนวนและกด 'เดิมพัน'";
        bgClass = "from-yellow-500/80 to-yellow-600/80";
      }
      break;
    case "dealing":
      icon = "🃏";
      message = "กำลังแจกไพ่...";
      break;
    case "playing":
      if (hasDrawn) {
        icon = "✅";
        message = "รอผู้เล่นคนอื่น";
        bgClass = "from-green-500/80 to-green-600/80";
      } else if (isMyTurn) {
        icon = "🎯";
        message = "ถึงตาคุณ! จั่ว / พอ / หมอบ";
        bgClass = "from-yellow-500/80 to-yellow-600/80";
      } else {
        icon = "⏳";
        message = "รอผู้เล่นคนอื่น...";
        bgClass = "from-gray-500/80 to-gray-600/80";
      }
      break;
    case "revealing":
      icon = "👁️";
      message = "เปิดไพ่เปรียบ!";
      bgClass = "from-purple-500/80 to-purple-600/80";
      break;
    case "settling":
    case "finished":
      icon = "🏆";
      message = isHost ? "กด 'รอบถัดไป'" : "รอเจ้าห้องเริ่มรอบถัดไป";
      bgClass = "from-orange-500/80 to-orange-600/80";
      break;
  }

  return (
    <div
      className={`px-6 py-2 rounded-full bg-linear-to-r ${bgClass} backdrop-blur-sm shadow-lg`}
    >
      <p className="text-white font-medium text-sm">
        <span className="mr-2">{icon}</span>
        {message}
      </p>
    </div>
  );
}

/**
 * Get player position around the table
 */
function getPlayerPosition(index: number): {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
} {
  // Positions for up to 7 players around the table (dealer in center)
  // Arranged to avoid center overlap
  const positions = [
    { top: "8%", left: "50%" }, // Top center (far from dealer)
    { top: "20%", right: "10%" }, // Top right
    { top: "50%", right: "3%" }, // Right
    { top: "80%", right: "10%" }, // Bottom right
    { top: "80%", left: "10%" }, // Bottom left
    { top: "50%", left: "3%" }, // Left
    { top: "20%", left: "10%" }, // Top left
  ];

  return positions[index % positions.length];
}

/**
 * Get phase display text
 */
function getPhaseText(phase: string): string {
  const texts: Record<string, string> = {
    waiting: "รอเริ่มเกม",
    betting: "เดิมพัน",
    dealing: "แจกไพ่",
    playing: "จั่วไพ่",
    revealing: "เปิดไพ่",
    settling: "สรุปผล",
    finished: "จบรอบ",
  };
  return texts[phase] || phase;
}

/**
 * Get phase style
 */
function getPhaseStyle(phase: string): string {
  const styles: Record<string, string> = {
    waiting: "bg-gray-500/50 text-gray-200",
    betting: "bg-yellow-500/50 text-yellow-200",
    dealing: "bg-blue-500/50 text-blue-200",
    playing: "bg-green-500/50 text-green-200",
    revealing: "bg-purple-500/50 text-purple-200",
    settling: "bg-orange-500/50 text-orange-200",
    finished: "bg-gray-500/50 text-gray-200",
  };
  return styles[phase] || "bg-gray-500/50";
}

/**
 * Get log message color
 */
function getLogColor(type: string, message: string): string {
  if (type === "system") return "text-blue-400";
  if (type === "result") {
    return message.includes("ชนะ") ? "text-green-400" : "text-red-400";
  }
  return "text-white/70";
}
