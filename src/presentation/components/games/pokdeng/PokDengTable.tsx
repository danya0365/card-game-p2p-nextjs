"use client";

import { PokDengGame } from "@/src/domain/game/PokDengGame";
import type {
  PokDengAction,
  PokDengGameState,
  PokDengPlayer,
} from "@/src/domain/types/pokdeng.types";
import { CardHand } from "@/src/presentation/components/atoms/PlayingCard";
import { usePeerStore } from "@/src/presentation/stores/peerStore";
import {
  usePokDengStore,
  type GameLogEntry,
} from "@/src/presentation/stores/pokdengStore";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { Coins, Crown, Info, ScrollText } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Pok Deng game table component
 */
export function PokDengTable() {
  const { peerId } = usePeerStore();
  const { isHost, room } = useRoomStore();
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

  // Initialize game
  useEffect(() => {
    if (room && !gameState) {
      initGame();
    }
  }, [room, gameState, initGame]);

  // Listen for game state updates
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
      }
    });

    return unsubscribe;
  }, [isHost, syncState]);

  if (!gameState) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎴</div>
          <p className="text-muted">กำลังโหลดเกม...</p>
        </div>
      </div>
    );
  }

  const myPlayer = getCurrentPlayer();
  const dealer = gameState.players.find((p) => p.isDealer);
  const otherPlayers = gameState.players.filter((p) => p.oderId !== peerId);
  const iAmDealer = amIDealer();
  const myTurn = isMyTurn();

  // Bet options
  const betOptions = [10, 20, 50, 100];

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Game header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">🎴 ป๊อกเดง</h1>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-muted">รอบที่ {gameState.roundNumber}</span>
          <span className="text-muted">•</span>
          <span className={`font-medium ${getPhaseColor(gameState.phase)}`}>
            {getPhaseText(gameState.phase)}
          </span>
        </div>
      </div>

      {/* Current Action Instruction */}
      <CurrentActionBanner
        phase={gameState.phase}
        isHost={isHost}
        isDealer={iAmDealer}
        isMyTurn={myTurn}
        myBet={myPlayer?.bet || 0}
        hasDrawn={myPlayer?.hasDrawn || false}
      />

      {/* Other players */}
      <div className="flex justify-center gap-4 mb-8 flex-wrap">
        {otherPlayers.map((player) => (
          <PlayerSlot
            key={player.oderId}
            player={player}
            isCurrentTurn={
              gameState.players[gameState.currentPlayerIndex]?.oderId ===
              player.oderId
            }
            showCards={
              gameState.phase === "revealing" || gameState.phase === "settling"
            }
          />
        ))}
      </div>

      {/* Center area - Pot and dealer */}
      <div className="bg-green-800 rounded-xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-green-700 to-green-900 opacity-50" />

        <div className="relative z-10">
          {/* Pot */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">{gameState.pot}</span>
            </div>
          </div>

          {/* Dealer area */}
          {dealer && (
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">
                <Crown className="w-4 h-4 inline mr-1 text-yellow-400" />
                เจ้ามือ: {dealer.displayName}
              </p>
              {dealer.hand.length > 0 && (
                <div className="flex justify-center">
                  <CardHand
                    cards={dealer.hand}
                    faceDown={
                      gameState.phase !== "revealing" &&
                      gameState.phase !== "settling"
                    }
                    size="md"
                  />
                </div>
              )}
              {dealer.result &&
                (gameState.phase === "revealing" ||
                  gameState.phase === "settling") && (
                  <div className="mt-2 text-white">
                    <span className="text-lg font-bold">
                      {dealer.result.points} แต้ม
                    </span>
                    <span className="text-sm ml-2 text-yellow-400">
                      {PokDengGame.getHandTypeName(dealer.result.handType)}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* My player area */}
      {myPlayer && (
        <div
          className={`bg-surface border-2 ${
            myTurn ? "border-yellow-400" : "border-border"
          } rounded-xl p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{myPlayer.avatar}</span>
              <div>
                <p className="font-medium text-foreground">
                  {myPlayer.displayName}
                </p>
                <p className="text-sm text-muted">
                  {iAmDealer ? "เจ้ามือ" : `เดิมพัน: ${myPlayer.bet || "-"}`}
                </p>
              </div>
            </div>
            {myPlayer.payout !== 0 && gameState.phase === "settling" && (
              <div
                className={`text-lg font-bold ${
                  myPlayer.payout > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {myPlayer.payout > 0 ? `+${myPlayer.payout}` : myPlayer.payout}
              </div>
            )}
          </div>

          {/* My cards */}
          {myPlayer.hand.length > 0 && (
            <div className="flex justify-center mb-4">
              <CardHand cards={myPlayer.hand} size="lg" />
            </div>
          )}

          {/* My result */}
          {myPlayer.result && (
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-foreground">
                {myPlayer.result.points} แต้ม
              </span>
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-sm">
                {PokDengGame.getHandTypeName(myPlayer.result.handType)}
              </span>
              {myPlayer.result.multiplier > 1 && (
                <span className="ml-2 text-green-500">
                  x{myPlayer.result.multiplier}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4">
            {/* Waiting phase - Host starts round */}
            {gameState.phase === "waiting" && isHost && (
              <button
                onClick={startRound}
                className="w-full py-3 rounded-xl bg-success hover:bg-success-dark text-white font-semibold transition-colors"
              >
                เริ่มรอบใหม่
              </button>
            )}

            {/* Betting phase */}
            {gameState.phase === "betting" &&
              !iAmDealer &&
              myPlayer.bet === 0 && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {betOptions.map((bet) => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedBet === bet
                            ? "bg-yellow-500 text-black"
                            : "bg-muted-light text-foreground hover:bg-muted-light/80"
                        }`}
                      >
                        {bet}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => placeBet(selectedBet)}
                    className="w-full py-3 rounded-xl bg-success hover:bg-success-dark text-white font-semibold transition-colors"
                  >
                    เดิมพัน {selectedBet}
                  </button>
                </div>
              )}

            {/* Playing phase */}
            {gameState.phase === "playing" && myTurn && !myPlayer.hasDrawn && (
              <div className="flex gap-4">
                <button
                  onClick={drawCard}
                  disabled={myPlayer.hand.length >= 3}
                  className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  จั่วไพ่
                </button>
                <button
                  onClick={stay}
                  className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white font-semibold transition-colors"
                >
                  พอ
                </button>
                <button
                  onClick={fold}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
                >
                  หมอบ
                </button>
              </div>
            )}

            {/* Settling phase - Host starts next round */}
            {(gameState.phase === "settling" ||
              gameState.phase === "finished") &&
              isHost && (
                <button
                  onClick={() => {
                    if (gameState.phase === "settling") {
                      nextRound();
                    }
                    startRound();
                  }}
                  className="w-full py-3 rounded-xl bg-success hover:bg-success-dark text-white font-semibold transition-colors"
                >
                  รอบถัดไป
                </button>
              )}

            {/* Waiting for turn */}
            {gameState.phase === "playing" && !myTurn && !myPlayer.hasDrawn && (
              <p className="text-center text-muted">รอผู้เล่นคนอื่น...</p>
            )}
          </div>
        </div>
      )}

      {/* Action History */}
      <ActionHistory logs={actionLogs} />
    </div>
  );
}

/**
 * Player slot component
 */
function PlayerSlot({
  player,
  isCurrentTurn,
  showCards,
}: {
  player: PokDengPlayer;
  isCurrentTurn: boolean;
  showCards: boolean;
}) {
  return (
    <div
      className={`bg-surface border-2 ${
        isCurrentTurn ? "border-yellow-400" : "border-border"
      } rounded-xl p-4 min-w-[140px]`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{player.avatar}</span>
        <div>
          <p className="font-medium text-foreground text-sm">
            {player.displayName}
          </p>
          {player.isDealer ? (
            <p className="text-xs text-yellow-500">
              <Crown className="w-3 h-3 inline" /> เจ้ามือ
            </p>
          ) : (
            <p className="text-xs text-muted">เดิมพัน: {player.bet || "-"}</p>
          )}
        </div>
      </div>

      {/* Cards */}
      {player.hand.length > 0 && (
        <div className="flex justify-center mb-2">
          <CardHand cards={player.hand} faceDown={!showCards} size="sm" />
        </div>
      )}

      {/* Result */}
      {player.result && showCards && (
        <div className="text-center">
          <span className="font-bold text-foreground">
            {player.result.points}
          </span>
          <span className="text-xs text-muted ml-1">
            {PokDengGame.getHandTypeName(player.result.handType)}
          </span>
        </div>
      )}

      {/* Payout */}
      {player.payout !== 0 && showCards && (
        <div
          className={`text-center text-sm font-bold ${
            player.payout > 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {player.payout > 0 ? `+${player.payout}` : player.payout}
        </div>
      )}

      {/* Status */}
      {player.isFolded && (
        <p className="text-center text-xs text-red-500">หมอบ</p>
      )}
    </div>
  );
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
 * Get phase color
 */
function getPhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    waiting: "text-gray-500",
    betting: "text-yellow-500",
    dealing: "text-blue-500",
    playing: "text-green-500",
    revealing: "text-purple-500",
    settling: "text-orange-500",
    finished: "text-gray-500",
  };
  return colors[phase] || "text-foreground";
}

/**
 * Current Action Banner - Shows what the player should do
 */
function CurrentActionBanner({
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
  let bgColor = "bg-blue-500/10 border-blue-500/30";
  let textColor = "text-blue-600 dark:text-blue-400";

  switch (phase) {
    case "waiting":
      if (isHost) {
        icon = "🎮";
        message = "กดปุ่ม 'เริ่มรอบใหม่' เพื่อเริ่มเกม";
        bgColor = "bg-green-500/10 border-green-500/30";
        textColor = "text-green-600 dark:text-green-400";
      } else {
        icon = "⏳";
        message = "รอเจ้าห้องเริ่มเกม...";
      }
      break;
    case "betting":
      if (isDealer) {
        icon = "👑";
        message = "คุณเป็นเจ้ามือ - รอผู้เล่นวางเดิมพัน";
      } else if (myBet > 0) {
        icon = "✅";
        message = `เดิมพันแล้ว ${myBet} - รอผู้เล่นคนอื่น`;
        bgColor = "bg-green-500/10 border-green-500/30";
        textColor = "text-green-600 dark:text-green-400";
      } else {
        icon = "💰";
        message = "เลือกจำนวนเงินและกด 'เดิมพัน'";
        bgColor = "bg-yellow-500/10 border-yellow-500/30";
        textColor = "text-yellow-600 dark:text-yellow-400";
      }
      break;
    case "dealing":
      icon = "🃏";
      message = "กำลังแจกไพ่...";
      break;
    case "playing":
      if (hasDrawn) {
        icon = "✅";
        message = "เลือกแล้ว - รอผู้เล่นคนอื่น";
        bgColor = "bg-green-500/10 border-green-500/30";
        textColor = "text-green-600 dark:text-green-400";
      } else if (isMyTurn) {
        icon = "🎯";
        message = "ถึงตาคุณ! เลือก: จั่วไพ่ / พอ / หมอบ";
        bgColor = "bg-yellow-500/10 border-yellow-500/30";
        textColor = "text-yellow-600 dark:text-yellow-400";
      } else {
        icon = "⏳";
        message = "รอผู้เล่นคนอื่นตัดสินใจ...";
      }
      break;
    case "revealing":
      icon = "👁️";
      message = "เปิดไพ่เปรียบ!";
      bgColor = "bg-purple-500/10 border-purple-500/30";
      textColor = "text-purple-600 dark:text-purple-400";
      break;
    case "settling":
    case "finished":
      icon = "🏆";
      message = isHost
        ? "กด 'รอบถัดไป' เพื่อเล่นต่อ"
        : "รอเจ้าห้องเริ่มรอบถัดไป";
      bgColor = "bg-orange-500/10 border-orange-500/30";
      textColor = "text-orange-600 dark:text-orange-400";
      break;
  }

  return (
    <div className={`mb-6 p-4 rounded-xl border ${bgColor}`}>
      <div className="flex items-center gap-3">
        <Info className={`w-5 h-5 ${textColor}`} />
        <div>
          <p className="text-xs text-muted mb-1">สิ่งที่ต้องทำ</p>
          <p className={`font-medium ${textColor}`}>
            <span className="mr-2">{icon}</span>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Action History Panel
 */
function ActionHistory({ logs }: { logs: GameLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted-light border-b border-border">
        <ScrollText className="w-4 h-4 text-muted" />
        <h3 className="font-medium text-foreground text-sm">ประวัติเกม</h3>
        <span className="text-xs text-muted">({logs.length})</span>
      </div>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto p-3 space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`flex items-start gap-2 text-sm ${
              log.type === "result" ? "bg-muted-light/50 rounded-lg p-2" : ""
            }`}
          >
            <span className="text-base leading-none mt-0.5">{log.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {log.playerName && (
                  <span className="font-medium text-foreground">
                    {log.playerName}
                  </span>
                )}
                <span
                  className={
                    log.type === "system"
                      ? "text-blue-500"
                      : log.type === "result"
                      ? log.message.includes("ชนะ")
                        ? "text-green-500"
                        : "text-red-500"
                      : "text-foreground"
                  }
                >
                  {log.message}
                </span>
              </div>
              <span className="text-xs text-muted">
                {new Date(log.timestamp).toLocaleTimeString("th-TH")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
