"use client";

import {
  ArrowRight,
  Club,
  Diamond,
  Heart,
  Play,
  Shield,
  Spade,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import Link from "next/link";

/**
 * Game card data for the landing page
 */
const games = [
  {
    id: "slave",
    name: "ไพ่สลาฟ",
    nameEn: "Slave",
    description: "เกมไพ่ทิ้ง สนุกสนาน 2-4 คน",
    players: "2-4 คน",
    icon: "♠️",
    color: "from-gray-700 to-gray-900",
    href: "/games/slave",
  },
  {
    id: "pokdeng",
    name: "ไพ่ป๊อกเดง",
    nameEn: "Pok Deng",
    description: "เกมไพ่เปรียบ ลุ้นทุกตา",
    players: "2-9 คน",
    icon: "🎴",
    color: "from-red-500 to-red-700",
    href: "/games/pokdeng",
  },
  {
    id: "kang",
    name: "ไพ่แคง",
    nameEn: "Kang",
    description: "เกมไพ่ไทยดั้งเดิม",
    players: "2-6 คน",
    icon: "♥️",
    color: "from-pink-500 to-pink-700",
    href: "/games/kang",
  },
  {
    id: "poker",
    name: "โปกเกอร์",
    nameEn: "Texas Hold'em",
    description: "เกมไพ่ระดับโลก",
    players: "2-9 คน",
    icon: "♦️",
    color: "from-amber-500 to-amber-700",
    href: "/games/poker",
  },
  {
    id: "dummy",
    name: "ไทยดัมมี่",
    nameEn: "Thai Dummy",
    description: "เกมจับคู่ไพ่สุดมันส์",
    players: "2-4 คน",
    icon: "♣️",
    color: "from-emerald-500 to-emerald-700",
    href: "/games/dummy",
  },
  {
    id: "blackjack",
    name: "แบล็คแจ็ค",
    nameEn: "Blackjack",
    description: "เกมไพ่ 21 แข่งกับเจ้ามือ",
    players: "1-7 คน",
    icon: "🃏",
    color: "from-violet-500 to-violet-700",
    href: "/games/blackjack",
  },
];

/**
 * Features for the landing page
 */
const features = [
  {
    icon: Users,
    title: "เล่นกับเพื่อน",
    description: "สร้างห้องและเชิญเพื่อนมาเล่นด้วยกันได้ทันที",
  },
  {
    icon: Wifi,
    title: "P2P Connection",
    description: "เชื่อมต่อโดยตรงระหว่างผู้เล่น ไม่ต้องพึ่งเซิร์ฟเวอร์",
  },
  {
    icon: Shield,
    title: "ไม่ต้องสมัคร",
    description: "เล่นได้เลยไม่ต้องสร้างบัญชี ข้อมูลเก็บในเครื่องคุณเอง",
  },
  {
    icon: Zap,
    title: "เล่นได้ทุกที่",
    description: "รองรับทุกอุปกรณ์ เล่นบนมือถือหรือคอมพิวเตอร์ก็ได้",
  },
];

/**
 * Landing page view component
 */
export function LandingView() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 text-6xl opacity-10 rotate-12">
            ♠️
          </div>
          <div className="absolute top-40 right-20 text-8xl opacity-10 -rotate-12">
            ♥️
          </div>
          <div className="absolute bottom-20 left-1/4 text-7xl opacity-10 rotate-6">
            ♦️
          </div>
          <div className="absolute bottom-40 right-1/3 text-5xl opacity-10 -rotate-6">
            ♣️
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-sm font-medium">Phase 1: P2P Version</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6">
            <span className="inline-block">เว็บรวม</span>
            <span className="inline-block bg-clip-text text-transparent bg-linear-to-r from-success to-info">
              เกมไพ่ออนไลน์
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-8">
            เล่นกับเพื่อนผ่านระบบ P2P ไม่ต้องสมัครสมาชิก
            <br className="hidden sm:block" />
            ไพ่สลาฟ ป๊อกเดง แคง โปกเกอร์ และอื่นๆ
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/games"
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-success hover:bg-success-dark text-white font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-success/25"
            >
              <Play className="w-5 h-5" />
              เล่นเลย
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-surface border border-border hover:bg-muted-light text-foreground font-semibold text-lg transition-colors"
            >
              ตั้งค่าโปรไฟล์
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Card suits animation */}
          <div className="flex items-center justify-center gap-4 mt-12">
            <Spade
              className="w-8 h-8 text-foreground animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <Heart
              className="w-8 h-8 text-error animate-bounce"
              style={{ animationDelay: "100ms" }}
            />
            <Diamond
              className="w-8 h-8 text-error animate-bounce"
              style={{ animationDelay: "200ms" }}
            />
            <Club
              className="w-8 h-8 text-foreground animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              เกมไพ่ทั้งหมด
            </h2>
            <p className="text-muted text-lg">
              เลือกเกมที่ชอบแล้วเริ่มเล่นได้เลย
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className="group relative overflow-hidden rounded-2xl bg-background border border-border hover:border-success/50 transition-all hover:shadow-xl hover:shadow-success/5 hover:-translate-y-1"
              >
                {/* Game card header with gradient */}
                <div
                  className={`h-32 bg-linear-to-br ${game.color} flex items-center justify-center`}
                >
                  <span className="text-6xl transform group-hover:scale-110 transition-transform">
                    {game.icon}
                  </span>
                </div>

                {/* Game card content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {game.name}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted-light text-muted">
                      {game.players}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-4">{game.description}</p>
                  <div className="flex items-center text-success font-medium text-sm group-hover:translate-x-1 transition-transform">
                    เล่นเกมนี้
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-success hover:bg-success-dark text-white font-medium transition-colors"
            >
              ดูเกมทั้งหมด
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              ทำไมต้องเล่นที่นี่?
            </h2>
            <p className="text-muted text-lg">ฟีเจอร์เด่นที่ทำให้เราแตกต่าง</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-surface border border-border hover:border-success/30 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-success/10 text-success mb-4">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-br from-success to-success-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            พร้อมเล่นแล้วหรือยัง?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            เลือกเกม สร้างห้อง แล้วเชิญเพื่อนมาเล่นได้เลย!
          </p>
          <Link
            href="/games"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-gray-100 text-success-dark font-semibold text-lg transition-all hover:scale-105"
          >
            <Play className="w-5 h-5" />
            เริ่มเล่นเลย
          </Link>
        </div>
      </section>
    </div>
  );
}
