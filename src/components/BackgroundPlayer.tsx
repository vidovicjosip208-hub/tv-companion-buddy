import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface BackgroundPlayerProps {
  streamUrl?: string;
  muted?: boolean;
  onReady?: () => void;
}

/**
 * Lagani video sloj koji svira kanal U POZADINI ispod TV UI-a (Startup Action).
 * Nema kontrola ni fokusa — čim korisnik potvrdi kanal, otvara se pravi VideoPlayer,
 * a ova komponenta se demontira (i oslobađa dekoder).
 */
const BackgroundPlayer = ({ streamUrl, muted = false, onReady }: BackgroundPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = /\.m3u8(\?|$)/i.test(streamUrl);
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, capLevelToPlayerSize: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      video.src = streamUrl;
    }

    const tryPlay = () => void video.play().catch(() => {});
    const handleReady = () => {
      tryPlay();
      onReady?.();
    };
    video.addEventListener("canplay", handleReady);
    tryPlay();
    if (video.readyState >= 3) onReady?.();

    return () => {
      video.removeEventListener("canplay", handleReady);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [streamUrl]);

  if (!streamUrl) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <video
        ref={videoRef}
        muted={muted}
        autoPlay
        playsInline
        preload="auto"
        className="w-full h-full object-cover opacity-40"
        style={{ transform: "translate3d(0,0,0)" }}
      />
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
};

export default BackgroundPlayer;
