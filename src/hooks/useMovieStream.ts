import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EpisodeRow {
  id: string;
  season_id: string;
  episode_number: number;
  title: string | null;
  description: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  stream_url: string | null;
}

export interface SeasonRow {
  id: string;
  series_id: string;
  season_number: number;
  sort_order: number | null;
  episodes: EpisodeRow[];
}

export interface MovieStream {
  id: string;
  title: string | null;
  type: string | null;
  stream_url: string | null;
  seasons: SeasonRow[];
}

interface RawSeason {
  id: string;
  series_id: string;
  season_number: number | null;
  sort_order: number | null;
  episodes: EpisodeRow[] | null;
}

/**
 * Fetches the movie/series row along with the full nested seasons + episodes tree
 * so the player can present a season/episode selector for series content.
 */
export const useMovieStream = (itemId?: string) =>
  useQuery({
    queryKey: ["movie_stream", itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<MovieStream | null> => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from("movies_series")
        .select(
          "id, title, type, stream_url, seasons(id, series_id, season_number, sort_order, episodes(id, season_id, episode_number, title, description, duration, thumbnail_url, stream_url))",
        )
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const raw = data as unknown as {
        id: string;
        title: string | null;
        type: string | null;
        stream_url: string | null;
        seasons: RawSeason[] | null;
      };

      const seasons: SeasonRow[] = (raw.seasons ?? [])
        .slice()
        .sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0))
        .map((s) => ({
          id: s.id,
          series_id: s.series_id,
          season_number: s.season_number ?? 0,
          sort_order: s.sort_order,
          episodes: (s.episodes ?? [])
            .slice()
            .sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0)),
        }));

      return {
        id: raw.id,
        title: raw.title,
        type: raw.type,
        stream_url: raw.stream_url,
        seasons,
      };
    },
  });
