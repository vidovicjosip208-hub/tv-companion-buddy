import { useNavigate, useSearchParams } from "react-router-dom";
import VideoPlayer from "@/components/VideoPlayer";
import { useFavorites } from "@/hooks/useFavorites";

const Player = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toggleFavorite, isFavorite } = useFavorites();

  const channelName = searchParams.get("channel") || "Pink";
  const streamUrl =
    searchParams.get("stream") || "https://fcc3daae3650.us-west-2.playlist.multipath.video.apple.com/playlist.m3u8";
  const showTitle = searchParams.get("title") || "Kumovi";

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
      }}
      isFavorite={isFavorite(channelName)}
      onToggleFavorite={() => toggleFavorite(channelName)}
    />
  );
};

export default Player;
