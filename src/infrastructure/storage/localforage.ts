import localforage from "localforage";

/**
 * Configure localforage instance for the card game app
 */
export const storage = localforage.createInstance({
  name: "card-game-p2p",
  storeName: "app_data",
  description: "Card Game P2P local storage",
});

/**
 * Storage keys for the application
 */
export const STORAGE_KEYS = {
  USER: "user",
  SETTINGS: "settings",
  GAME_HISTORY: "game_history",
} as const;
