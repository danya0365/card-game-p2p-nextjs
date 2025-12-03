"use client";

import type { Card } from "@/src/domain/types/card.types";
import {
  RANK_DISPLAY,
  SUIT_COLORS,
  SUIT_SYMBOLS,
} from "@/src/domain/types/card.types";

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Playing Card component
 * Displays a single playing card with suit and rank
 */
export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  className = "",
  onClick,
  selected = false,
  disabled = false,
}: PlayingCardProps) {
  const sizeClasses = {
    sm: "w-12 h-16 text-xs",
    md: "w-16 h-24 text-sm",
    lg: "w-24 h-36 text-lg",
  };

  const sizeClass = sizeClasses[size];

  // Face down card
  if (faceDown || !card) {
    return (
      <div
        className={`
          ${sizeClass}
          rounded-lg
          bg-linear-to-br from-blue-600 to-blue-800
          border-2 border-blue-400
          shadow-lg
          flex items-center justify-center
          select-none
          ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          transition-all duration-200
          ${className}
        `}
        onClick={disabled ? undefined : onClick}
      >
        <div className="w-3/4 h-3/4 rounded border-2 border-blue-400/50 flex items-center justify-center">
          <span className="text-blue-200 text-2xl">🎴</span>
        </div>
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const rank = RANK_DISPLAY[card.rank];

  return (
    <div
      className={`
        ${sizeClass}
        rounded-lg
        bg-white dark:bg-gray-100
        border-2 ${
          selected
            ? "border-yellow-400 ring-2 ring-yellow-400"
            : "border-gray-300"
        }
        shadow-lg
        flex flex-col
        select-none
        ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${selected ? "transform -translate-y-2" : ""}
        transition-all duration-200
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      {/* Top left corner */}
      <div
        className={`flex flex-col items-center ml-1 mt-1 leading-none ${
          color === "red" ? "text-red-600" : "text-gray-900"
        }`}
      >
        <span className="font-bold">{rank}</span>
        <span className="text-[0.6em]">{symbol}</span>
      </div>

      {/* Center suit symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className={`${
            size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-lg"
          } ${color === "red" ? "text-red-600" : "text-gray-900"}`}
        >
          {symbol}
        </span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div
        className={`flex flex-col items-center mr-1 mb-1 leading-none rotate-180 ${
          color === "red" ? "text-red-600" : "text-gray-900"
        }`}
      >
        <span className="font-bold">{rank}</span>
        <span className="text-[0.6em]">{symbol}</span>
      </div>
    </div>
  );
}

/**
 * Card hand display - shows multiple cards
 */
interface CardHandProps {
  cards: Card[];
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  overlap?: boolean;
  onCardClick?: (card: Card, index: number) => void;
  selectedIndices?: number[];
}

export function CardHand({
  cards,
  faceDown = false,
  size = "md",
  overlap = true,
  onCardClick,
  selectedIndices = [],
}: CardHandProps) {
  const overlapClass = overlap
    ? size === "lg"
      ? "-ml-8 first:ml-0"
      : size === "md"
      ? "-ml-6 first:ml-0"
      : "-ml-4 first:ml-0"
    : "";

  return (
    <div className="flex items-center justify-center">
      {cards.map((card, index) => (
        <div key={card.id} className={overlapClass}>
          <PlayingCard
            card={card}
            faceDown={faceDown}
            size={size}
            onClick={onCardClick ? () => onCardClick(card, index) : undefined}
            selected={selectedIndices.includes(index)}
          />
        </div>
      ))}
    </div>
  );
}
