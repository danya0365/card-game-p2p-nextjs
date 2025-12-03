"use client";

import { useSound, type GameBgmStyle } from "@/src/presentation/hooks/useSound";
import { Music, Volume2, VolumeX, X } from "lucide-react";

interface SoundSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const BGM_STYLES: { id: GameBgmStyle; name: string; icon: string }[] = [
  { id: "tavern", name: "Tavern", icon: "🍺" },
  { id: "adventure", name: "Adventure", icon: "⚔️" },
  { id: "castle", name: "Castle", icon: "🏰" },
  { id: "battle", name: "Battle", icon: "🔥" },
  { id: "tension", name: "Tension", icon: "😰" },
];

/**
 * Sound settings panel for controlling sound effects and BGM
 */
export function SoundSettingsPanel({
  isOpen,
  onClose,
}: SoundSettingsPanelProps) {
  const {
    enabled,
    volume,
    bgmPlaying,
    gameBgmStyle,
    toggleSound,
    updateVolume,
    toggleBgm,
    setGameBgmStyle,
    playClick,
  } = useSound();

  if (!isOpen) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-black/95 backdrop-blur-sm rounded-xl border border-white/10 z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Volume2 className="w-5 h-5" /> ตั้งค่าเสียง
        </h3>
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          className="text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Sound Effects Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-white/80">เอฟเฟกต์เสียง</span>
          <button
            onClick={() => {
              toggleSound();
              playClick();
            }}
            className={`p-2 rounded-lg transition-colors ${
              enabled
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {enabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">ระดับเสียง</span>
            <span className="text-white/60">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => updateVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* BGM Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-white/80">เพลงประกอบ</span>
          <button
            onClick={() => {
              toggleBgm("game");
              playClick();
            }}
            className={`p-2 rounded-lg transition-colors ${
              bgmPlaying
                ? "bg-green-500/20 text-green-400"
                : "bg-white/10 text-white/50"
            }`}
          >
            <Music className="w-5 h-5" />
          </button>
        </div>

        {/* BGM Style Selection */}
        <div className="space-y-2">
          <span className="text-white/60 text-sm">สไตล์เพลง</span>
          <div className="grid grid-cols-5 gap-2">
            {BGM_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setGameBgmStyle(style.id);
                  playClick();
                }}
                className={`p-2 rounded-lg text-center transition-colors ${
                  gameBgmStyle === style.id
                    ? "bg-blue-500/30 border border-blue-500/50"
                    : "bg-white/5 hover:bg-white/10"
                }`}
                title={style.name}
              >
                <span className="text-lg">{style.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
