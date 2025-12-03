import { ProfileView } from "@/src/presentation/components/profile/ProfileView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "โปรไฟล์ | Card Games P2P",
  description: "จัดการโปรไฟล์และดูสถิติการเล่นเกมของคุณ",
};

export default function ProfilePage() {
  return <ProfileView />;
}
