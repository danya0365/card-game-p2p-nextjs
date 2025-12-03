"use client";

import { ArrowRight, Clock, Star, Users } from "lucide-react";
import Link from "next/link";

/**
 * All available games with detailed info
 */
const games = [
  {
    id: "pokdeng",
    name: "ไพ่ป๊อกเดง",
    nameEn: "Pok Deng",
    description: "เกมไพ่เปรียบแต้มยอดนิยมของไทย ลุ้นป๊อกแปด ป๊อกเก้า!",
    players: "2-9 คน",
    duration: "5-10 นาที",
    difficulty: "ง่าย",
    icon: "🎴",
    color: "from-red-500 to-red-700",
    href: "/games/pokdeng",
    status: "available",
  },
  {
    id: "kang",
    name: "ไพ่แคง",
    nameEn: "Kang",
    description: "เกมไพ่ 5 ใบ สร้างมือที่ดีที่สุด ตอง แคง เรียง สี!",
    players: "2-6 คน",
    duration: "5-10 นาที",
    difficulty: "ง่าย",
    icon: "♥️",
    color: "from-pink-500 to-pink-700",
    href: "/games/kang",
    status: "available",
  },
  {
    id: "poker",
    name: "โป๊กเกอร์",
    nameEn: "Texas Hold'em Poker",
    description: "เกมไพ่ระดับโลก Fold, Call, Raise, All-in!",
    players: "2-9 คน",
    duration: "30-60 นาที",
    difficulty: "ยาก",
    icon: "♦️",
    color: "from-amber-500 to-amber-700",
    href: "/games/poker",
    status: "available",
  },
  {
    id: "dummy",
    name: "ไทยดัมมี่",
    nameEn: "Thai Dummy / Rummy",
    description: "เกมจับคู่ไพ่ เรียงลำดับหรือจับคู่เพื่อทิ้งไพ่ให้หมดมือ",
    players: "2-4 คน",
    duration: "15-30 นาที",
    difficulty: "ปานกลาง",
    icon: "♣️",
    color: "from-emerald-500 to-emerald-700",
    href: "/games/dummy",
    status: "coming_soon",
  },
  {
    id: "blackjack",
    name: "แบล็คแจ็ค",
    nameEn: "Blackjack / 21",
    description: "เกมไพ่ 21 แข่งกับเจ้ามือ Hit, Stand, Double หรือ Split!",
    players: "1-7 คน",
    duration: "5-15 นาที",
    difficulty: "ง่าย",
    icon: "🃏",
    color: "from-violet-500 to-violet-700",
    href: "/games/blackjack",
    status: "available",
  },
  {
    id: "slave",
    name: "ไพ่สลาฟ",
    nameEn: "Slave / President",
    description: "เกมไพ่ทิ้งยอดฮิต ใครทิ้งไพ่หมดมือก่อนชนะ ผู้แพ้ต้องเป็นทาส!",
    players: "2-4 คน",
    duration: "10-20 นาที",
    difficulty: "ง่าย",
    icon: "♠️",
    color: "from-gray-700 to-gray-900",
    href: "/games/slave",
    status: "coming_soon",
  },
];

/**
 * Get difficulty badge color
 */
function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "ง่าย":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "ปานกลาง":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "ยาก":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

/**
 * Games hub view component
 */
export function GamesView() {
  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            เกมไพ่ทั้งหมด
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            เลือกเกมที่ชอบ สร้างห้อง แล้วเชิญเพื่อนมาเล่นด้วยกัน
            ทุกเกมเล่นผ่านระบบ P2P ไม่ต้องสมัครสมาชิก
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <div
              key={game.id}
              className="group relative overflow-hidden rounded-2xl bg-surface border border-border hover:border-success/50 transition-all hover:shadow-xl hover:shadow-success/5"
            >
              {/* Status badge */}
              {game.status === "coming_soon" && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-warning/90 text-white text-xs font-medium">
                  เร็วๆ นี้
                </div>
              )}

              {/* Game card header with gradient */}
              <div
                className={`h-40 bg-linear-to-br ${game.color} flex items-center justify-center relative overflow-hidden`}
              >
                <span className="text-7xl transform group-hover:scale-110 transition-transform">
                  {game.icon}
                </span>
                {/* Decorative elements */}
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full"></div>
              </div>

              {/* Game card content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {game.name}
                    </h3>
                    <p className="text-sm text-muted">{game.nameEn}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(
                      game.difficulty
                    )}`}
                  >
                    {game.difficulty}
                  </span>
                </div>

                <p className="text-sm text-muted mb-4 line-clamp-2">
                  {game.description}
                </p>

                {/* Game info */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{game.players}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{game.duration}</span>
                  </div>
                </div>

                {/* Action button */}
                {game.status === "coming_soon" ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted-light text-muted font-medium cursor-not-allowed"
                  >
                    <Star className="w-4 h-4" />
                    เร็วๆ นี้
                  </button>
                ) : (
                  <Link
                    href={game.href}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-success hover:bg-success-dark text-white font-medium transition-colors"
                  >
                    เล่นเกมนี้
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info section */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-surface border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            🎮 วิธีการเล่น
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-4">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center text-xl font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-1">เลือกเกม</h3>
              <p className="text-sm text-muted">เลือกเกมที่อยากเล่น</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center text-xl font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-1">สร้างห้อง</h3>
              <p className="text-sm text-muted">สร้างห้องและได้รับ Room ID</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center text-xl font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-1">เชิญเพื่อน</h3>
              <p className="text-sm text-muted">
                ส่ง Room ID ให้เพื่อนเข้าร่วม
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
