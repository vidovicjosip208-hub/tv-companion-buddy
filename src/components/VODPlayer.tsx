import { useEffect, useRef, useState, useCallback } from "react";
import { X, RotateCcw, AlertTriangle } from "lucide-react";
import Hls from "hls.js";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-levels";
import "videojs-hls-quality-selector";
import { useMovieStream } from "@/hooks/useMovieStream";

interface VODPlayerProps {
  itemId?: string;
  /** Optional explicit stream override (skips Supabase fetch). */
  streamUrl?: string;
  title?: string;
  poster?: string;
  onClose: () => void;
}

/**
 * Detects HEVC/H.265 decoding support. Most 4K streams use HEVC.
 */
const supportsHEVC = (): boolean => {
  if (typeof window === "undefined") return false;
  const v = document.createElement("video");
  const codecs = ['video/mp4; codecs="hvc1.1.6.L93.B0"', 'video/mp4; codecs="hev1.1.6.L93.B0"'];
  if (codecs.some((c) => v.canPlayType(c) !== "")) return true;
  if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported) {
    return codecs.some((c) => MediaSource.isTypeSupported(c));
  }
  return false;
};

const VODPlayer = ({ itemId, streamUrl: streamUrlProp, title, poster, onClose }: VODPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const { data: movie, isLoading: fetchingStream, error: fetchError } = useMovieStream(
    streamUrlProp ? undefined : itemId,
  );

  const streamUrl = streamUrlProp ?? movie?.stream_url ?? null;
  const hasHEVC = supportsHEVC();

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setLoading(true);
    setRetryToken((n) => n + 1);
  }, []);

  // Initialize Video.js + HLS.js whenever stream URL or retry changes.
  useEffect(() => {
    if (!videoRef.current) return;
    if (fetchingStream) return;
    if (fetchError) {
      setErrorMsg("Greška pri dohvaćanju stream URL-a.");
      setLoading(false);
      return;
    }
    if (!streamUrl) {
      setErrorMsg("Stream URL nije dostupan za ovaj sadržaj.");
      setLoading(false);
      return;
    }

    cleanup();
    setLoading(true);
    setErrorMsg(null);

    const videoEl = videoRef.current;

    // Init Video.js shell first
    const player = videojs(videoEl, {
      controls: true,
      autoplay: true,
      preload: "auto",
      fluid: false,
      fill: true,
      responsive: true,
      playsinline: true,
      poster,
      controlBar: {
        pictureInPictureToggle: true,
      },
      html5: {
        vhs: { overrideNative: false },
      },
    });
    playerRef.current = player;

    const isNativeHls = videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";

    const attachQualitySelector = () => {
      // The plugin lives on the player instance after the import side-effect.
      const anyPlayer = player as unknown as { hlsQualitySelector?: (opts: object) => void };
      if (typeof anyPlayer.hlsQualitySelector === "function") {
        anyPlayer.hlsQualitySelector({ displayCurrentQuality: true });
      }
    };

    if (Hls.isSupported() && !isNativeHls) {
      const hls = new Hls({
        // Move demux/parse to a Web Worker so 4K decoding doesn't block the UI.
        enableWorker: true,
        lowLatencyMode: false,
        // 30s forward buffer to prevent stuttering during quality switches.
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        // ABR: start at top quality and let ABR scale down on slow connections.
        startLevel: -1,
        capLevelToPlayerSize: false,
        autoStartLoad: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Filter out HEVC variants on devices without HEVC decoding.
        if (!hasHEVC && hls.levels?.length) {
          const supported = hls.levels
            .map((lvl, idx) => ({ lvl, idx }))
            .filter(({ lvl }) => {
              const codec = (lvl.videoCodec ?? "").toLowerCase();
              return !(codec.startsWith("hvc1") || codec.startsWith("hev1"));
            });
          if (supported.length && supported.length < hls.levels.length) {
            // Cap to highest non-HEVC level if HEVC isn't available.
            const maxIdx = supported[supported.length - 1].idx;
            hls.autoLevelCapping = maxIdx;
          }
        }

        // Wire HLS levels into Video.js qualityLevels so the quality selector UI works.
        const anyPlayer = player as unknown as {
          qualityLevels?: () => {
            addQualityLevel: (lvl: object) => void;
            length: number;
          };
        };
        const ql = anyPlayer.qualityLevels?.();
        if (ql && hls.levels) {
          hls.levels.forEach((level, index) => {
            ql.addQualityLevel({
              id: `${index}`,
              width: level.width,
              height: level.height,
              bitrate: level.bitrate,
              enabled: (enabled?: boolean) => {
                if (typeof enabled === "boolean") {
                  // -1 = auto / ABR
                  hls.currentLevel = enabled ? index : -1;
                }
                return hls.currentLevel === index || hls.currentLevel === -1;
              },
            });
          });
        }
        attachQualitySelector();
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setErrorMsg("Greška u mreži (404 / timeout). Pokušajte ponovno.");
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Try to recover once before surfacing.
            try {
              hls.recoverMediaError();
              return;
            } catch {
              setErrorMsg("Greška u dekoderu medija.");
            }
            break;
          default:
            setErrorMsg("Reprodukcija nije uspjela. Pokušajte ponovno.");
        }
        setLoading(false);
      });
    } else if (isNativeHls) {
      // Safari / iOS — native HLS path, no Hls.js needed.
      videoEl.src = streamUrl;
      videoEl.addEventListener(
        "loadedmetadata",
        () => {
          attachQualitySelector();
          setLoading(false);
        },
        { once: true },
      );
      videoEl.addEventListener(
        "error",
        () => {
          setErrorMsg("Reprodukcija nije uspjela. Pokušajte ponovno.");
          setLoading(false);
        },
        { once: true },
      );
    } else {
      setErrorMsg("Vaš preglednik ne podržava HLS reprodukciju.");
      setLoading(false);
    }

    // Loading spinner wiring from native video events
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onCanPlay = () => setLoading(false);
    videoEl.addEventListener("waiting", onWaiting);
    videoEl.addEventListener("playing", onPlaying);
    videoEl.addEventListener("canplay", onCanPlay);

    return () => {
      videoEl.removeEventListener("waiting", onWaiting);
      videoEl.removeEventListener("playing", onPlaying);
      videoEl.removeEventListener("canplay", onCanPlay);
      cleanup();
    };
  }, [streamUrl, fetchingStream, fetchError, retryToken, poster, hasHEVC, cleanup]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white text-lg font-semibold truncate">{title ?? movie?.title ?? "Reprodukcija"}</h2>
        <button
          onClick={onClose}
          aria-label="Zatvori player"
          className="p-2 rounded-full bg-black/50 hover:bg-black/80 transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Video element — full screen */}
      <div data-vjs-player className="w-full h-full">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin vjs-big-play-centered w-full h-full"
          playsInline
        />
      </div>

      {/* Loading spinner */}
      {loading && !errorMsg && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay with Try Again */}
      {errorMsg && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85">
          <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
            <AlertTriangle className="w-12 h-12 text-yellow-400" />
            <p className="text-white text-lg">{errorMsg}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              <RotateCcw className="w-5 h-5" />
              Pokušaj ponovno
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VODPlayer;
