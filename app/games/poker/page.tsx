import { PokerView } from "@/src/presentation/components/games/poker/PokerView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "โป๊กเกอร์ | Card Games P2P",
  description: "เล่น Texas Hold'em Poker ออนไลน์กับเพื่อน ผ่านระบบ P2P",
};

export default function PokerPage() {
  return <PokerView />;
}
