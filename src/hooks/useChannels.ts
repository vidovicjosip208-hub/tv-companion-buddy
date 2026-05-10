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
 * EPG data hook. Queries the `epg_data` table in Supabase. When channelIds
 * is provided, restricts to those channels. Returns rows ordered by start_time.
 */
export const useEPGData = (channelIds?: string[]) => {
  return useQuery({
    queryKey: ["epg_data", channelIds?.slice().sort().join(",") ?? "all"],
    enabled: channelIds === undefined || channelIds.length > 0,
    queryFn: async (): Promise<EPGProgram[]> => {
      let q = supabase
        .from("epg_data")
        .select("id, channel_id, title, description, start_time, end_time, is_live")
        .order("start_time", { ascending: true });
      if (channelIds && channelIds.length > 0) {
        q = q.in("channel_id", channelIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EPGProgram[];
    },
    staleTime: 60_000,
  });
};

/**
 * EPG for a single channel — used by VideoPlayer's mini strip.
 */
export const useChannelEPG = (channelId?: string | null) => {
  return useQuery({
    queryKey: ["epg_data", "channel", channelId ?? "none"],
    enabled: Boolean(channelId),
    queryFn: async (): Promise<EPGProgram[]> => {
      const { data, error } = await supabase
        .from("epg_data")
        .select("id, channel_id, title, description, start_time, end_time, is_live")
        .eq("channel_id", channelId!)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EPGProgram[];
    },
    staleTime: 60_000,
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
