"use client";

import {
  AVATAR_OPTIONS,
  useUserStore,
} from "@/src/presentation/stores/userStore";
import {
  Check,
  Edit2,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Profile view component
 * Displays and allows editing of user profile and statistics
 */
export function ProfileView() {
  const {
    user,
    isHydrated,
    createUser,
    updateDisplayName,
    updateAvatar,
    resetStats,
  } = useUserStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Auto-create user if not exists
  useEffect(() => {
    if (isHydrated && !user) {
      createUser("");
    }
  }, [isHydrated, user, createUser]);

  // Loading state
  if (!isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success mx-auto mb-4"></div>
          <p className="text-muted">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success mx-auto mb-4"></div>
          <p className="text-muted">กำลังสร้างโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateDisplayName(editedName);
    }
    setIsEditingName(false);
  };

  const handleStartEdit = () => {
    setEditedName(user.displayName);
    setIsEditingName(true);
  };

  const winRate =
    user.stats.totalGames > 0
      ? Math.round((user.stats.wins / user.stats.totalGames) * 100)
      : 0;

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-surface rounded-2xl border border-border p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-24 h-24 rounded-full bg-linear-to-br from-success to-success-dark flex items-center justify-center text-5xl hover:scale-105 transition-transform cursor-pointer"
              >
                {user.avatar}
              </button>
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted-light transition-colors"
              >
                <Edit2 className="w-4 h-4 text-muted" />
              </button>

              {/* Avatar Picker */}
              {showAvatarPicker && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-xl p-4 shadow-lg z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => {
                          updateAvatar(avatar);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl hover:bg-muted-light transition-colors ${
                          user.avatar === avatar
                            ? "bg-success/10 ring-2 ring-success"
                            : ""
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name and Info */}
            <div className="flex-1 text-center sm:text-left">
              {isEditingName ? (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-success"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 rounded-lg bg-success text-white hover:bg-success-dark transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-2 rounded-lg bg-muted-light text-muted hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold text-foreground">
                    {user.displayName}
                  </h1>
                  <button
                    onClick={handleStartEdit}
                    className="p-2 rounded-lg hover:bg-muted-light transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted" />
                  </button>
                </div>
              )}
              <p className="text-muted mt-1">
                <User className="w-4 h-4 inline mr-1" />
                ID: {user.id.slice(0, 8)}...
              </p>
              <p className="text-sm text-muted mt-1">
                เข้าร่วมเมื่อ{" "}
                {new Date(user.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface rounded-xl border border-border p-6 text-center">
            <Target className="w-8 h-8 text-info mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {user.stats.totalGames}
            </p>
            <p className="text-sm text-muted">เกมทั้งหมด</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 text-center">
            <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {user.stats.wins}
            </p>
            <p className="text-sm text-muted">ชนะ</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 text-center">
            <X className="w-8 h-8 text-error mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {user.stats.losses}
            </p>
            <p className="text-sm text-muted">แพ้</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 text-center">
            <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{winRate}%</p>
            <p className="text-sm text-muted">อัตราชนะ</p>
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-surface rounded-2xl border border-border p-8 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            สถิติแต่ละเกม
          </h2>

          {Object.keys(user.stats.gamesPerType).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted">ยังไม่มีประวัติการเล่น</p>
              <p className="text-sm text-muted mt-1">
                เริ่มเล่นเกมเพื่อสะสมสถิติ!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(user.stats.gamesPerType).map(
                ([gameType, stats]) => {
                  const gameWinRate =
                    stats.played > 0
                      ? Math.round((stats.wins / stats.played) * 100)
                      : 0;
                  return (
                    <div
                      key={gameType}
                      className="flex items-center justify-between p-4 rounded-xl bg-background"
                    >
                      <div>
                        <h3 className="font-medium text-foreground capitalize">
                          {gameType}
                        </h3>
                        <p className="text-sm text-muted">
                          {stats.played} เกม • {stats.wins} ชนะ • {stats.losses}{" "}
                          แพ้
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">
                          {gameWinRate}%
                        </p>
                        <p className="text-xs text-muted">อัตราชนะ</p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตสถิติทั้งหมด?")) {
                resetStats();
              }
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:border-error/50 hover:bg-error/5 text-muted hover:text-error transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตสถิติ
          </button>
        </div>
      </div>
    </div>
  );
}
