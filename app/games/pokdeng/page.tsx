import { PokDengView } from "@/src/presentation/components/games/pokdeng/PokDengView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ป๊อกเดง | Card Games P2P",
  description: "เล่นไพ่ป๊อกเดงออนไลน์กับเพื่อน ผ่านระบบ P2P ไม่ต้องสมัครสมาชิก",
};

export default function PokDengPage() {
  return <PokDengView />;
}
