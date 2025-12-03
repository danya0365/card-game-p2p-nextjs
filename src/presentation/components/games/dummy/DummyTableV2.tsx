"use client";

import { DummyGame } from "@/src/domain/game/DummyGame";
import type { Card } from "@/src/domain/types/card.types";
import type {
  DummyActionPayload,
  DummyGameState,
} from "@/src/domain/types/dummy.types";
import {
  CardHand,
  PlayingCard,
} from "@/src/presentation/components/atoms/PlayingCard";
import { SoundSettingsPanel } from "@/src/presentation/components/molecules/SoundSettingsPanel";
import { useSound } from "@/src/presentation/hooks/useSound";
import {
  useDummyStore,
  type GameLogEntry,
} from "@/src/presentation/stores/dummyStore";
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
 * Dummy Game Table V2 - Full Screen Dummy UI
 */
export function DummyTableV2() {
  const {
    gameState,
    initGame,
    syncState,
    startGame,
    drawFromDeck,
    drawFromDiscard,
    discard,
    meld,
    knock,
    selectedCards,
    selectCard,
    deselectCard,
    clearSelection,
    actionLogs,
    _handleGameAction,
  } = useDummyStore();

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
          gameState: DummyGameState;
          actionLogs?: GameLogEntry[];
        };
        syncState(payload.gameState, payload.actionLogs);
      } else if (message.type === "game_action" && isHost) {
        const action = message.payload as DummyActionPayload;
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

  // Auto show result modal when finished
  useEffect(() => {
    if (gameState?.phase === "finished") {
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
      if (gameState.phase === "playing") {
        playGameStart();
      } else if (gameState.phase === "finished") {
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

  // Toggle card selection
  const toggleCardSelection = (card: Card) => {
    const isSelected = selectedCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (isSelected) {
      deselectCard(card);
    } else {
      selectCard(card);
    }
  };

  // Get card display text
  const getCardText = (card: Card): string => {
    const rankText =
      card.rank === 1
        ? "A"
        : card.rank === 11
        ? "J"
        : card.rank === 12
        ? "Q"
        : card.rank === 13
        ? "K"
        : card.rank.toString();
    return rankText;
  };

  // Early return if no game state
  if (!gameState) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-teal-900 to-teal-950 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลดเกม...</div>
      </div>
    );
  }

  // Get my player
  const myPlayer = gameState.players.find((p) => p.oderId === peerId);
  const isMyTurn =
    gameState.players[gameState.currentPlayerIndex]?.oderId === peerId;
  const hasDrawn = myPlayer?.hasDrawn || false;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  // Get action instruction
  const getActionInstruction = (): string => {
    switch (gameState.phase) {
      case "waiting":
        return isHost ? "กด เริ่มเกม" : "รอ Host เริ่มเกม...";
      case "playing":
        if (isMyTurn) {
          if (!hasDrawn) {
            return "จั่วไพ่จากกอง หรือ หยิบจากกองทิ้ง";
          }
          return "วางชุด / ทิ้งไพ่ / เคาะ";
        }
        return `รอ ${
          gameState.players[gameState.currentPlayerIndex]?.displayName
        }...`;
      case "finished":
        return "จบเกม!";
      default:
        return "";
    }
  };

  // Calculate deadwood
  const myDeadwood = myPlayer
    ? new DummyGame().calculateDeadwood({
        ...myPlayer,
        hand: myPlayer.hand,
        melds: [],
        score: 0,
        isKnocker: false,
        hasDrawn: false,
      })
    : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-teal-900 to-teal-950 overflow-hidden">
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

          {/* Center - Game info */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-black/30 rounded-lg text-white text-xs sm:text-sm">
              เกมที่ {gameState.gameNumber || 1}
            </span>
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-teal-500/20 rounded-lg text-teal-400 text-xs sm:text-sm font-bold">
              กอง: {gameState.deck.length}
            </span>
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-orange-500/20 rounded-lg text-orange-400 text-xs sm:text-sm font-bold">
              แต้ม: {myDeadwood}
            </span>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
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
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-teal-600/90 to-teal-500/90 rounded-full text-white font-bold text-sm sm:text-base shadow-lg">
          {getActionInstruction()}
        </div>
      </div>

      {/* Game Table */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 sm:pt-28 pb-72 sm:pb-80">
        <div className="relative w-full max-w-4xl">
          {/* Deck and Discard Pile */}
          <div className="flex justify-center gap-8 mb-8">
            {/* Deck */}
            <div className="flex flex-col items-center">
              <button
                onClick={drawFromDeck}
                disabled={!isMyTurn || hasDrawn}
                className={`p-2 rounded-xl transition-all ${
                  isMyTurn && !hasDrawn
                    ? "bg-blue-500/30 hover:bg-blue-500/50 ring-2 ring-blue-400 cursor-pointer"
                    : "bg-white/5 cursor-not-allowed opacity-50"
                }`}
              >
                <div className="w-16 h-24 sm:w-20 sm:h-28 bg-blue-900 rounded-lg border-2 border-blue-700 flex items-center justify-center">
                  <span className="text-blue-400 text-2xl">🃏</span>
                </div>
              </button>
              <span className="text-white/70 text-sm mt-2">
                กอง ({gameState.deck.length})
              </span>
            </div>

            {/* Discard Pile */}
            <div className="flex flex-col items-center">
              <button
                onClick={drawFromDiscard}
                disabled={!isMyTurn || hasDrawn || !topDiscard}
                className={`p-2 rounded-xl transition-all ${
                  isMyTurn && !hasDrawn && topDiscard
                    ? "bg-green-500/30 hover:bg-green-500/50 ring-2 ring-green-400 cursor-pointer"
                    : "bg-white/5 cursor-not-allowed"
                }`}
              >
                {topDiscard ? (
                  <PlayingCard card={topDiscard} size="md" />
                ) : (
                  <div className="w-16 h-24 sm:w-20 sm:h-28 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                    <span className="text-white/30">ว่าง</span>
                  </div>
                )}
              </button>
              <span className="text-white/70 text-sm mt-2">
                ทิ้ง ({gameState.discardPile.length})
              </span>
            </div>
          </div>

          {/* Melds on table */}
          {gameState.allMelds.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {gameState.allMelds.map((meldItem) => {
                const owner = gameState.players.find(
                  (p) => p.oderId === meldItem.ownerId
                );
                return (
                  <div key={meldItem.id} className="flex flex-col items-center">
                    <CardHand cards={meldItem.cards} size="sm" />
                    <span className="text-white/50 text-xs mt-1">
                      {owner?.displayName} -{" "}
                      {meldItem.type === "set" ? "ตอง" : "เรียง"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Other players */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {gameState.players
              .filter((p) => p.oderId !== peerId)
              .map((player) => {
                const isCurrentTurn =
                  gameState.players[gameState.currentPlayerIndex]?.oderId ===
                  player.oderId;

                return (
                  <div
                    key={player.oderId}
                    className={`flex flex-col items-center p-3 rounded-xl ${
                      isCurrentTurn
                        ? "bg-yellow-500/20 border border-yellow-500/50 animate-pulse"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="relative">
                      <span className="text-3xl">{player.avatar}</span>
                    </div>
                    <p className="text-white text-sm font-medium mt-1">
                      {player.displayName}
                    </p>
                    <p className="text-white/50 text-xs">
                      {player.hand.length} ใบ
                    </p>
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
          ไพ่ของฉัน ({myPlayer?.hand.length || 0})
        </button>

        {/* Panel content */}
        <div
          className={`bg-gradient-to-t from-black/90 to-black/70 backdrop-blur-sm transition-all duration-300 ${
            showMyCards ? "h-auto" : "h-0 overflow-hidden"
          }`}
        >
          <div className="p-4 max-w-4xl mx-auto">
            {/* My Cards */}
            {myPlayer && myPlayer.hand.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap justify-center gap-1">
                  {myPlayer.hand.map((card) => {
                    const isSelected = selectedCards.some(
                      (c) => c.suit === card.suit && c.rank === card.rank
                    );
                    return (
                      <button
                        key={`${card.suit}-${card.rank}`}
                        onClick={() => toggleCardSelection(card)}
                        className={`transition-transform ${
                          isSelected ? "-translate-y-4" : ""
                        } hover:-translate-y-2`}
                      >
                        <PlayingCard card={card} size="md" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              {/* Waiting phase - Host starts game */}
              {gameState.phase === "waiting" && isHost && (
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                >
                  🎮 เริ่มเกม
                </button>
              )}

              {/* Playing phase actions */}
              {gameState.phase === "playing" && isMyTurn && myPlayer && (
                <>
                  {/* After drawing */}
                  {hasDrawn && (
                    <>
                      {/* Meld */}
                      {selectedCards.length >= 3 && (
                        <button
                          onClick={meld}
                          className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-colors"
                        >
                          ✨ วางชุด ({selectedCards.length})
                        </button>
                      )}

                      {/* Discard */}
                      {selectedCards.length === 1 && (
                        <button
                          onClick={() => discard(selectedCards[0])}
                          className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors"
                        >
                          🃏 ทิ้ง
                        </button>
                      )}

                      {/* Knock */}
                      {myDeadwood <= 10 && (
                        <button
                          onClick={knock}
                          className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-white font-bold transition-colors"
                        >
                          🔔 เคาะ ({myDeadwood} แต้ม)
                        </button>
                      )}

                      {selectedCards.length > 0 && (
                        <button
                          onClick={clearSelection}
                          className="px-4 py-3 rounded-xl bg-gray-500/20 hover:bg-gray-500/40 text-gray-400 font-bold transition-colors"
                        >
                          ✖ ยกเลิก
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Finished phase */}
              {gameState.phase === "finished" && isHost && (
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                >
                  🎮 เกมใหม่
                </button>
              )}
            </div>

            {/* Selected cards preview */}
            {selectedCards.length > 0 && (
              <div className="mt-3 text-center text-white/70 text-sm">
                เลือกแล้ว: {selectedCards.map((c) => getCardText(c)).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panels - Chat */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-48 sm:bottom-56 right-2 sm:right-4 z-30 p-2 sm:p-3 bg-blue-500 rounded-full shadow-lg"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {showChat && (
        <div className="fixed bottom-0 sm:bottom-56 right-0 sm:right-4 w-full sm:w-80 h-1/2 sm:h-80 bg-black/90 sm:rounded-xl border border-white/10 z-40 flex flex-col">
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
        className="fixed bottom-48 sm:bottom-56 left-2 sm:left-4 z-30 p-2 sm:p-3 bg-purple-500 rounded-full shadow-lg"
      >
        <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {showHistory && (
        <div className="fixed bottom-0 sm:bottom-56 left-0 sm:left-4 w-full sm:w-80 h-1/2 sm:h-80 bg-black/90 sm:rounded-xl border border-white/10 z-40 flex flex-col">
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
              <Users className="w-5 h-5" /> ผู้เล่น ({gameState.players.length})
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
                  <p className="text-white font-medium flex items-center gap-1">
                    {player.displayName}
                    {player.oderId === gameState.winnerId && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </p>
                  <p className="text-xs text-white/50">
                    {player.hand.length} ใบในมือ
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
              <HelpCircle className="w-5 h-5" /> วิธีเล่นดัมมี่
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
              <p>จับคู่ไพ่เป็นชุดและลดแต้มในมือให้น้อยที่สุด</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🃏 ชุดไพ่ที่วางได้</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>ตอง (Set)</strong> - 3-4 ใบหน้าเหมือนกัน ต่างสี
                </li>
                <li>
                  <strong>เรียง (Run)</strong> - 3+ ใบเรียงกัน สีเดียว
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🎮 วิธีเล่น</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>จั่วไพ่จากกอง หรือ หยิบจากกองทิ้ง</li>
                <li>วางชุดไพ่ (ถ้ามี)</li>
                <li>ทิ้งไพ่ 1 ใบ</li>
                <li>เคาะได้เมื่อแต้มไม่เกิน 10</li>
              </ol>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">💰 การคิดแต้ม</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>A = 15 แต้ม</li>
                <li>2-9 = 5 แต้ม</li>
                <li>10, J, Q, K = 10 แต้ม</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showResult && gameState.phase === "finished" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                🏆 จบเกมที่ {gameState.gameNumber}
              </h2>
            </div>

            {/* Players Results */}
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {gameState.players
                .sort((a, b) => a.score - b.score)
                .map((player) => {
                  const isMe = player.oderId === peerId;
                  const isWinner = player.oderId === gameState.winnerId;

                  return (
                    <div
                      key={player.oderId}
                      className={`p-3 rounded-xl ${
                        isWinner
                          ? "bg-yellow-500/20 border border-yellow-500/50"
                          : isMe
                          ? "bg-blue-500/20 border border-blue-500/50"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{player.avatar}</div>
                          <div>
                            <p className="text-white font-medium flex items-center gap-1">
                              {player.displayName}
                              {isMe && (
                                <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded">
                                  คุณ
                                </span>
                              )}
                              {isWinner && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-lg font-bold ${
                            isWinner ? "text-yellow-400" : "text-white/70"
                          }`}
                        >
                          {player.score} แต้ม
                        </span>
                      </div>
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
                    startGame();
                  }}
                  className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-colors"
                >
                  🎮 เกมใหม่
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
                    รอ Host เริ่มเกมใหม่...
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
