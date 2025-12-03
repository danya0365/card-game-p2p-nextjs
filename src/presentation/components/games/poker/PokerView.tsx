"use client";

import { PokerTableV2 } from "@/src/presentation/components/games/poker/PokerTableV2";
import { GameLobbyV2 } from "@/src/presentation/components/organisms/GameLobbyV2";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { useState } from "react";

/**
 * Poker game view
 * Shows lobby or game based on room status
 */
export function PokerView() {
  const { room } = useRoomStore();
  const [gameStarted, setGameStarted] = useState(false);

  // Handle game start
  const handleGameStart = () => {
    setGameStarted(true);
  };

  // Show game table when game has started (full screen)
  if (gameStarted && room?.status === "starting") {
    return <PokerTableV2 />;
  }

  // Show lobby (full screen)
  return <GameLobbyV2 gameType="poker" onGameStart={handleGameStart} />;
}
