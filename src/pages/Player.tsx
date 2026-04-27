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
      favorites.map((favName, idx) => {
        const ch = channels.find((c) => c.name === favName);
        return {
          number: idx + 1,
          channelName: favName,
          showTitle: favName,
          timeRange: "00:00 - 00:00",
          thumbnail: ch?.thumbnail_url || ch?.logo_url || "",
          streamUrl: ch?.stream_url ?? undefined,
          logoUrl: ch?.logo_url ?? null,
        };
      }),
    [favorites, channels],
  );

  const currentChannel = useMemo(
    () => channels.find((c) => c.name === channelName),
    [channels, channelName],
  );

  const handleSwitchChannel = (next: PlayerData) => {
    const ch = channels.find((c) => c.name === next.channelName);
    const params = new URLSearchParams();
    if (next.channelName) params.set("channel", next.channelName);
    if (ch?.stream_url) params.set("stream", ch.stream_url);
    if (next.showTitle) params.set("title", next.showTitle);
    navigate(`/player?${params.toString()}`, { replace: true });
  };

  return (
    <VideoPlayer
      isVisible={true}
      onClose={() => navigate(-1)}
      data={{
        channelNumber: "246",
        showTitle,
        timeRange: "15:50 - 17:00",
        thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80",
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
