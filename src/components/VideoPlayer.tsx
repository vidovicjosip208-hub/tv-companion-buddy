import { useEffect, useRef } from "react";
import Hls from "hls.js";

export interface PlayerData {
  channelNumber?: string;
  showTitle?: string;
  timeRange?: string;
  thumbnail?: string;
  channelName?: string;
  streamUrl?: string;
}

export interface FavoriteChannel {
  number: number;
  channelName: string;
  showTitle: string;
  timeRange: string;
  thumbnail: string;
}

interface VideoPlayerProps {
  isVisible?: boolean;
  onClose?: () => void;
  data?: PlayerData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteChannels?: FavoriteChannel[];
  onSwitchChannel?: (data: PlayerData) => void;
}

/**
 * NAKED VIDEO PLAYER — Zero UI test mode.
 * Samo <video> element, crna pozadina, native browser controls.
 * Bez overlaya, animacija, HUD-a. Escape/Backspace zatvara.
 */
const VideoPlayer = ({ isVisible = true, onClose = () => {}, data }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const streamUrl =
    data?.streamUrl || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  // Load stream
  useEffect(() => {
    if (!isVisible) return;
    const video = videoRef.current;
    if (!video) return;

    // Clean up any previous instance
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      video.src = streamUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [isVisible, streamUrl]);

  // Escape / Backspace to close
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        margin: 0,
        padding: 0,
      }}
    >
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: "#000",
        }}
      />
    </div>
  );
};

export default VideoPlayer;
