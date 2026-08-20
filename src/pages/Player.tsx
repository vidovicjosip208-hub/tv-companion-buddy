import { useNavigate, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import VideoPlayer, { type FavoriteChannel, type PlayerData } from "@/components/VideoPlayer";
import { useFavorites } from "@/hooks/useFavorites";
import { useChannels } from "@/hooks/useChannels";

const Player = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite, favoriteNumber } = useFavorites();
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
          number: favoriteNumber(favName) || idx + 1,
          channelName: favName,
          showTitle: favName,
          timeRange: "00:00 - 00:00",
          thumbnail: ch?.thumbnail_url || ch?.logo_url || "",
          streamUrl: ch?.stream_url ?? undefined,
          logoUrl: ch?.logo_url ?? null,
        };
      }),
    [favorites, channels, favoriteNumber],
  );

  const currentChannel = useMemo(() => channels.find((c) => c.name === channelName), [channels, channelName]);

  // Svi kanali iz baze za numeričku navigaciju
  const allPlayerChannels: FavoriteChannel[] = useMemo(
    () =>
      channels.map((ch) => ({
        number: ch.channel_number,
        channelName: ch.name,
        showTitle: ch.name,
        timeRange: "00:00 - 00:00",
        thumbnail: ch.thumbnail_url || ch.logo_url || "",
        streamUrl: ch.stream_url ?? undefined,
        logoUrl: ch.logo_url ?? null,
      })),
    [channels],
  );

  const handleSwitchChannel = (next: PlayerData) => {
    // 1. Pokušaj koristiti streamUrl iz PlayerData objekta (proslijeđen iz VideoPlayer)
    let stream = next.streamUrl;

    // 2. Ako nije dostupan, traži direktno u channels listi iz baze po imenu kanala
    if (!stream && next.channelName) {
      stream = channels.find((c) => c.name === next.channelName)?.stream_url;
    }

    // 3. Ako i dalje nije pronađen, logiramo i ne izvršavamo switch
    if (!stream) {
      console.warn(
        "[Player] handleSwitchChannel: stream_url nije pronađen za kanal:",
        next.channelName,
        "— channels učitani:",
        channels.length,
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
      allChannels={allPlayerChannels}
      onSwitchChannel={handleSwitchChannel}
    />
  );
};

export default Player;
