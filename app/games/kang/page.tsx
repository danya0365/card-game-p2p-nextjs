import { KangView } from "@/src/presentation/components/games/kang/KangView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ไพ่แคง | Card Games P2P",
  description: "เล่นไพ่แคงออนไลน์กับเพื่อน ผ่านระบบ P2P ไม่ต้องสมัครสมาชิก",
};

export default function KangPage() {
  return <KangView />;
}
