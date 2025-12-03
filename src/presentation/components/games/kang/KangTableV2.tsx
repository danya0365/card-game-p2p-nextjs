"use client";

import type {
  KangAction,
  KangGameState,
  KangPlayer,
} from "@/src/domain/types/kang.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
import { SoundSettingsPanel } from "@/src/presentation/components/molecules/SoundSettingsPanel";
import { useSound } from "@/src/presentation/hooks/useSound";
import {
  useKangStore,
  type GameLogEntry,
} from "@/src/presentation/stores/kangStore";
import {
  createP2PMessage,
  usePeerStore,
} from "@/src/presentation/stores/peerStore";
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
 * Kang Game Table V2 - Full Screen Game UI
 */
export function KangTableV2() {
  const {
    gameState,
    initGame,
    syncState,
    startRound,
    placeBet,
    discardCards,
    keepAll,
    fold,
    selectedBet,
    setSelectedBet,
    selectedCards,
    toggleCardSelection,
    clearCardSelection,
    actionLogs,
    _handleGameAction,
  } = useKangStore();

  const { room, isHost } = useRoomStore();
  const { peerId, status: peerStatus } = usePeerStore();
  const isConnected = peerStatus === "connected";
  const { user } = useUserStore();
  const router = useRouter();
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  // Sound hooks
  const { playGameStart, playWin, playClick, startGameBgm, stopBgm } =
    useSound();

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
          gameState: KangGameState;
          actionLogs?: GameLogEntry[];
        };
        syncState(payload.gameState, payload.actionLogs);
      } else if (message.type === "game_action" && isHost) {
        const action = message.payload as KangAction;
        _handleGameAction(action, message.senderName);
      } else if (message.type === "chat_message") {
        const chatMsg = message.payload as ChatMessage;
        setChatMessages((prev) => [...prev, chatMsg].slice(-100));
      }
    });

    return () => unsubscribe();
  }, [syncState, _handleGameAction, isHost]);

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

  // Handle exit
  const handleExit = () => {
    leaveRoom();
    router.push("/games");
  };

  // Bet options
  const betOptions = [10, 20, 50, 100];

  // Early return if no game state
  if (!gameState) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลดเกม...</div>
      </div>
    );
  }

  // Get my player and dealer
  const myPlayer = gameState.players.find((p) => p.oderId === peerId);
  const dealer = gameState.players.find((p) => p.isDealer);
  const iAmDealer = myPlayer?.isDealer || false;
  const otherPlayers = gameState.players.filter((p) => p.oderId !== peerId);

  // Get action instruction
  const getActionInstruction = (): string => {
    switch (gameState.phase) {
      case "waiting":
        return isHost ? "กด 'เริ่มรอบใหม่'" : "รอ Host เริ่มเกม...";
      case "betting":
        if (iAmDealer) return "รอผู้เล่นอื่นเดิมพัน...";
        if (myPlayer?.bet && myPlayer.bet > 0) return "รอผู้เล่นอื่น...";
        return "วางเดิมพัน";
      case "dealing":
        return "กำลังแจกไพ่...";
      case "discarding":
        if (myPlayer?.hasDiscarded) return "รอผู้เล่นอื่น...";
        if (iAmDealer) return "เลือกไพ่ที่จะเปลี่ยน";
        return "เลือกไพ่ที่จะเปลี่ยน (สูงสุด 4 ใบ)";
      case "showdown":
        return "เปิดไพ่!";
      case "settling":
        return "สรุปผล";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-900 to-blue-950 overflow-hidden">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Room info */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </button>
            <button
              onClick={copyRoomId}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span className="text-white/70 text-xs sm:text-sm font-mono">
                {room?.roomId?.slice(0, 6)}
              </span>
              {copiedRoomId ? (
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-white/50" />
              )}
            </button>
            <span
              className={`hidden sm:flex items-center gap-1 text-xs ${
                isConnected ? "text-green-400" : "text-red-400"
              }`}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
            </span>
          </div>

          {/* Center - Round info */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-black/30 rounded-lg text-white text-xs sm:text-sm">
              รอบ {gameState.roundNumber || 1}
            </span>
            <span className="hidden sm:inline-flex px-3 py-1.5 bg-yellow-500/20 rounded-lg text-yellow-400 text-sm">
              สลับเปลี่ยน
            </span>
          </div>

          {/* Right side - Balance and actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-yellow-500/20 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm sm:text-base">
                100
              </span>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="hidden sm:block p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-white/70" />
            </button>
            <button
              onClick={() => {
                playClick();
                setShowSoundSettings(!showSoundSettings);
              }}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                showSoundSettings
                  ? "bg-purple-500 text-white"
                  : "bg-black/30 hover:bg-black/50"
              }`}
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-10">
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 rounded-full text-white font-bold text-sm sm:text-base shadow-lg">
          {getActionInstruction()}
        </div>
      </div>

      {/* Game Table */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 sm:pt-28 pb-48 sm:pb-56">
        <div className="relative w-full max-w-4xl aspect-4/3 sm:aspect-16/10 bg-gradient-to-b from-blue-700 to-blue-800 rounded-3xl border-8 border-blue-900 shadow-2xl">
          {/* Table felt pattern */}
          <div className="absolute inset-4 rounded-2xl bg-blue-600/30 border border-blue-500/20" />

          {/* Dealer Position (Top Center) */}
          {dealer && (
            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-yellow-500 flex items-center justify-center text-xl sm:text-2xl border-2 border-yellow-400 shadow-lg">
                {dealer.avatar}
                <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300" />
              </div>
              <p className="text-white font-medium text-xs sm:text-sm mt-1 text-shadow">
                {dealer.displayName}
              </p>
              <span className="text-yellow-400 text-xs">เจ้ามือ</span>

              {/* Dealer cards */}
              {dealer.hand.length > 0 &&
                (gameState.phase === "showdown" ||
                  gameState.phase === "settling") && (
                  <div className="mt-2 scale-50 sm:scale-75">
                    <CardHand cards={dealer.hand} size="sm" />
                  </div>
                )}

              {/* Dealer result */}
              {dealer.result && gameState.phase === "settling" && (
                <div className="mt-1 px-2 py-0.5 bg-black/50 rounded text-yellow-400 text-xs">
                  {dealer.result.description}
                </div>
              )}
            </div>
          )}

          {/* Other Players Positions */}
          {otherPlayers.slice(0, 5).map((player, index) => {
            const positions = [
              { top: "50%", left: "5%" },
              { top: "50%", right: "5%", left: "auto" },
              { bottom: "10%", left: "20%" },
              { bottom: "10%", right: "20%", left: "auto" },
              { top: "30%", left: "15%" },
            ];
            const pos = positions[index] || positions[0];

            return (
              <PlayerSeat
                key={player.oderId}
                player={player}
                position={pos}
                isCurrentTurn={false}
                showCards={
                  gameState.phase === "showdown" ||
                  gameState.phase === "settling"
                }
              />
            );
          })}

          {/* Center Pot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {gameState.pot > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {gameState.pot}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel - My Cards & Actions */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Toggle button */}
        <button
          onClick={() => setShowMyCards(!showMyCards)}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/50 rounded-t-lg text-white/70 text-sm flex items-center gap-1"
        >
          {showMyCards ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          ซ่อนไพ่
        </button>

        {/* Panel content */}
        <div
          className={`bg-gradient-to-t from-black/90 to-black/70 backdrop-blur-sm transition-all duration-300 ${
            showMyCards ? "h-auto" : "h-0 overflow-hidden"
          }`}
        >
          <div className="p-4 max-w-2xl mx-auto">
            {/* My Info */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl">
                {myPlayer?.avatar}
              </div>
              <div>
                <p className="text-white font-medium">
                  {myPlayer?.displayName}
                </p>
                <p className="text-white/50 text-xs">
                  {iAmDealer ? "👑 เจ้ามือ" : `เดิมพัน: ${myPlayer?.bet || 0}`}
                </p>
              </div>
              {myPlayer?.payout !== 0 && gameState.phase === "settling" && (
                <div
                  className={`px-3 py-1 rounded-full font-bold ${
                    (myPlayer?.payout || 0) > 0
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {(myPlayer?.payout || 0) > 0 ? "+" : ""}
                  {myPlayer?.payout}
                </div>
              )}
            </div>

            {/* My Cards */}
            {myPlayer && myPlayer.hand.length > 0 && (
              <div className="flex justify-center mb-4">
                <div className="flex gap-1 sm:gap-2">
                  {myPlayer.hand.map((card, index) => {
                    const isSelected = selectedCards.includes(index);
                    const canSelect =
                      gameState.phase === "discarding" &&
                      !myPlayer.hasDiscarded;

                    return (
                      <button
                        key={card.id}
                        onClick={() => canSelect && toggleCardSelection(index)}
                        disabled={!canSelect}
                        className={`relative transition-all ${
                          canSelect ? "cursor-pointer hover:scale-105" : ""
                        } ${isSelected ? "-translate-y-4" : ""}`}
                      >
                        <CardHand cards={[card]} size="md" />
                        {isSelected && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Result */}
            {myPlayer?.result && (
              <div className="text-center mb-3">
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  {myPlayer.result.description}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              {/* Waiting phase - Host starts round */}
              {gameState.phase === "waiting" && isHost && (
                <button
                  onClick={startRound}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                >
                  🎮 เริ่มรอบใหม่
                </button>
              )}

              {/* Betting phase */}
              {gameState.phase === "betting" &&
                !iAmDealer &&
                (!myPlayer?.bet || myPlayer.bet === 0) && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-2">
                      {betOptions.map((bet) => (
                        <button
                          key={bet}
                          onClick={() => setSelectedBet(bet)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedBet === bet
                              ? "bg-yellow-500 text-black"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {bet}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => placeBet(selectedBet)}
                      className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                    >
                      วางเดิมพัน {selectedBet}
                    </button>
                  </div>
                )}

              {/* Discarding phase */}
              {gameState.phase === "discarding" && !myPlayer?.hasDiscarded && (
                <div className="flex gap-2">
                  <button
                    onClick={keepAll}
                    className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-colors"
                  >
                    ✋ เก็บทั้งหมด
                  </button>
                  {selectedCards.length > 0 && (
                    <button
                      onClick={discardCards}
                      className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors"
                    >
                      🔄 เปลี่ยน {selectedCards.length} ใบ
                    </button>
                  )}
                  {!iAmDealer && (
                    <button
                      onClick={fold}
                      className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold transition-colors"
                    >
                      🚩 หมอบ
                    </button>
                  )}
                </div>
              )}

              {/* Settling phase */}
              {gameState.phase === "settling" && isHost && (
                <button
                  onClick={startRound}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                >
                  🎮 รอบถัดไป
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panels */}
      {/* Chat Panel */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-32 sm:bottom-48 right-2 sm:right-4 z-30 p-2 sm:p-3 bg-blue-500 rounded-full shadow-lg"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {showChat && (
        <div className="fixed bottom-0 sm:bottom-48 right-0 sm:right-4 w-full sm:w-80 h-1/2 sm:h-80 bg-black/90 sm:rounded-xl border border-white/10 z-40 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-white font-medium">แชท</h3>
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
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`${
                  msg.senderId === peerId ? "text-right" : "text-left"
                }`}
              >
                <span className="text-xs text-white/50">{msg.senderName}</span>
                <p
                  className={`inline-block px-3 py-1 rounded-lg text-sm ${
                    msg.senderId === peerId
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {msg.message}
                </p>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChat()}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendChat}
              className="p-2 bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="fixed bottom-32 sm:bottom-48 left-2 sm:left-4 z-30 p-2 sm:p-3 bg-purple-500 rounded-full shadow-lg"
      >
        <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {showHistory && (
        <div className="fixed bottom-0 sm:bottom-48 left-0 sm:left-4 w-full sm:w-80 h-1/2 sm:h-80 bg-black/90 sm:rounded-xl border border-white/10 z-40 flex flex-col">
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
            className="flex-1 overflow-y-auto p-3 space-y-1 text-sm"
          >
            {actionLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                {log.icon && <span>{log.icon}</span>}
                <div>
                  {log.playerName && (
                    <span className="text-yellow-400">{log.playerName} </span>
                  )}
                  <span
                    className={
                      log.type === "system"
                        ? "text-white/50"
                        : log.type === "result"
                        ? "text-green-400"
                        : "text-white"
                    }
                  >
                    {log.message}
                  </span>
                  <span className="text-white/30 text-xs ml-2">
                    {new Date(log.timestamp).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
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
              <HelpCircle className="w-5 h-5" /> วิธีเล่นไพ่แคง
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
              <p>สร้างมือไพ่ที่ดีที่สุดจาก 5 ใบ ชนะเจ้ามือ</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🏆 ลำดับมือไพ่</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="text-yellow-400">สเตรทฟลัช</span> - 5 ใบเรียง
                  ดอกเดียว (x5)
                </li>
                <li>
                  <span className="text-yellow-400">แคง</span> - ตอง + คู่ (x3)
                </li>
                <li>
                  <span className="text-purple-400">ตอง</span> - 3 ใบเหมือน (x3)
                </li>
                <li>
                  <span className="text-blue-400">ฟลัช</span> - 5 ใบดอกเดียว
                  (x2)
                </li>
                <li>
                  <span className="text-green-400">เรียง</span> - 5 ใบเรียงกัน
                  (x2)
                </li>
                <li>
                  <span className="text-orange-400">สองคู่</span> - 2 คู่ (x2)
                </li>
                <li>คู่ - 2 ใบเหมือน (x1)</li>
                <li>ไฮการ์ด - ไพ่สูง (x1)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🎮 วิธีเล่น</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>วางเดิมพัน (ยกเว้นเจ้ามือ)</li>
                <li>รับไพ่ 5 ใบ</li>
                <li>เลือกไพ่ที่จะเปลี่ยน (0-4 ใบ)</li>
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-center">
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
                    <p className="text-xl font-bold text-white">
                      {dealer.result?.description || "-"}
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
                                : player.result?.description || "-"}
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
                    startRound();
                  }}
                  className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-colors"
                >
                  🎮 เริ่มรอบถัดไป
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
  player: KangPlayer;
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
      {player.bet > 0 && (
        <span className="text-yellow-400 text-xs">{player.bet}</span>
      )}

      {/* Cards */}
      {showCards && player.hand.length > 0 && !player.isFolded && (
        <div className="mt-1 scale-50">
          <CardHand cards={player.hand} size="sm" />
        </div>
      )}

      {/* Result */}
      {player.result && showCards && (
        <div className="mt-1 px-2 py-0.5 bg-black/50 rounded text-white text-xs">
          {player.result.description}
        </div>
      )}

      {/* Folded indicator */}
      {player.isFolded && (
        <span className="text-red-400 text-xs mt-1">หมอบ</span>
      )}

      {/* Payout */}
      {player.payout !== 0 && (
        <span
          className={`text-xs font-bold mt-1 ${
            player.payout > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {player.payout > 0 ? "+" : ""}
          {player.payout}
        </span>
      )}
    </div>
  );
}
