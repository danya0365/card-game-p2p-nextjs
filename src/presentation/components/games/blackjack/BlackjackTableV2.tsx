"use client";

import { BlackjackGame } from "@/src/domain/game/BlackjackGame";
import type {
  BlackjackActionPayload,
  BlackjackGameState,
} from "@/src/domain/types/blackjack.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
import { SoundSettingsPanel } from "@/src/presentation/components/molecules/SoundSettingsPanel";
import { useSound } from "@/src/presentation/hooks/useSound";
import {
  useBlackjackStore,
  type GameLogEntry,
} from "@/src/presentation/stores/blackjackStore";
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
 * Blackjack Game Table V2 - Full Screen Game UI
 */
export function BlackjackTableV2() {
  const {
    gameState,
    initGame,
    syncState,
    startRound,
    placeBet,
    hit,
    stand,
    double,
    split,
    surrender,
    selectedBet,
    setSelectedBet,
    actionLogs,
    _handleGameAction,
  } = useBlackjackStore();

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
          gameState: BlackjackGameState;
          actionLogs?: GameLogEntry[];
        };
        syncState(payload.gameState, payload.actionLogs);
      } else if (message.type === "game_action" && isHost) {
        const action = message.payload as BlackjackActionPayload;
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

    setChatMessages((prev) => [...prev, chatMessage].slice(-100));

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
  const betOptions = [10, 25, 50, 100, 200, 500];

  // Early return if no game state
  if (!gameState) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลดเกม...</div>
      </div>
    );
  }

  // Get my player
  const myPlayer = gameState.players.find((p) => p.oderId === peerId);
  const isMyTurn =
    gameState.phase === "player_turn" &&
    gameState.players[gameState.currentPlayerIndex]?.oderId === peerId;

  // Calculate hand value helper
  const calcValue = (cards: typeof gameState.dealer.hand) => {
    return new BlackjackGame().calculateHandValue.call(
      { calculateHandValue: BlackjackGame.prototype.calculateHandValue },
      cards
    );
  };

  // Get action instruction
  const getActionInstruction = (): string => {
    switch (gameState.phase) {
      case "waiting":
        return isHost ? "กด 'เริ่มรอบใหม่'" : "รอ Host เริ่มเกม...";
      case "betting":
        if (myPlayer?.hands.length && myPlayer.hands[0]?.bet > 0)
          return "รอผู้เล่นอื่น...";
        return "วางเดิมพัน";
      case "dealing":
        return "กำลังแจกไพ่...";
      case "player_turn":
        if (isMyTurn) return "ตาคุณ! Hit, Stand, Double หรือ Surrender";
        return `รอ ${
          gameState.players[gameState.currentPlayerIndex]?.displayName
        }...`;
      case "dealer_turn":
        return "ตาเจ้ามือ...";
      case "settling":
        return "สรุปผล";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-green-900 to-green-950 overflow-hidden">
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
            <span className="hidden sm:inline-flex px-3 py-1.5 bg-green-500/20 rounded-lg text-green-400 text-sm">
              🃏 Blackjack
            </span>
          </div>

          {/* Right side - Balance and actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-yellow-500/20 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm sm:text-base">
                1000
              </span>
            </div>

            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            </button>
            <button
              onClick={() => {
                playClick();
                setShowSoundSettings(true);
              }}
              className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="hidden sm:block p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-10">
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600/90 to-green-500/90 rounded-full text-white font-bold text-sm sm:text-base shadow-lg">
          {getActionInstruction()}
        </div>
      </div>

      {/* Game Table */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 sm:pt-28 pb-48 sm:pb-56">
        <div className="relative w-full max-w-4xl aspect-4/3 sm:aspect-16/10 bg-gradient-to-b from-green-700 to-green-800 rounded-3xl border-8 border-green-900 shadow-2xl">
          {/* Table felt pattern */}
          <div className="absolute inset-4 rounded-2xl bg-green-600/30 border border-green-500/20" />

          {/* Dealer Position (Top Center) */}
          <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-500 flex items-center justify-center text-2xl sm:text-3xl border-2 border-yellow-400 shadow-lg">
              🎰
              <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300" />
            </div>
            <p className="text-white font-medium text-sm sm:text-base mt-1">
              Dealer
            </p>

            {/* Dealer cards */}
            {gameState.dealer.hand.length > 0 && (
              <div className="mt-2 flex gap-1">
                {gameState.dealer.isHoleCardRevealed ? (
                  <CardHand cards={gameState.dealer.hand} size="sm" />
                ) : (
                  <>
                    <CardHand cards={[gameState.dealer.hand[0]]} size="sm" />
                    <div className="w-12 h-16 sm:w-14 sm:h-20 bg-blue-600 rounded-lg border-2 border-white/20 flex items-center justify-center">
                      <span className="text-white text-2xl">?</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Dealer value */}
            {gameState.dealer.hand.length > 0 &&
              gameState.dealer.isHoleCardRevealed && (
                <div className="mt-1 px-3 py-1 bg-black/50 rounded-full text-white text-sm font-bold">
                  {calcValue(gameState.dealer.hand)}
                  {calcValue(gameState.dealer.hand) > 21 && " BUST!"}
                </div>
              )}
          </div>

          {/* Player Positions (Bottom) */}
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-4 sm:gap-8">
            {gameState.players.map((player, index) => {
              const isMe = player.oderId === peerId;
              const isCurrentTurn =
                gameState.phase === "player_turn" &&
                gameState.currentPlayerIndex === index;
              const hand = player.hands[0];
              const handValue = hand ? calcValue(hand.cards) : 0;

              return (
                <div
                  key={player.oderId}
                  className={`flex flex-col items-center ${
                    isCurrentTurn ? "animate-pulse" : ""
                  }`}
                >
                  {/* Player cards */}
                  {hand && hand.cards.length > 0 && (
                    <div className="mb-2 scale-75 sm:scale-90">
                      <CardHand cards={hand.cards} size="sm" />
                    </div>
                  )}

                  {/* Hand value */}
                  {hand && hand.cards.length > 0 && (
                    <div
                      className={`mb-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        hand.isBust
                          ? "bg-red-500 text-white"
                          : hand.isBlackjack
                          ? "bg-yellow-500 text-black"
                          : "bg-black/50 text-white"
                      }`}
                    >
                      {hand.isBlackjack
                        ? "BLACKJACK!"
                        : hand.isBust
                        ? "BUST!"
                        : handValue}
                    </div>
                  )}

                  {/* Avatar */}
                  <div
                    className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg border-2 ${
                      isCurrentTurn
                        ? "border-yellow-400 bg-yellow-500/20"
                        : isMe
                        ? "border-blue-400 bg-blue-500/20"
                        : "border-white/30 bg-black/30"
                    }`}
                  >
                    {player.avatar}
                  </div>

                  {/* Name & Bet */}
                  <p className="text-white font-medium text-xs mt-1">
                    {player.displayName}
                    {isMe && " (คุณ)"}
                  </p>
                  {hand && hand.bet > 0 && (
                    <span className="text-yellow-400 text-xs">
                      💰 {hand.bet}
                    </span>
                  )}

                  {/* Result */}
                  {hand?.result && (
                    <span
                      className={`text-xs font-bold mt-1 px-2 py-0.5 rounded ${
                        hand.payout > 0
                          ? "bg-green-500 text-white"
                          : hand.payout < 0
                          ? "bg-red-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {BlackjackGame.getResultDescription(hand.result)}
                      {hand.payout !== 0 &&
                        ` (${hand.payout > 0 ? "+" : ""}${hand.payout})`}
                    </span>
                  )}
                </div>
              );
            })}
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
          ควบคุม
        </button>

        {/* Panel content */}
        <div
          className={`bg-gradient-to-t from-black/90 to-black/70 backdrop-blur-sm transition-all duration-300 ${
            showMyCards ? "h-auto" : "h-0 overflow-hidden"
          }`}
        >
          <div className="p-4 max-w-2xl mx-auto">
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
                (!myPlayer?.hands.length || myPlayer.hands[0]?.bet === 0) && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap gap-2 justify-center">
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

              {/* Player turn actions */}
              {gameState.phase === "player_turn" && isMyTurn && myPlayer && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={hit}
                    className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-colors"
                  >
                    🃏 Hit
                  </button>
                  <button
                    onClick={stand}
                    className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors"
                  >
                    ✋ Stand
                  </button>
                  {myPlayer.hands[0]?.cards.length === 2 && (
                    <>
                      <button
                        onClick={double}
                        className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-colors"
                      >
                        💎 Double
                      </button>
                      {myPlayer.hands[0].cards[0].rank ===
                        myPlayer.hands[0].cards[1].rank && (
                        <button
                          onClick={split}
                          className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold transition-colors"
                        >
                          ✂️ Split
                        </button>
                      )}
                      <button
                        onClick={surrender}
                        className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold transition-colors"
                      >
                        🏳️ Surrender
                      </button>
                    </>
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

      {/* Side Panels - Chat */}
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
                    เดิมพัน: {player.totalBet || 0}
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
              <HelpCircle className="w-5 h-5" /> วิธีเล่น Blackjack
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
              <p>ทำแต้มให้ใกล้ 21 มากที่สุด โดยไม่เกิน 21</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🃏 ค่าไพ่</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>A = 1 หรือ 11 (ระบบเลือกให้อัตโนมัติ)</li>
                <li>2-10 = ตามหน้าไพ่</li>
                <li>J, Q, K = 10</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🎮 Actions</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="text-blue-400">Hit</span> - จั่วไพ่เพิ่ม
                </li>
                <li>
                  <span className="text-yellow-400">Stand</span> - หยุดจั่ว
                </li>
                <li>
                  <span className="text-purple-400">Double</span> - ดับเบิ้ล
                  (จั่ว 1 ใบ เดิมพัน x2)
                </li>
                <li>
                  <span className="text-pink-400">Split</span> - แยกไพ่ (ถ้า 2
                  ใบเท่ากัน)
                </li>
                <li>
                  <span className="text-red-400">Surrender</span> - ยอมแพ้
                  (เสียครึ่งเดิมพัน)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">💰 การจ่าย</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Blackjack (A + 10/J/Q/K) = 3:2</li>
                <li>ชนะ = 1:1</li>
                <li>เสมอ (Push) = คืนเดิมพัน</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showResult && gameState.phase === "settling" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                🏆 สรุปผลรอบที่ {gameState.roundNumber}
              </h2>
            </div>

            {/* Dealer Result */}
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-2xl border-2 border-yellow-400">
                    🎰
                  </div>
                  <div>
                    <p className="text-white font-bold flex items-center gap-1">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      Dealer
                    </p>
                    <p className="text-yellow-400 text-sm">เจ้ามือ</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">
                    {calcValue(gameState.dealer.hand)} แต้ม
                  </p>
                  {calcValue(gameState.dealer.hand) > 21 && (
                    <p className="text-red-400 text-sm">BUST!</p>
                  )}
                </div>
              </div>
              {gameState.dealer.hand.length > 0 && (
                <div className="mt-3 flex justify-center">
                  <CardHand cards={gameState.dealer.hand} size="sm" />
                </div>
              )}
            </div>

            {/* Players Results */}
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {gameState.players.map((player) => {
                const isMe = player.oderId === peerId;
                const hand = player.hands[0];
                const won = hand && hand.payout > 0;
                const lost = hand && hand.payout < 0;

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
                            {hand
                              ? `${calcValue(hand.cards)} แต้ม`
                              : "ไม่ได้เล่น"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {hand?.result && (
                          <>
                            <p
                              className={`font-bold ${
                                won
                                  ? "text-green-400"
                                  : lost
                                  ? "text-red-400"
                                  : "text-white/50"
                              }`}
                            >
                              {BlackjackGame.getResultDescription(hand.result)}
                            </p>
                            {hand.payout !== 0 && (
                              <p
                                className={`text-lg font-bold ${
                                  hand.payout > 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {hand.payout > 0 ? "+" : ""}
                                {hand.payout}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {hand && hand.cards.length > 0 && (
                      <div className="mt-2 flex justify-center scale-75 origin-center">
                        <CardHand cards={hand.cards} size="sm" />
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
