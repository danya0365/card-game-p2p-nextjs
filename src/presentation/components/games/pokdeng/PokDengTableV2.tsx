"use client";

import { PokDengGame } from "@/src/domain/game/PokDengGame";
import type {
  PokDengAction,
  PokDengGameState,
  PokDengPlayer,
} from "@/src/domain/types/pokdeng.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
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
  ChevronDown,
  ChevronUp,
  Coins,
  Crown,
  History,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
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

  // HUD States
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMyCards, setShowMyCards] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

      {/* Top HUD - Room Info */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3">
        <div className="flex items-center justify-between">
          {/* Left: Game Info */}
          <div className="flex items-center gap-3">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-white font-bold">🎴 ป๊อกเดง</span>
              <span className="text-white/70 text-sm">
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
          </div>

          {/* Center: Pot */}
          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-full px-6 py-2 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-lg">
              {gameState.pot}
            </span>
          </div>

          {/* Right: HUD Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 hover:text-white transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 backdrop-blur-sm rounded-lg transition-colors ${
                showHistory
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70 hover:text-white"
              }`}
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 backdrop-blur-sm rounded-lg transition-colors relative ${
                showChat
                  ? "bg-blue-500 text-white"
                  : "bg-black/40 text-white/70 hover:text-white"
              }`}
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
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
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
      <div className="absolute inset-0 flex items-center justify-center pt-20 pb-48">
        {/* Table */}
        <div className="relative w-[90vw] max-w-3xl aspect-[16/10]">
          {/* Table border glow */}
          <div className="absolute inset-0 rounded-[100px] bg-linear-to-b from-yellow-600/30 to-yellow-900/30 blur-xl" />

          {/* Table surface */}
          <div className="absolute inset-2 rounded-[90px] bg-linear-to-b from-green-700 to-green-800 border-4 border-yellow-700/50 shadow-2xl" />

          {/* Table inner line */}
          <div className="absolute inset-8 rounded-[70px] border-2 border-yellow-600/20" />

          {/* Dealer in Center */}
          {dealer && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-linear-to-b from-yellow-500 to-yellow-600 flex items-center justify-center text-3xl shadow-lg border-2 border-yellow-400">
                  {dealer.avatar}
                </div>
                <Crown className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 drop-shadow-lg" />
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

      {/* Chat Panel - Right Side */}
      {showChat && (
        <div className="absolute right-4 top-20 bottom-52 w-80 bg-black/80 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col z-30 animate-in slide-in-from-right duration-200">
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

      {/* History Panel - Left Side */}
      {showHistory && (
        <div className="absolute left-4 top-20 bottom-52 w-80 bg-black/80 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col z-30 animate-in slide-in-from-left duration-200">
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
  // Positions for up to 8 players (excluding dealer in center)
  const positions = [
    { top: "15%", left: "50%" }, // Top center
    { top: "25%", right: "15%" }, // Top right
    { top: "50%", right: "5%" }, // Right
    { top: "75%", right: "15%" }, // Bottom right
    { top: "75%", left: "15%" }, // Bottom left
    { top: "50%", left: "5%" }, // Left
    { top: "25%", left: "15%" }, // Top left
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
