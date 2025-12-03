import { DummyView } from "@/src/presentation/components/games/dummy/DummyView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ดัมมี่ | Card Games P2P",
  description:
    "เล่นดัมมี่ออนไลน์กับเพื่อน ผ่านระบบ P2P จับคู่ไพ่เป็นชุด ลดแต้มในมือ",
};

export default function DummyPage() {
  return <DummyView />;
}
