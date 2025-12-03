import { GamesView } from "@/src/presentation/components/games/GamesView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เกมทั้งหมด | Card Games P2P",
  description:
    "รวมเกมไพ่ออนไลน์ทั้งหมด - ไพ่สลาฟ ป๊อกเดง แคง โปกเกอร์ ไทยดัมมี่ แบล็คแจ็ค",
};

export default function GamesPage() {
  return <GamesView />;
}
