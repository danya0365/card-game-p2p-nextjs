import { BlackjackView } from "@/src/presentation/components/games/blackjack/BlackjackView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แบล็คแจ็ค | Card Games P2P",
  description: "เล่นแบล็คแจ็คออนไลน์กับเพื่อน ผ่านระบบ P2P ไม่ต้องสมัครสมาชิก",
};

export default function BlackjackPage() {
  return <BlackjackView />;
}
