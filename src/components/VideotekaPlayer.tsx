import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useMovieStream } from "@/hooks/useMovieStream";

interface Episode {
  title: string;
  episodeInfo?: string;
  thumbnail: string;
}

interface VideotekaPlayerProps {
  title: string;
  episodeInfo?: string;
  thumbnail: string;
  onClose: () => void;
  nextEpisode?: Episode;
  onNextEpisode?: () => void;
  itemId?: string;
  streamUrl?: string;
}

/**
 * NAKED VIDEOTEKA PLAYER — Zero UI test mode.
 * Samo <video> element, native controls, bez overlaya/HUD-a/animacija.
 * Escape/Backspace zatvara.
 */
const VideotekaPlayer = ({ onClose, itemId, streamUrl: providedStreamUrl }: VideotekaPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { streamUrl: fetchedStreamUrl } = useMovieStream(itemId);
  const streamUrl =
    providedStreamUrl ||
    fetchedStreamUrl ||
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

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
  }, [streamUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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

export default VideotekaPlayer;
