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
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").order("channel_number");
      if (error) throw error;
      return data as Channel[];
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
