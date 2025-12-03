"use client";

import { PokDengTableV2 } from "@/src/presentation/components/games/pokdeng/PokDengTableV2";
import { GameLobby } from "@/src/presentation/components/organisms/GameLobby";
import { useRoomStore } from "@/src/presentation/stores/roomStore";
import { useState } from "react";

/**
 * Pok Deng game view
 * Shows lobby or game based on room status
 */
export function PokDengView() {
  const { room } = useRoomStore();
  const [gameStarted, setGameStarted] = useState(false);

  // Handle game start
  const handleGameStart = () => {
    setGameStarted(true);
  };

  // Show game table when game has started (full screen)
  if (gameStarted && room?.status === "starting") {
    return <PokDengTableV2 />;
  }

  // Show lobby
  return (
    <div className="py-12">
      <GameLobby gameType="pokdeng" onGameStart={handleGameStart} />
    </div>
  );
}
