import { SlaveView } from "@/src/presentation/components/games/slave/SlaveView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ไพ่สลาฟ | Card Games P2P",
  description:
    "เล่นไพ่สลาฟออนไลน์กับเพื่อน ผ่านระบบ P2P ทิ้งไพ่ให้หมดมือก่อนชนะ",
};

export default function SlavePage() {
  return <SlaveView />;
}
