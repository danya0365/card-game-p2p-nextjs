"use client";

import { Club, Diamond, Github, Heart, Spade } from "lucide-react";
import Link from "next/link";

const gameLinks = [
  { href: "/games/slave", label: "ไพ่สลาฟ" },
  { href: "/games/pokdeng", label: "ไพ่ป๊อกเดง" },
  { href: "/games/kang", label: "ไพ่แคง" },
  { href: "/games/poker", label: "โปกเกอร์" },
  { href: "/games/dummy", label: "ไทยดัมมี่" },
  { href: "/games/blackjack", label: "แบล็คแจ็ค" },
];

const quickLinks = [
  { href: "/", label: "หน้าแรก" },
  { href: "/games", label: "เกมทั้งหมด" },
  { href: "/profile", label: "โปรไฟล์" },
];

/**
 * Main footer component with game links and info
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-foreground mb-4"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-linear-to-br from-success to-success-dark rounded-xl">
                <Spade className="w-6 h-6 text-white" />
              </div>
              <span>Card Games</span>
            </Link>
            <p className="text-muted max-w-md mb-4">
              เว็บรวมเกมไพ่ออนไลน์ เล่นกับเพื่อนผ่านระบบ P2P ไม่ต้องสมัครสมาชิก
              เล่นได้ทันที!
            </p>
            <div className="flex items-center gap-2 text-muted">
              <Spade className="w-5 h-5" />
              <Heart className="w-5 h-5 text-error" />
              <Diamond className="w-5 h-5 text-error" />
              <Club className="w-5 h-5" />
            </div>
          </div>

          {/* Game Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">เกมไพ่</h3>
            <ul className="space-y-2">
              {gameLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">ลิงก์ด่วน</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">
            © {currentYear} Card Games P2P. Made with ❤️
          </p>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm">Phase 1: P2P Version</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
