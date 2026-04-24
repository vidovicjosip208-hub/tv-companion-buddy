import { useState, useCallback } from "react";

const STORAGE_KEY = "tv-favorites";

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

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggleFavorite = useCallback((channelName: string) => {
    setFavorites((prev) => {
      const idx = prev.indexOf(channelName);
      const next = idx >= 0 ? prev.filter((n) => n !== channelName) : [...prev, channelName];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((channelName: string) => favorites.includes(channelName), [favorites]);

  /** Returns the 1-based order number of the channel, or 0 if not a favorite. */
  const favoriteNumber = useCallback(
    (channelName: string) => {
      const idx = favorites.indexOf(channelName);
      return idx >= 0 ? idx + 1 : 0;
    },
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite, favoriteNumber };
};
