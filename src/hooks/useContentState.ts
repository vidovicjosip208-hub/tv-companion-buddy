import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContentState {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  last_position_seconds: number;
  is_favorite: boolean;
  watch_later: boolean;
}

export const useContentState = (userId?: string) => {
  return useQuery({
    queryKey: ["user_content_state", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_content_state").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data as ContentState[];
    },
  });
};

export const useUpsertContentState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      content_id: string;
      content_type?: string;
      last_position_seconds?: number;
      is_favorite?: boolean;
      watch_later?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("user_content_state")
        .upsert(
          {
            user_id: params.user_id,
            content_id: params.content_id,
            content_type: params.content_type ?? "channel",
            last_position_seconds: params.last_position_seconds ?? 0,
            is_favorite: params.is_favorite ?? false,
            watch_later: params.watch_later ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,content_id" },
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["user_content_state", vars.user_id] });
    },
  });
};
