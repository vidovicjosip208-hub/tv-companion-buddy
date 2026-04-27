import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * UI shape used across the app. Mapped from the actual `tv_channels` row
 * in the user's external Supabase, which has these columns:
 *   id, name, logo_url, stream_url, category, language, country,
 *   is_active, sort_order, created_at
 */
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

interface TvChannelRow {
  id: string;
  name: string;
  logo_url: string | null;
  stream_url: string | null;
  category: string | null;
  language: string | null;
  country: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const mapChannel = (row: TvChannelRow): Channel => ({
  id: row.id,
  name: row.name,
  logo_url: row.logo_url,
  stream_url: row.stream_url,
  category: row.category ?? "",
  channel_number: row.sort_order ?? 0,
  abbreviation: row.name?.slice(0, 4).toUpperCase() ?? null,
  thumbnail_url: row.logo_url,
});

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
    queryKey: ["tv_channels", "with_channel_logos"],
    queryFn: async (): Promise<Channel[]> => {
      const [channelsRes, logosRes] = await Promise.all([
        supabase
          .from("tv_channels")
          .select("id, name, logo_url, stream_url, category, language, country, is_active, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("channel_logos").select("channel_name, logo_url"),
      ]);
      if (channelsRes.error) throw channelsRes.error;
      if (logosRes.error) {
        // eslint-disable-next-line no-console
        console.warn("[channel_logos] failed to load, falling back to tv_channels.logo_url", logosRes.error);
      }

      const logoByName = new Map<string, string>();
      const norm = (s: string) => s.trim().toLowerCase();
      for (const row of (logosRes.data ?? []) as Array<{ channel_name: string | null; logo_url: string | null }>) {
        if (row.channel_name && row.logo_url) {
          logoByName.set(norm(row.channel_name), row.logo_url);
        }
      }

      return ((channelsRes.data ?? []) as TvChannelRow[]).map((row) => {
        const overrideLogo = logoByName.get(norm(row.name));
        const merged: TvChannelRow = overrideLogo
          ? { ...row, logo_url: overrideLogo }
          : row;
        return mapChannel(merged);
      });
    },
  });
};

/**
 * EPG data hook. The user's Supabase does not yet contain a programs/EPG
 * table, so this resolves to an empty array. Once a `tv_programs` table
 * exists, swap the queryFn to read from it and keep the same return shape.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useEPGData = (_channelIds?: string[]) => {
  return useQuery({
    queryKey: ["tv_programs"],
    queryFn: async (): Promise<EPGProgram[]> => [],
    staleTime: Infinity,
  });
};

export const useMoviesSeries = () => {
  return useQuery({
    queryKey: ["movies_series"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies_series").select("*").order("title");
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any[];
    },
  });
};
