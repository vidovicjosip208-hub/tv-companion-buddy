import { useNavigate, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import VideoPlayer, { type FavoriteChannel, type PlayerData } from "@/components/VideoPlayer";
import { useFavorites } from "@/hooks/useFavorites";
import { useChannels } from "@/hooks/useChannels";

const Player = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { data: channels = [] } = useChannels();

  const channelName = searchParams.get("channel") || "Pink";
  const streamUrl =
    searchParams.get("stream") || "https://fcc3daae3650.us-west-2.playlist.multipath.video.apple.com/playlist.m3u8";
  const showTitle = searchParams.get("title") || "Kumovi";

  const favoriteChannels: FavoriteChannel[] = useMemo(
    () =>
      favorites.map((favName: string, idx: number) => {
        const ch = channels.find((c) => c.name === favName);
        return {
          number: idx + 1,
          channelName: favName,
          showTitle: favName,
          timeRange: "00:00 - 00:00",
          thumbnail: ch?.thumbnail_url || ch?.logo_url || "",
          // stream_url se sprema direktno ovdje — ne tražimo ga ponovo u handleSwitchChannel
          streamUrl: ch?.stream_url ?? undefined,
          logoUrl: ch?.logo_url ?? null,
        };
      }),
    [favorites, channels],
  );

  const currentChannel = useMemo(() => channels.find((c) => c.name === channelName), [channels, channelName]);

  // FIX: Koristimo next.streamUrl direktno iz PlayerData objekta koji je već
  // izgradjen iz favoriteChannels — izbjegavamo dvostruki channels.find()
  // koji može failati ako su imena kanala nekonzistentna ili channels još nije učitan.
  const handleSwitchChannel = (next: PlayerData) => {
    const stream = next.streamUrl ?? channels.find((c) => c.name === next.channelName)?.stream_url;

    if (!stream) {
      console.warn(
        "[Player] handleSwitchChannel: stream_url nije pronađen za kanal",
        next.channelName,
        "— channel switch se neće izvršiti.",
      );
      return;
    }

    const params = new URLSearchParams();
    if (next.channelName) params.set("channel", next.channelName);
    params.set("stream", stream);
    if (next.showTitle) params.set("title", next.showTitle);

    navigate(`/player?${params.toString()}`, { replace: true });
  };

  return (
    <VideoPlayer
      isVisible={true}
      onClose={() => navigate(-1)}
      data={{
        // channelNumber se izračunava iz favoriteChannels, ne hardkodira se
        channelNumber: String(favoriteChannels.find((c) => c.channelName === channelName)?.number ?? 0),
        showTitle,
        timeRange: "15:50 - 17:00",
        thumbnail:
          currentChannel?.thumbnail_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80",
        channelName,
        streamUrl,
        logoUrl: currentChannel?.logo_url ?? null,
      }}
      isFavorite={isFavorite(channelName)}
      onToggleFavorite={() => toggleFavorite(channelName)}
      favoriteChannels={favoriteChannels}
      onSwitchChannel={handleSwitchChannel}
    />
  );
};

export default Player;
