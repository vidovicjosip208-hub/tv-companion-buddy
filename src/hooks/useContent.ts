import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSeasons = (seriesId?: string) =>
  useQuery({
    queryKey: ["seasons", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("series_id", seriesId!)
        .order("season_number");
      if (error) throw error;
      return data;
    },
  });

export const useEpisodes = (seasonId?: string) =>
  useQuery({
    queryKey: ["episodes", seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", seasonId!)
        .order("episode_number");
      if (error) throw error;
      return data;
    },
  });

export const useCameraFeeds = () =>
  useQuery({
    queryKey: ["camera_feeds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camera_feeds").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

export const useRadioStations = () =>
  useQuery({
    queryKey: ["radio_stations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_stations")
        .select("*")
        .eq("is_active", true)
        .order("station_number");
      if (error) throw error;
      return data;
    },
  });

export const useRadioPrograms = (stationIds?: string[]) =>
  useQuery({
    queryKey: ["radio_programs", stationIds],
    queryFn: async () => {
      let q = supabase.from("radio_programs").select("*").order("start_time");
      if (stationIds?.length) q = q.in("station_id", stationIds);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useContentRows = (tab?: string) =>
  useQuery({
    queryKey: ["content_rows", tab],
    queryFn: async () => {
      let q = supabase.from("content_rows").select("*, content_row_items(*, movies_series(*))").order("sort_order");
      if (tab) q = q.eq("tab", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useMyList = (profileId?: string) =>
  useQuery({
    queryKey: ["my_list", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("my_list")
        .select("*, movies_series(*)")
        .eq("profile_id", profileId!)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useWatchProgress = (profileId?: string) =>
  useQuery({
    queryKey: ["watch_progress", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_progress")
        .select("*")
        .eq("profile_id", profileId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useUserPreferences = (profileId?: string) =>
  useQuery({
    queryKey: ["user_preferences", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("profile_id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
