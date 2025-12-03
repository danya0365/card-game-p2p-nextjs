import { MainLayout } from "@/src/presentation/components/templates/MainLayout";
import { ThemeProvider } from "@/src/presentation/providers/ThemeProvider";
import type { Metadata } from "next";
import "../public/styles/index.css";

export const metadata: Metadata = {
  title: "Card Games P2P | เว็บรวมเกมไพ่ออนไลน์",
  description:
    "เว็บรวมเกมไพ่ออนไลน์ เล่นกับเพื่อนผ่านระบบ P2P - ไพ่สลาฟ ป๊อกเดง แคง โปกเกอร์ ไทยดัมมี่ และอื่นๆ",
  keywords: [
    "เกมไพ่",
    "ไพ่สลาฟ",
    "ป๊อกเดง",
    "ไพ่แคง",
    "โปกเกอร์",
    "ไทยดัมมี่",
    "card games",
    "p2p",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <MainLayout>{children}</MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
