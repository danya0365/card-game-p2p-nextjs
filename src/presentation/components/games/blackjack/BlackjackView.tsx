"use client";

import { BlackjackTableV2 } from "@/src/presentation/components/games/blackjack/BlackjackTableV2";
import { GameLobbyV2 } from "@/src/presentation/components/organisms/GameLobbyV2";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { useState } from "react";

/**
 * Blackjack game view
 * Shows lobby or game based on room status
 */
export function BlackjackView() {
  const { room } = useRoomStore();
  const [gameStarted, setGameStarted] = useState(false);

  // Handle game start
  const handleGameStart = () => {
    setGameStarted(true);
  };

  // Show game table when game has started (full screen)
  if (gameStarted && room?.status === "starting") {
    return <BlackjackTableV2 />;
  }

  // Show lobby (full screen)
  return <GameLobbyV2 gameType="blackjack" onGameStart={handleGameStart} />;
}
