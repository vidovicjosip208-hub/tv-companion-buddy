import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Channel {
  id: string;
  name: string;
  logo_url: string | null;
  stream_url: string | null;
  category: string;
  channel_number: number;
  abbreviation: string | null;
  thumbnail_url: string | null;
}

export interface EPGProgram {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_live: boolean | null;
}

export const useChannels = () => {
  return useQuery({
    queryKey: ["tv_channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channels" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      // Map tv_channels schema to the Channel shape used across the app
      return (data ?? []).map((row: any, idx: number): Channel => ({
        id: row.id,
        name: row.name,
        logo_url: row.logo_url ?? null,
        stream_url: row.stream_url ?? null,
        category: row.category ?? "",
        channel_number: typeof row.sort_order === "number" ? row.sort_order : idx + 1,
        abbreviation: row.name ? row.name.slice(0, 3).toUpperCase() : null,
        thumbnail_url: row.logo_url ?? null,
      }));
    },
  });
};

export const useEPGData = (channelIds?: string[]) => {
  return useQuery({
    queryKey: ["epg_data", channelIds],
    queryFn: async () => {
      let query = supabase.from("epg_data").select("*").order("start_time");
      if (channelIds && channelIds.length > 0) {
        query = query.in("channel_id", channelIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as EPGProgram[];
    },
  });
};

export const useMoviesSeries = () => {
  return useQuery({
    queryKey: ["movies_series"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies_series").select("*").order("title");
      if (error) throw error;
      return data as any[];
    },
  });
};
