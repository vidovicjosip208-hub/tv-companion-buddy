import { useState, useCallback } from "react";

const STORAGE_KEY = "tv-favorites";
const NUMBERS_KEY = "tv-favorite-numbers";

/** Stored as an ordered array — insertion order determines the channel number. */
const loadFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveFavorites = (favs: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
};

/** Custom, user-assigned channel numbers: { [channelName]: number } */
const loadNumbers = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(NUMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, number>;
    }
  } catch {}
  return {};
};

const saveNumbers = (nums: Record<string, number>) => {
  localStorage.setItem(NUMBERS_KEY, JSON.stringify(nums));
};

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [customNumbers, setCustomNumbers] = useState<Record<string, number>>(loadNumbers);

  const toggleFavorite = useCallback((channelName: string) => {
    setFavorites((prev) => {
      const idx = prev.indexOf(channelName);
      const next = idx >= 0 ? prev.filter((n) => n !== channelName) : [...prev, channelName];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((channelName: string) => favorites.includes(channelName), [favorites]);

  /** Returns the user-assigned number, otherwise the 1-based insertion order (0 if not a favorite). */
  const favoriteNumber = useCallback(
    (channelName: string) => {
      const custom = customNumbers[channelName];
      if (typeof custom === "number" && custom > 0) return custom;
      const idx = favorites.indexOf(channelName);
      return idx >= 0 ? idx + 1 : 0;
    },
    [favorites, customNumbers],
  );

  /** Assigns a custom number to a favorite. Any other favorite holding that number is cleared. */
  const setFavoriteNumber = useCallback((channelName: string, num: number) => {
    setCustomNumbers((prev) => {
      const next: Record<string, number> = {};
      for (const [name, value] of Object.entries(prev)) {
        if (name !== channelName && value !== num) next[name] = value;
      }
      if (num > 0) next[channelName] = num;
      saveNumbers(next);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite, isFavorite, favoriteNumber, setFavoriteNumber, customNumbers };
};

