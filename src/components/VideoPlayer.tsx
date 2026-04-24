import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { EPGChannel } from "./EPGGrid";

interface Props {
  channel: EPGChannel | null;
  onClose: () => void;
}

const VideoPlayer = ({ channel, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!channel) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useEffect(() => {
    const video = videoRef.current;
    const url = channel?.streamUrl;
    if (!video || !url) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }
    video.play().catch(() => setPlaying(false));

    return () => {
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  if (!channel) return null;

  const liveProgram = channel.programs.find((p) => p.isLive) ?? channel.programs[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        controls={false}
      />

      {/* Top overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="pointer-events-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            {channel.abbreviation} · Kanal {channel.number}
          </div>
          <h2 className="mt-1 text-2xl font-bold text-white">{channel.name}</h2>
          <p className="text-sm text-white/70">{liveProgram?.title}</p>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="Zatvori"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6">
        <button
          onClick={togglePlay}
          className="pointer-events-auto rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20"
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
        </button>
        <button
          onClick={toggleMute}
          className="pointer-events-auto rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20"
        >
          {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
