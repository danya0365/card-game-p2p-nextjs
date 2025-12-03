import {
  storage,
  STORAGE_KEYS,
} from "@/src/infrastructure/storage/localforage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * User entity representing a local player
 */
export interface User {
  id: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  stats: UserStats;
}

/**
 * User game statistics
 */
export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  gamesPerType: Record<string, GameTypeStats>;
}

/**
 * Statistics per game type
 */
export interface GameTypeStats {
  played: number;
  wins: number;
  losses: number;
}

/**
 * User store state
 */
interface UserState {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
}

/**
 * User store actions
 */
interface UserActions {
  // User management
  createUser: (displayName: string) => void;
  updateDisplayName: (name: string) => void;
  updateAvatar: (avatar: string) => void;
  clearUser: () => void;

  // Stats management
  recordGameResult: (gameType: string, won: boolean) => void;
  resetStats: () => void;

  // Hydration
  setHydrated: (state: boolean) => void;
}

type UserStore = UserState & UserActions;

/**
 * Generate a random UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a random display name
 */
function generateRandomName(): string {
  const adjectives = [
    "Lucky",
    "Swift",
    "Brave",
    "Clever",
    "Sharp",
    "Bold",
    "Mighty",
    "Cool",
    "Wild",
    "Ace",
  ];
  const nouns = [
    "Player",
    "Dealer",
    "Shark",
    "Tiger",
    "Dragon",
    "Phoenix",
    "Wolf",
    "Eagle",
    "Lion",
    "King",
  ];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNoun}${randomNum}`;
}

/**
 * Default avatar options
 */
export const AVATAR_OPTIONS = [
  "🎴",
  "🃏",
  "♠️",
  "♥️",
  "♦️",
  "♣️",
  "👤",
  "🎭",
  "🎪",
  "🎲",
  "🎯",
  "🏆",
];

/**
 * Get random avatar
 */
function getRandomAvatar(): string {
  return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
}

/**
 * Create initial user stats
 */
function createInitialStats(): UserStats {
  return {
    totalGames: 0,
    wins: 0,
    losses: 0,
    gamesPerType: {},
  };
}

/**
 * Custom storage adapter for localforage with Zustand
 */
const localforageStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await storage.getItem<string>(name);
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await storage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await storage.removeItem(name);
  },
};

/**
 * User store with Zustand and localforage persistence
 */
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isHydrated: false,

      // Hydration
      setHydrated: (state) => set({ isHydrated: state }),

      // Create a new user
      createUser: (displayName) => {
        const name = displayName.trim() || generateRandomName();
        const newUser: User = {
          id: generateUUID(),
          displayName: name,
          avatar: getRandomAvatar(),
          createdAt: new Date().toISOString(),
          stats: createInitialStats(),
        };
        set({ user: newUser });
      },

      // Update display name
      updateDisplayName: (name) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              displayName: name.trim() || user.displayName,
            },
          });
        }
      },

      // Update avatar
      updateAvatar: (avatar) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              avatar,
            },
          });
        }
      },

      // Clear user data
      clearUser: () => {
        set({ user: null });
      },

      // Record game result
      recordGameResult: (gameType, won) => {
        const { user } = get();
        if (user) {
          const currentGameStats = user.stats.gamesPerType[gameType] || {
            played: 0,
            wins: 0,
            losses: 0,
          };

          set({
            user: {
              ...user,
              stats: {
                totalGames: user.stats.totalGames + 1,
                wins: user.stats.wins + (won ? 1 : 0),
                losses: user.stats.losses + (won ? 0 : 1),
                gamesPerType: {
                  ...user.stats.gamesPerType,
                  [gameType]: {
                    played: currentGameStats.played + 1,
                    wins: currentGameStats.wins + (won ? 1 : 0),
                    losses: currentGameStats.losses + (won ? 0 : 1),
                  },
                },
              },
            },
          });
        }
      },

      // Reset all stats
      resetStats: () => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              stats: createInitialStats(),
            },
          });
        }
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      storage: createJSONStorage(() => localforageStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/**
 * Hook to ensure user exists (creates one if not)
 */
export function useEnsureUser() {
  const { user, isHydrated, createUser } = useUserStore();

  if (isHydrated && !user) {
    createUser("");
  }

  return { user, isReady: isHydrated };
}
