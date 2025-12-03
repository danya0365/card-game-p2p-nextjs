import { LandingView } from "@/src/presentation/components/landing/LandingView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Card Games P2P | เว็บรวมเกมไพ่ออนไลน์",
  description:
    "เว็บรวมเกมไพ่ออนไลน์ เล่นกับเพื่อนผ่านระบบ P2P - ไพ่สลาฟ ป๊อกเดง แคง โปกเกอร์ ไทยดัมมี่ และอื่นๆ ไม่ต้องสมัคร เล่นได้เลย!",
};

export default function HomePage() {
  return <LandingView />;
}
