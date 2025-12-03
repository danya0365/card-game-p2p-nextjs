"use client";

import { PokerGame } from "@/src/domain/game/PokerGame";
import type {
  PokerActionPayload,
  PokerGameState,
} from "@/src/domain/types/poker.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
import { SoundSettingsPanel } from "@/src/presentation/components/molecules/SoundSettingsPanel";
import { useSound } from "@/src/presentation/hooks/useSound";
import {
  createP2PMessage,
  usePeerStore,
} from "@/src/presentation/stores/peerStore";
import {
  usePokerStore,
  type GameLogEntry,
} from "@/src/presentation/stores/pokerStore";
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
 * Poker Game Table V2 - Full Screen Texas Hold'em UI
 */
export function PokerTableV2() {
  const {
    gameState,
    initGame,
    syncState,
    startHand,
    fold,
    check,
    call,
    raise,
    allIn,
    raiseAmount,
    setRaiseAmount,
    actionLogs,
    _handleGameAction,
  } = usePokerStore();

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
          gameState: PokerGameState;
          actionLogs?: GameLogEntry[];
        };
        syncState(payload.gameState, payload.actionLogs);
      } else if (message.type === "game_action" && isHost) {
        const action = message.payload as PokerActionPayload;
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
      if (gameState.phase === "preflop") {
        playGameStart();
      } else if (gameState.phase === "showdown") {
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
    gameState.players[gameState.currentPlayerIndex]?.oderId === peerId;
  const canCheck = myPlayer && myPlayer.currentBet >= gameState.currentBet;
  const callAmount = gameState.currentBet - (myPlayer?.currentBet || 0);

  // Get action instruction
  const getActionInstruction = (): string => {
    switch (gameState.phase) {
      case "waiting":
        return isHost ? "กด 'เริ่มมือใหม่'" : "รอ Host เริ่มเกม...";
      case "preflop":
      case "flop":
      case "turn":
      case "river":
        if (isMyTurn) {
          if (canCheck) return "ตาคุณ! Check, Raise หรือ Fold";
          return `ตาคุณ! Call ${callAmount}, Raise หรือ Fold`;
        }
        return `รอ ${
          gameState.players[gameState.currentPlayerIndex]?.displayName
        }...`;
      case "showdown":
        return "Showdown! เปิดไพ่";
      case "settling":
        return "สรุปผล";
      default:
        return "";
    }
  };

  // Get phase name
  const getPhaseName = (): string => {
    switch (gameState.phase) {
      case "preflop":
        return "Pre-Flop";
      case "flop":
        return "Flop";
      case "turn":
        return "Turn";
      case "river":
        return "River";
      case "showdown":
        return "Showdown";
      default:
        return gameState.phase;
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

          {/* Center - Round and Phase info */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-black/30 rounded-lg text-white text-xs sm:text-sm">
              มือที่ {gameState.roundNumber || 1}
            </span>
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-amber-500/20 rounded-lg text-amber-400 text-xs sm:text-sm font-bold">
              {getPhaseName()}
            </span>
            <span className="hidden sm:inline-flex px-3 py-1.5 bg-yellow-500/20 rounded-lg text-yellow-400 text-sm">
              💰 Pot: {gameState.pot}
            </span>
          </div>

          {/* Right side - Chips and actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-yellow-500/20 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm sm:text-base">
                {myPlayer?.chips || 0}
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
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-600/90 to-amber-500/90 rounded-full text-white font-bold text-sm sm:text-base shadow-lg">
          {getActionInstruction()}
        </div>
      </div>

      {/* Game Table */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 sm:pt-28 pb-48 sm:pb-56">
        <div className="relative w-full max-w-4xl aspect-4/3 sm:aspect-16/10 bg-gradient-to-b from-green-700 to-green-800 rounded-[50%] border-8 border-amber-900 shadow-2xl">
          {/* Table felt pattern */}
          <div className="absolute inset-8 rounded-[50%] bg-green-600/30 border border-green-500/20" />

          {/* Pot Display (Center) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            {/* Community Cards */}
            {gameState.communityCards.length > 0 && (
              <div className="flex gap-1 mb-2">
                <CardHand cards={gameState.communityCards} size="sm" />
              </div>
            )}

            {/* Pot */}
            <div className="px-4 py-2 bg-black/50 rounded-full text-yellow-400 font-bold text-lg">
              💰 {gameState.pot}
            </div>
          </div>

          {/* Player Positions (arranged in oval) */}
          {gameState.players.map((player, index) => {
            const isMe = player.oderId === peerId;
            const isCurrentTurn = gameState.currentPlayerIndex === index;
            const isDealer = gameState.dealerIndex === index;

            // Calculate position around oval table
            const totalPlayers = gameState.players.length;
            const angle = (index / totalPlayers) * 2 * Math.PI - Math.PI / 2;
            const radiusX = 40; // % of width
            const radiusY = 35; // % of height
            const left = 50 + radiusX * Math.cos(angle);
            const top = 50 + radiusY * Math.sin(angle);

            return (
              <div
                key={player.oderId}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
                  isCurrentTurn ? "animate-pulse" : ""
                }`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {/* Player cards (only show mine or on showdown) */}
                {player.holeCards.length > 0 &&
                  (isMe ||
                    gameState.phase === "showdown" ||
                    gameState.phase === "settling") && (
                    <div className="mb-1 scale-50 sm:scale-75">
                      <CardHand cards={player.holeCards} size="sm" />
                    </div>
                  )}

                {/* Hidden cards for other players */}
                {player.holeCards.length > 0 &&
                  !isMe &&
                  gameState.phase !== "showdown" &&
                  gameState.phase !== "settling" && (
                    <div className="mb-1 flex gap-0.5">
                      <div className="w-8 h-11 sm:w-10 sm:h-14 bg-blue-600 rounded border border-white/20" />
                      <div className="w-8 h-11 sm:w-10 sm:h-14 bg-blue-600 rounded border border-white/20" />
                    </div>
                  )}

                {/* Avatar */}
                <div
                  className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg border-2 ${
                    player.isFolded
                      ? "border-gray-500 bg-gray-700/50 opacity-50"
                      : isCurrentTurn
                      ? "border-yellow-400 bg-yellow-500/20"
                      : isMe
                      ? "border-blue-400 bg-blue-500/20"
                      : "border-white/30 bg-black/30"
                  }`}
                >
                  {player.avatar}
                  {isDealer && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                      D
                    </div>
                  )}
                  {player.isAllIn && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 rounded text-[8px] text-white font-bold">
                      ALL IN
                    </div>
                  )}
                </div>

                {/* Name & Chips */}
                <p
                  className={`text-xs mt-1 font-medium ${
                    player.isFolded ? "text-gray-500" : "text-white"
                  }`}
                >
                  {player.displayName}
                  {isMe && " (คุณ)"}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-yellow-400">💰{player.chips}</span>
                  {player.currentBet > 0 && (
                    <span className="text-green-400">+{player.currentBet}</span>
                  )}
                </div>

                {/* Hand Result */}
                {player.result &&
                  (gameState.phase === "showdown" ||
                    gameState.phase === "settling") && (
                    <span className="text-xs bg-purple-500/80 px-2 py-0.5 rounded text-white mt-1">
                      {PokerGame.getHandRankName(player.result.rank)}
                    </span>
                  )}

                {/* Win amount */}
                {player.winAmount > 0 && (
                  <span className="text-sm font-bold text-green-400 mt-1">
                    +{player.winAmount}
                  </span>
                )}
              </div>
            );
          })}
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
              {/* Waiting phase - Host starts hand */}
              {(gameState.phase === "waiting" ||
                gameState.phase === "finished") &&
                isHost && (
                  <button
                    onClick={startHand}
                    className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                  >
                    🃏 เริ่มมือใหม่
                  </button>
                )}

              {/* Player turn actions */}
              {["preflop", "flop", "turn", "river"].includes(gameState.phase) &&
                isMyTurn &&
                myPlayer &&
                !myPlayer.isFolded &&
                !myPlayer.isAllIn && (
                  <div className="flex flex-col items-center gap-3">
                    {/* Main actions */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={fold}
                        className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold transition-colors"
                      >
                        🏳️ Fold
                      </button>

                      {canCheck ? (
                        <button
                          onClick={check}
                          className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-colors"
                        >
                          ✔️ Check
                        </button>
                      ) : (
                        <button
                          onClick={call}
                          className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-colors"
                        >
                          📞 Call {callAmount}
                        </button>
                      )}

                      <button
                        onClick={() => raise(raiseAmount)}
                        disabled={myPlayer.chips < raiseAmount + callAmount}
                        className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⬆️ Raise {raiseAmount}
                      </button>

                      <button
                        onClick={allIn}
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors"
                      >
                        🔥 ALL IN
                      </button>
                    </div>

                    {/* Raise slider */}
                    <div className="flex items-center gap-3 w-full max-w-md">
                      <span className="text-white text-sm">Raise:</span>
                      <input
                        type="range"
                        min={gameState.minRaise}
                        max={myPlayer.chips - callAmount}
                        value={raiseAmount}
                        onChange={(e) =>
                          setRaiseAmount(parseInt(e.target.value))
                        }
                        className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        value={raiseAmount}
                        onChange={(e) =>
                          setRaiseAmount(
                            parseInt(e.target.value) || gameState.minRaise
                          )
                        }
                        className="w-20 px-2 py-1 bg-white/10 rounded text-white text-center"
                      />
                    </div>
                  </div>
                )}

              {/* Settling phase */}
              {gameState.phase === "settling" && isHost && (
                <button
                  onClick={startHand}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
                >
                  🃏 มือถัดไป
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
            {gameState.players.map((player, idx) => (
              <div
                key={player.oderId}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
              >
                <span className="text-2xl">{player.avatar}</span>
                <div className="flex-1">
                  <p className="text-white font-medium flex items-center gap-1">
                    {player.displayName}
                    {gameState.dealerIndex === idx && (
                      <span className="text-xs bg-yellow-500 text-black px-1 rounded">
                        D
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-yellow-400">💰 {player.chips}</p>
                </div>
                {player.oderId === peerId && (
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded text-white">
                    คุณ
                  </span>
                )}
                {player.isFolded && (
                  <span className="text-xs text-gray-400">Folded</span>
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
              <HelpCircle className="w-5 h-5" /> วิธีเล่น Texas Hold&apos;em
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
              <p>สร้างมือไพ่ 5 ใบที่ดีที่สุดจากไพ่ในมือ 2 ใบ + ไพ่กลาง 5 ใบ</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🎮 ขั้นตอนการเล่น</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Pre-Flop: แจกไพ่ 2 ใบ</li>
                <li>Flop: เปิดไพ่กลาง 3 ใบ</li>
                <li>Turn: เปิดไพ่กลางใบที่ 4</li>
                <li>River: เปิดไพ่กลางใบที่ 5</li>
                <li>Showdown: เปิดไพ่ ประกาศผู้ชนะ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">🃏 อันดับมือไพ่</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Royal Flush - A K Q J 10 สีเดียวกัน</li>
                <li>Straight Flush - 5 ใบเรียงสีเดียว</li>
                <li>Four of a Kind - 4 ใบเหมือน</li>
                <li>Full House - 3 ใบ + 2 ใบ</li>
                <li>Flush - 5 ใบสีเดียว</li>
                <li>Straight - 5 ใบเรียง</li>
                <li>Three of a Kind - ตอง</li>
                <li>Two Pair - 2 คู่</li>
                <li>One Pair - 1 คู่</li>
                <li>High Card - ไพ่สูงสุด</li>
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
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4 text-center">
              <h2 className="text-2xl font-bold text-white">
                🏆 สรุปผลมือที่ {gameState.roundNumber}
              </h2>
            </div>

            {/* Community Cards */}
            {gameState.communityCards.length > 0 && (
              <div className="p-4 border-b border-white/10 bg-black/20 flex justify-center">
                <CardHand cards={gameState.communityCards} size="sm" />
              </div>
            )}

            {/* Players Results */}
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {gameState.players
                .filter((p) => !p.isFolded)
                .sort((a, b) => b.winAmount - a.winAmount)
                .map((player) => {
                  const isMe = player.oderId === peerId;
                  const won = player.winAmount > 0;

                  return (
                    <div
                      key={player.oderId}
                      className={`p-3 rounded-xl ${
                        won
                          ? "bg-green-500/20 border border-green-500/50"
                          : isMe
                          ? "bg-blue-500/20 border border-blue-500/50"
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
                              {won && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                            </p>
                            {player.result && (
                              <p className="text-purple-400 text-xs">
                                {player.result.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {won && (
                            <p className="text-lg font-bold text-green-400">
                              +{player.winAmount}
                            </p>
                          )}
                          <p className="text-xs text-yellow-400">
                            💰 {player.chips}
                          </p>
                        </div>
                      </div>
                      {player.holeCards.length > 0 && (
                        <div className="mt-2 flex justify-center scale-75 origin-center">
                          <CardHand cards={player.holeCards} size="sm" />
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
                    startHand();
                  }}
                  className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-colors"
                >
                  🃏 เริ่มมือถัดไป
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
                    รอ Host เริ่มมือถัดไป...
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
