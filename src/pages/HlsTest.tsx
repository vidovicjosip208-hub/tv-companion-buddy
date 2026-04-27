import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useSearchParams } from "react-router-dom";

/**
 * Minimal "naked" HLS player — no UI, no overlays, no styling.
 * Loads ?stream=<url> or defaults to Big Buck Bunny test stream.
 */
const HlsTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [searchParams] = useSearchParams();

  const streamUrl =
    searchParams.get("stream") ||
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [streamUrl]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
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
        }}
      />
    </div>
  );
};

export default HlsTest;
