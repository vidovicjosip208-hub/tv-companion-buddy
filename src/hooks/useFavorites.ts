import { useEffect, useState, useCallback } from "react";

const KEY = "tv_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: string[]) => {
    setFavorites(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
      persist(next);
    },
    [favorites],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
