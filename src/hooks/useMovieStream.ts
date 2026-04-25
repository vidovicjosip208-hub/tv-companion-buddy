import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MovieStream {
  id: string;
  title: string | null;
  stream_url: string | null;
}

/**
 * Fetches the stream_url for a movie/series row by id.
 * Returns null when itemId is not provided.
 */
export const useMovieStream = (itemId?: string) =>
  useQuery({
    queryKey: ["movie_stream", itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<MovieStream | null> => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from("movies_series")
        .select("id, title, stream_url")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      return (data as MovieStream | null) ?? null;
    },
  });
