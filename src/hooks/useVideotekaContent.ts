import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContentItem, ContentRowData, ContentDetailsData } from "@/data/videotekaContent";

const FALLBACK_THUMB = "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80";

export interface VideotekaRecord {
  id: string;
  title: string | null;
  type: string | null;
  description: string | null;
  genre: string | null;
  category: string | null;
  rating: string | null;
  imdb_rating: number | null;
  release_year: number | null;
  duration_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  thumbnail_url: string | null;
  stream_url: string | null;
  sort_order: number | null;
}

export interface VideotekaData {
  itemsById: Record<string, ContentItem>;
  detailsById: Record<string, ContentDetailsData>;
  allItems: ContentItem[];
  rowsByTab: Record<string, ContentRowData[]>;
}

const toItem = (r: VideotekaRecord): ContentItem => ({
  id: r.id,
  title: r.title ?? "Untitled",
  // Portrait 2:3 for the normal state
  thumbnail: r.poster_url ?? r.thumbnail_url ?? r.backdrop_url ?? FALLBACK_THUMB,
  // Landscape 16:9 for the focused state; undefined -> poster fallback in UI
  backdrop: r.backdrop_url ?? undefined,
});

const toDetails = (r: VideotekaRecord): ContentDetailsData => {
  const seasons = r.type === "series" ? "Series" : undefined;
  return {
    title: r.title ?? "Untitled",
    year: r.release_year ? String(r.release_year) : "—",
    genre: r.genre ?? r.category ?? (r.type === "series" ? "Series" : "Movie"),
    episodes: seasons,
    rating: r.rating ?? (r.imdb_rating ? `IMDb ${r.imdb_rating}` : "NR"),
    description: r.description ?? "",
  };
};

const groupBy = <T,>(arr: T[], key: (t: T) => string): Record<string, T[]> => {
  const out: Record<string, T[]> = {};
  for (const x of arr) {
    const k = key(x);
    (out[k] ??= []).push(x);
  }
  return out;
};

export const useVideotekaContent = () =>
  useQuery<VideotekaData>({
    queryKey: ["videoteka_content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies_series")
        .select(
          "id, title, type, description, genre, category, rating, imdb_rating, release_year, duration_minutes, poster_url, backdrop_url, thumbnail_url, stream_url, sort_order",
        )
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const records = (data ?? []) as VideotekaRecord[];
      const items = records.map(toItem);
      const itemsById: Record<string, ContentItem> = {};
      const detailsById: Record<string, ContentDetailsData> = {};
      records.forEach((r) => {
        itemsById[r.id] = toItem(r);
        detailsById[r.id] = toDetails(r);
      });

      const movies = records.filter((r) => r.type !== "series").map(toItem);
      const shows = records.filter((r) => r.type === "series").map(toItem);

      // Group by category for richer rows on Home
      const byCategory = groupBy(records, (r) => r.category ?? "Sve");
      const categoryRows: ContentRowData[] = Object.entries(byCategory)
        .filter(([, rs]) => rs.length > 0)
        .map(([cat, rs]) => ({ title: cat, items: rs.map(toItem) }));

      const homeRows: ContentRowData[] = [
        { title: "Novo u", titleHighlight: "Videoteci", items: items.slice(0, 10) },
        ...categoryRows,
      ].filter((r) => r.items.length > 0);

      const moviesRows: ContentRowData[] = [
        { title: "Svi", titleHighlight: "Filmovi", items: movies },
        ...Object.entries(groupBy(records.filter((r) => r.type !== "series"), (r) => r.genre ?? r.category ?? "Ostalo"))
          .map(([g, rs]) => ({ title: g, items: rs.map(toItem) }))
          .filter((r) => r.items.length > 0),
      ].filter((r) => r.items.length > 0);

      const showsRows: ContentRowData[] = [
        { title: "Sve", titleHighlight: "Serije", items: shows },
        ...Object.entries(groupBy(records.filter((r) => r.type === "series"), (r) => r.genre ?? r.category ?? "Ostalo"))
          .map(([g, rs]) => ({ title: g, items: rs.map(toItem) }))
          .filter((r) => r.items.length > 0),
      ].filter((r) => r.items.length > 0);

      const myListRows: ContentRowData[] = [{ title: "Moja", titleHighlight: "lista", items: items.slice(0, 10) }];

      return {
        itemsById,
        detailsById,
        allItems: items,
        rowsByTab: {
          Home: homeRows.length ? homeRows : [{ title: "Sadržaj", items }],
          Movies: moviesRows.length ? moviesRows : [{ title: "Filmovi", items: movies }],
          Shows: showsRows.length ? showsRows : [{ title: "Serije", items: shows }],
          "My List": myListRows,
        },
      };
    },
  });
