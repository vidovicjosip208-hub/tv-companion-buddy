import { memo, useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  ThumbsDown,
  ThumbsUp,
  SkipForward,
  Volume2,
  Rewind,
  FastForward,
} from "lucide-react";
import Hls from "hls.js";
import { MediaPlayer, type MediaPlayerClass } from "dashjs";
import logo from "@/assets/max-ovizija-videoteka-logo.png";
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
  initialEpisodeId?: string | null;
  // ── NOVO: opcionalni URL za seek-preview video (može biti isti kao streamUrl,
  //    ili niži quality MP4 za brže seekanje)
  seekPreviewUrl?: string;
}

type StreamKind = "hls" | "dash" | "file" | "unknown";

const getStreamKind = (source: string): StreamKind => {
  const normalized = decodeURIComponent(source).toLowerCase();
  const cleanPath = normalized.split(/[?#]/, 1)[0];
  if (/\.m3u8(?:$|[/?#])/.test(normalized) || normalized.includes("format=m3u8")) return "hls";
  if (/\.mpd(?:$|[/?#])/.test(normalized) || normalized.includes("format=mpd")) return "dash";
  if (/\.(mp4|m4v|webm|ogv|ogg|mov|mkv|avi)(?:$|[/?#])/.test(cleanPath)) return "file";
  return "unknown";
};

const CONTROL_OPTIONS = [
  { label: "Subtitle", hasIcon: false },
  { label: "Audio", icon: Volume2, hasIcon: true },
  { label: "Aa", hasIcon: false },
];

const ROW_SIZES = [3, 2, 3, CONTROL_OPTIONS.length];
const TOTAL_DURATION = 55 * 60 + 48;
const SEEK_STEP = 10;
const THUMBNAIL_COUNT = 7;
const GOLD = "#F5C518";
const LOADER_MIN_DURATION = 1200;
const LOADER_MAX_DURATION = 5000;

// ── NOVO: dimenzije seek preview canvasa ──────────────────────────────────────
const SEEK_CANVAS_W = 320;
const SEEK_CANVAS_H = 180;

const DUMMY_SUBTITLES = [
  { code: "off", label: "Isključeno" },
  { code: "hr", label: "Hrvatski" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "sr", label: "Srpski" },
];

const DUMMY_AUDIO_TRACKS = [
  { code: "hr", label: "Hrvatski", description: "Originalni zvuk" },
  { code: "en", label: "English", description: "Sinkronizirano" },
  { code: "de", label: "Deutsch", description: "Sinkronizirano" },
  { code: "fr", label: "Français", description: "Sinkronizirano" },
  { code: "es", label: "Español", description: "Sinkronizirano" },
];

const DUMMY_FONTS = [
  { code: "default", label: "Zadano", description: "Systemski font" },
  { code: "serif", label: "Serif", description: "Klasičan, čitljiv" },
  { code: "mono", label: "Monospace", description: "Jednake širine slova" },
  { code: "rounded", label: "Zaobljeno", description: "Mekan i moderan" },
  { code: "condensed", label: "Kondenzirano", description: "Uski, kompaktan" },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ── useSeekPreview hook ───────────────────────────────────────────────────────
// Persistentni cache izvan komponente — živi dok je aplikacija otvorena.
// Ključ je seekPreviewUrl, vrijednost je Map<time, dataURL>.
// Zatvaranje i ponovnim otvaranjem playera NE briše učitane sličice.
const globalFrameCache = new Map<string, Map<number, string>>();

function useSeekPreview(seekPreviewUrl: string | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingRef = useRef<Set<number>>(new Set());
  const seekingRef = useRef(false);
  const queueRef = useRef<number[]>([]);

  // Dohvati ili kreiraj cache za ovaj URL
  const getCache = useCallback((): Map<number, string> => {
    if (!seekPreviewUrl) return new Map();
    if (!globalFrameCache.has(seekPreviewUrl)) {
      globalFrameCache.set(seekPreviewUrl, new Map());
    }
    return globalFrameCache.get(seekPreviewUrl)!;
  }, [seekPreviewUrl]);

  // React state samo za triggeranje re-rendera — pravi podaci su u globalFrameCache
  const [, setFrameVersion] = useState(0);
  const bumpVersion = useCallback(() => setFrameVersion((v) => v + 1), []);

  // frames getter — čita iz globalnog cachea
  const frames = seekPreviewUrl
    ? (globalFrameCache.get(seekPreviewUrl) ?? new Map<number, string>())
    : new Map<number, string>();

  // Inicijalizacija video elementa — samo video/canvas, ne briše cache
  useEffect(() => {
    if (!seekPreviewUrl) return;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.style.display = "none";
    document.body.appendChild(video);
    videoRef.current = video;

    const isHlsPreview = (() => {
      try {
        return new URL(seekPreviewUrl, window.location.href).pathname.toLowerCase().endsWith(".m3u8");
      } catch {
        return seekPreviewUrl.split(/[?#]/, 1)[0].toLowerCase().endsWith(".m3u8");
      }
    })();
    let previewHls: Hls | null = null;

    if (isHlsPreview && Hls.isSupported()) {
      previewHls = new Hls({
        enableWorker: true,
        autoStartLoad: true,
        startLevel: -1,
        maxBufferLength: 10,
        backBufferLength: 0,
      });
      previewHls.attachMedia(video);
      previewHls.once(Hls.Events.MEDIA_ATTACHED, () => {
        previewHls?.loadSource(seekPreviewUrl);
      });
    } else if (!isHlsPreview) {
      video.src = seekPreviewUrl;
      video.load();
    }

    const canvas = document.createElement("canvas");
    canvas.width = SEEK_CANVAS_W;
    canvas.height = SEEK_CANVAS_H;
    canvas.style.display = "none";
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      // Zaustavi i ukloni video/canvas ali NE briši cache
      previewHls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      canvas.remove();
      videoRef.current = null;
      canvasRef.current = null;
      // Resetiraj samo in-flight stanje, ne cache
      pendingRef.current.clear();
      queueRef.current = [];
      seekingRef.current = false;
    };
  }, [seekPreviewUrl]);

  const processQueue = useCallback(() => {
    if (seekingRef.current) return;
    if (queueRef.current.length === 0) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const time = queueRef.current.shift()!;
    const cache = getCache();

    // Već u globalnom cacheu — preskoči
    if (cache.has(time)) {
      pendingRef.current.delete(time);
      processQueue();
      return;
    }

    seekingRef.current = true;
    video.currentTime = time;

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      void (async () => {
        try {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, SEEK_CANVAS_W, SEEK_CANVAS_H);
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          // Neki TV pregledači (Tizen / WebOS / Android TV) vraćaju hardverski
          // dekodirani video frame naopako kroz drawImage(video, ...).
          // createImageBitmap je specifikacijom orijentacijski točan, pa ga
          // koristimo kad postoji — inače pada na klasični drawImage.
          let drawn = false;
          if (typeof createImageBitmap === "function") {
            try {
              const bitmap = await createImageBitmap(video);
              ctx.drawImage(bitmap, 0, 0, SEEK_CANVAS_W, SEEK_CANVAS_H);
              bitmap.close?.();
              drawn = true;
            } catch {
              drawn = false;
            }
          }
          if (!drawn) {
            ctx.drawImage(video, 0, 0, SEEK_CANVAS_W, SEEK_CANVAS_H);
          }

          // Preskoči potpuno prazne (crne) frameove — inače na TV-u ostanu
          // prazne/slomljene sličice.
          let isBlank = false;
          try {
            const sample = ctx.getImageData(0, 0, SEEK_CANVAS_W, SEEK_CANVAS_H).data;
            let sum = 0;
            for (let i = 0; i < sample.length; i += 4 * 64) sum += sample[i] + sample[i + 1] + sample[i + 2];
            isBlank = sum === 0;
          } catch {
            isBlank = false;
          }

          if (!isBlank) {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            getCache().set(time, dataUrl);
            bumpVersion();
          }
          pendingRef.current.delete(time);
        } finally {
          seekingRef.current = false;
          processQueue();
        }
      })();
    };

    video.addEventListener("seeked", onSeeked);
  }, [getCache, bumpVersion]);


  const requestFrame = useCallback(
    (time: number) => {
      const t = Math.max(0, Math.round(time));
      const cache = getCache();
      // Već u cacheu — vrati odmah bez seekanja
      if (cache.has(t)) return cache.get(t)!;
      if (!pendingRef.current.has(t)) {
        pendingRef.current.add(t);
        queueRef.current.push(t);
        processQueue();
      }
      return null;
    },
    [getCache, processQueue],
  );

  return { frames, requestFrame };
}

// ── FrozenHlsVideo ────────────────────────────────────────────────────────────

type FrozenVideoRefs = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  hlsRef: MutableRefObject<Hls | null>;
};

interface FrozenHlsVideoProps extends FrozenVideoRefs {
  streamUrl: string | null;
  thumbnail: string;
  fetchingStream: boolean;
  fetchError: unknown;
  onReady: () => void;
  onError: (message: string | null) => void;
  onDuration: (duration: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onTimeSnapshot: (time: number) => void;
}

const FrozenHlsVideo = memo(
  ({
    streamUrl,
    thumbnail,
    fetchingStream,
    fetchError,
    videoRef,
    hlsRef,
    onReady,
    onError,
    onDuration,
    onPlayStateChange,
    onTimeSnapshot,
  }: FrozenHlsVideoProps) => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const usingHlsJsRef = useRef(false);
    const dashRef = useRef<MediaPlayerClass | null>(null);

    const playInitial = useCallback(() => {
      const video = localVideoRef.current;
      if (!video) return;
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => {
        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {});
      });
    }, []);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video) return;
      if (fetchingStream) return;

      if (fetchError) {
        onError("Greška pri dohvaćanju stream URL-a.");
        return;
      }
      if (!streamUrl) {
        onError("Stream URL nije dostupan.");
        return;
      }

      onError(null);
      video.preload = "auto";
      (video as HTMLVideoElement).playsInline = true;
      const streamKind = getStreamKind(streamUrl);
      let disposed = false;
      let hlsFallbackTried = false;
      let nativeFallbackTried = false;
      let mediaRecoveryCount = 0;
      let networkRecoveryCount = 0;

      // Watchdog: ako se za 15s ne dogodi loadedmetadata, prekini spinner s
      // prijateljskom porukom umjesto beskonačnog vrtenja (npr. 404/403 izvor).
      const startupWatchdog = window.setTimeout(() => {
        if (disposed) return;
        if (video.readyState < 1) {
          onError("Video se trenutno ne može pokrenuti. Provjerite izvor ili pokušajte kasnije.");
        }
      }, 15000);
      const clearWatchdogOnMeta = () => window.clearTimeout(startupWatchdog);
      video.addEventListener("loadedmetadata", clearWatchdogOnMeta, { once: true });

      const destroyHls = () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
        usingHlsJsRef.current = false;
      };

      const destroyDash = () => {
        dashRef.current?.reset();
        dashRef.current = null;
      };

      const resetVideo = () => {
        video.pause();
        video.removeAttribute("src");
        // crossOrigin nije potreban za reprodukciju i blokira MP4 servere koji
        // dopuštaju video, ali ne vraćaju Access-Control-Allow-Origin zaglavlje.
        video.removeAttribute("crossorigin");
        try {
          video.load();
        } catch {
          /* noop */
        }
      };

      const showFinalError = () => {
        if (!disposed) onError("Video se trenutno ne može pokrenuti. Pokušajte ponovo.");
      };

      let startHls: () => void;
      let startNative: () => void;

      startNative = () => {
        if (disposed) return;
        destroyHls();
        destroyDash();
        resetVideo();
        usingHlsJsRef.current = false;
        video.src = streamUrl;
        video.load();
        playInitial();
      };

      startHls = () => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          if (!nativeFallbackTried) {
            nativeFallbackTried = true;
            startNative();
          } else {
            showFinalError();
          }
          return;
        }

        destroyHls();
        destroyDash();
        resetVideo();
        usingHlsJsRef.current = true;
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          capLevelToPlayerSize: false,
          // Automatski start je pouzdaniji na TV Chromium izvedbama. Ručni
          // start nakon MANIFEST_PARSED na nekima od njih učita master manifest,
          // ali nikada ne zatraži level playlistu ni prvi segment.
          autoStartLoad: true,
          // Manji bufferi = znatno manja potrošnja RAM-a i CPU-a na TV uređajima.
          maxBufferLength: 16,
          maxMaxBufferLength: 30,
          maxBufferSize: 24 * 1000 * 1000,
          backBufferLength: 8,
          maxBufferHole: 0.5,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 750,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          levelLoadingRetryDelay: 750,
          fragLoadingTimeOut: 15000,
          fragLoadingMaxRetry: 5,
          fragLoadingRetryDelay: 750,
          nudgeMaxRetry: 5,
          nudgeOffset: 0.2,
          maxFragLookUpTolerance: 0.5,
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,
          highBufferWatchdogPeriod: 2,
        });
        hlsRef.current = hls;

        hls.attachMedia(video);
        hls.once(Hls.Events.MEDIA_ATTACHED, () => {
          if (!disposed) hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Prepusti hls.js-u izbor prve kompatibilne razine. Ručno zaključavanje
          // ovdje može spriječiti level playlistu ako najviša varijanta koristi
          // kodek koji konkretni TV ne može dekodirati.
          playInitial();
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal || disposed || hlsRef.current !== hls) return;

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryCount < 2) {
            mediaRecoveryCount += 1;
            if (mediaRecoveryCount === 2) hls.swapAudioCodec();
            hls.recoverMediaError();
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryCount < 1) {
            networkRecoveryCount += 1;
            window.setTimeout(() => {
              if (!disposed && hlsRef.current === hls) hls.startLoad(-1);
            }, 1000);
            return;
          }

          // URL bez ekstenzije prvo se proba kao HLS. Ako nije manifest, isti
          // izvor se automatski prosljeđuje nativnom MP4/WebM playeru.
          if (streamKind === "unknown" && !nativeFallbackTried) {
            nativeFallbackTried = true;
            startNative();
            return;
          }
          showFinalError();
        });
      };

      const startDash = () => {
        if (disposed) return;
        destroyHls();
        destroyDash();
        resetVideo();
        usingHlsJsRef.current = true;
        try {
          const dash = MediaPlayer().create();
          dashRef.current = dash;
          dash.initialize(video, streamUrl, true);
        } catch {
          showFinalError();
        }
      };

      const handleNativeError = () => {
        if (disposed || usingHlsJsRef.current) return;
        // Ako izvor nema prepoznatljivu ekstenziju, native greška može značiti
        // da je URL zapravo HLS endpoint. Tada ga bez popupa preuzima hls.js.
        if (streamKind === "unknown" && !hlsFallbackTried) {
          hlsFallbackTried = true;
          startHls();
          return;
        }
        showFinalError();
      };

      video.addEventListener("error", handleNativeError);
      if (streamKind === "hls") startHls();
      else if (streamKind === "dash") startDash();
      else if (streamKind === "file") startNative();
      else {
        hlsFallbackTried = true;
        startHls();
      }

      return () => {
        disposed = true;
        window.clearTimeout(startupWatchdog);
        video.removeEventListener("loadedmetadata", clearWatchdogOnMeta);
        video.removeEventListener("error", handleNativeError);
        destroyHls();
        destroyDash();
      };
    }, [streamUrl, fetchingStream, fetchError, hlsRef, onError, onReady, playInitial]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video) return;

      let lastTime = video.currentTime;
      let stalledFor = 0;
      let recoveryStage = 0;
      let lastRecoveryAt = 0;

      const STALL_MS = 2000;
      const TICK_MS = 1000; // rjeđi tick — manje opterećenje CPU-a na TV-u
      const RECOVERY_COOLDOWN_MS = 4000; // bilo 8000

      const interval = window.setInterval(() => {
        if (video.paused || video.ended || video.seeking) {
          stalledFor = 0;
          lastTime = video.currentTime;
          return;
        }

        if (Math.abs(video.currentTime - lastTime) < 0.05) {
          stalledFor += TICK_MS;
        } else {
          stalledFor = 0;
          recoveryStage = 0;
          lastTime = video.currentTime;
          return;
        }

        if (stalledFor < STALL_MS) return;
        const now = performance.now();
        if (now - lastRecoveryAt < RECOVERY_COOLDOWN_MS) return;
        lastRecoveryAt = now;

        const hls = hlsRef.current;
        try {
          if (recoveryStage === 0) {
            video.currentTime = video.currentTime + 0.1;
            recoveryStage = 1;
          } else if (recoveryStage === 1 && hls) {
            hls.recoverMediaError();
            recoveryStage = 2;
          } else if (hls) {
            const resumeAt = video.currentTime;
            hls.detachMedia();
            hls.attachMedia(video);
            hls.once(Hls.Events.MEDIA_ATTACHED, () => {
              try {
                video.currentTime = resumeAt;
                video.play().catch(() => {});
              } catch {
                /* noop */
              }
            });
            recoveryStage = 0;
          }
        } catch {
          /* noop */
        }
      }, TICK_MS);

      return () => clearInterval(interval);
    }, [hlsRef, streamUrl]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video) return;

      const onLoadedMeta = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          onDuration(Math.floor(video.duration));
        }
        onReady();
      };
      const onCanPlay = () => onReady();
      let lastSnapshot = -1;
      const onTimeUpdate = () => {
        const sec = Math.floor(video.currentTime);
        if (sec === lastSnapshot) return; // preskoči duplikate (timeupdate ide ~4x/s)
        lastSnapshot = sec;
        onTimeSnapshot(sec);
      };
      const onPlay = () => {
        video.muted = false;
        video.volume = 1;
        onPlayStateChange(true);
      };
      const onPause = () => onPlayStateChange(false);

      video.addEventListener("loadedmetadata", onLoadedMeta);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);

      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
      };
    }, [onDuration, onPlayStateChange, onReady, onTimeSnapshot]);

    return (
      <video
        ref={(node) => {
          localVideoRef.current = node;
          videoRef.current = node;
        }}
        poster={thumbnail}
        playsInline
        preload="auto"
        className="relative z-10 w-full h-full object-fill bg-black"
      />
    );
  },
);

FrozenHlsVideo.displayName = "FrozenHlsVideo";

// ── Loader ────────────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 80;
const STROKE = 5;
const RADIUS = (CIRCLE_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Loader = ({ ready, onDone }: { ready: boolean; onDone: () => void }) => {
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();
    let timer = 0;

    const tick = () => {
      const elapsed = performance.now() - startTime;

      if (ready || elapsed >= LOADER_MAX_DURATION) {
        setPercent(100);
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(onDone, 250);
        }
        return;
      }

      const raw = elapsed / LOADER_MIN_DURATION;
      const eased = 1 - Math.pow(1 - Math.min(raw, 1), 2);
      setPercent(Math.min(90, Math.round(eased * 90)));
      timer = window.setTimeout(tick, 120);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [ready, onDone]);

  const dashOffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
    >
      <div className="relative" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
        <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={STROKE}
          />
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={GOLD}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.15s linear" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums select-none"
          style={{ color: GOLD, fontSize: "18px" }}
        >
          {percent}%
        </div>
      </div>
    </motion.div>
  );
};

// ── Player ────────────────────────────────────────────────────────────────────

const VideotekaPlayer = ({
  title,
  episodeInfo,
  thumbnail,
  onClose,
  nextEpisode,
  onNextEpisode,
  itemId,
  streamUrl: streamUrlProp,
  seekPreviewUrl: seekPreviewUrlProp, // ── NOVO
  initialEpisodeId = null,
}: VideotekaPlayerProps) => {
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const {
    data: movie,
    isLoading: fetchingStream,
    error: fetchError,
  } = useMovieStream(streamUrlProp ? undefined : itemId);
  const streamUrl = streamUrlProp ?? movie?.stream_url ?? null;

  // ── Serije: sezone + odabrana epizoda ─────────────────────────────────────
  const seasons = movie?.seasons ?? [];
  const hasEpisodes = seasons.some((s) => s.episodes.length > 0);
  const firstSeasonWithEpisodes = seasons.find((s) => s.episodes.length > 0) ?? null;
  const firstEpisodeId = firstSeasonWithEpisodes?.episodes[0]?.id ?? null;

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(initialEpisodeId);
  useEffect(() => {
    if (initialEpisodeId) setSelectedEpisodeId(initialEpisodeId);
  }, [initialEpisodeId]);
  useEffect(() => {
    if (hasEpisodes && !selectedEpisodeId && firstEpisodeId) {
      setSelectedEpisodeId(firstEpisodeId);
    }
  }, [hasEpisodes, firstEpisodeId, selectedEpisodeId]);

  const activeEpisode = useMemo(() => {
    if (!selectedEpisodeId) return null;
    for (const s of seasons) {
      for (const e of s.episodes) if (e.id === selectedEpisodeId) return e;
    }
    return null;
  }, [seasons, selectedEpisodeId]);

  const effectiveStreamUrl = activeEpisode?.stream_url ?? streamUrl;

  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);
  const [epFocusArea, setEpFocusArea] = useState<"seasons" | "episodes">("seasons");
  const [epSeasonIdx, setEpSeasonIdx] = useState(0);
  const [epEpisodeIdx, setEpEpisodeIdx] = useState(0);
  const episodesPanelRef = useRef(false);
  const hasEpisodesRef = useRef(false);
  useEffect(() => {
    episodesPanelRef.current = showEpisodesPanel;
  }, [showEpisodesPanel]);
  useEffect(() => {
    hasEpisodesRef.current = hasEpisodes;
  }, [hasEpisodes]);

  // ── NOVO: seek preview URL — iz propa, ili isti stream_url kao glavni video
  const seekPreviewUrl = seekPreviewUrlProp ?? effectiveStreamUrl;

  // ── NOVO: hook koji drži skriveni video + canvas za frame capture
  const { frames: seekFrames, requestFrame } = useSeekPreview(seekPreviewUrl);

  const [isVisible, setIsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(TOTAL_DURATION);
  const [focusedRow, setFocusedRow] = useState(2);
  const [focusedCol, setFocusedCol] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [skipHovered, setSkipHovered] = useState(false);

  // Pravi fullscreen uklanja browser chrome koji inače mijenja omjer dostupnog
  // prostora i stvara bočne trake čak i kod standardnog 16:9 videa.
  useEffect(() => {
    const root = playerRootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!root || document.fullscreenElement) return;

    const requestFullscreen = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    if (!requestFullscreen) return;

    try {
      const result = requestFullscreen();
      Promise.resolve(result).catch(() => {});
    } catch {
      // Fullscreen može biti blokiran u ugrađenom preview iframeu; player i dalje radi.
    }
  }, []);

  // Debounce seek — video seekuje tek kad korisnik prestane pritiskati tipke
  const pendingSeekRef = useRef<number | null>(null);
  const pendingSeekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingBeforeSeekRef = useRef<boolean>(false);

  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState("off");
  const [subtitleFocusIdx, setSubtitleFocusIdx] = useState(0);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState("hr");
  const [audioFocusIdx, setAudioFocusIdx] = useState(0);
  const [showFontModal, setShowFontModal] = useState(false);
  const [selectedFont, setSelectedFont] = useState("default");
  const [fontFocusIdx, setFontFocusIdx] = useState(0);

  const subtitleModalRef = useRef(false);
  const audioModalRef = useRef(false);
  const fontModalRef = useRef(false);
  const subtitleFocusIdxRef = useRef(0);
  const audioFocusIdxRef = useRef(0);
  const fontFocusIdxRef = useRef(0);
  const currentTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const totalDurationRef = useRef(TOTAL_DURATION);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const elapsedTextRef = useRef<HTMLSpanElement | null>(null);
  const remainingTextRef = useRef<HTMLDivElement | null>(null);

  const updateProgressDom = useCallback((time: number, duration = totalDurationRef.current) => {
    const safeDuration = duration > 0 ? duration : TOTAL_DURATION;
    const clamped = Math.max(0, Math.min(time, safeDuration));
    if (elapsedTextRef.current) elapsedTextRef.current.textContent = formatTime(clamped);
    if (remainingTextRef.current)
      remainingTextRef.current.textContent = formatTime(Math.max(0, safeDuration - clamped));
    if (progressFillRef.current) progressFillRef.current.style.width = `${(clamped / safeDuration) * 100}%`;
  }, []);

  const openSubtitleModal = (idx: number) => {
    setSubtitleFocusIdx(idx);
    subtitleFocusIdxRef.current = idx;
    subtitleModalRef.current = true;
    setShowSubtitleModal(true);
  };
  const closeSubtitleModal = () => {
    subtitleModalRef.current = false;
    setShowSubtitleModal(false);
  };
  const openAudioModal = (idx: number) => {
    setAudioFocusIdx(idx);
    audioFocusIdxRef.current = idx;
    audioModalRef.current = true;
    setShowAudioModal(true);
  };
  const closeAudioModal = () => {
    audioModalRef.current = false;
    setShowAudioModal(false);
  };
  const openFontModal = (idx: number) => {
    setFontFocusIdx(idx);
    fontFocusIdxRef.current = idx;
    fontModalRef.current = true;
    setShowFontModal(true);
  };
  const closeFontModal = () => {
    fontModalRef.current = false;
    setShowFontModal(false);
  };

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);
  const startHideTimer = useCallback(() => {
    cancelHideTimer();
    // Dok je seek preview aktivan, HUD se NE smije sakriti — čeka potvrdu s OK.
    if (isSeekingRef.current) return;
    hideTimerRef.current = setTimeout(() => setIsVisible(false), 3000);
  }, [cancelHideTimer]);

  const startPlayback = useCallback(
    (delay = 150) => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        video.volume = 1;
        if (video.paused) {
          video.play().catch(() => {
            video.muted = false;
            video.volume = 1;
            video.play().catch(() => {});
          });
        }
      }

      cancelHideTimer();
      if (delay > 0) {
        hideTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          hideTimerRef.current = null;
        }, delay);
      } else {
        startHideTimer();
      }
    },
    [cancelHideTimer, startHideTimer],
  );

  const pausePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    setIsVisible(true);
    cancelHideTimer();
  }, [cancelHideTimer]);

  useEffect(() => {
    // Dok korisnik skrola seek preview, HUD ostaje vidljiv — ne startaj hide timer.
    if (isVisible && isPlaying && !isSeeking) startHideTimer();
    else cancelHideTimer();
    return () => cancelHideTimer();
  }, [isVisible, isPlaying, isSeeking, startHideTimer, cancelHideTimer]);

  useEffect(() => {
    if (loaderDone) {
      startPlayback(0);
    }
  }, [loaderDone, startPlayback]);

  const totalDuration = videoDuration || TOTAL_DURATION;

  useEffect(() => {
    totalDurationRef.current = totalDuration;
    updateProgressDom(currentTimeRef.current, totalDuration);
  }, [totalDuration, updateProgressDom]);

  const markVideoReady = useCallback(() => {
    setVideoReady(true);
    setLoaderDone(true);
  }, []);

  const handleTimeSnapshot = useCallback(
    (time: number) => {
      // Dok je seek preview aktivan, glavni video je zamrznut — ne ažuriraj poziciju
      // niti timeline (UI prati isključivo pending seek vrijeme).
      if (isSeekingRef.current) return;
      currentTimeRef.current = time;
      updateProgressDom(time);
    },
    [updateProgressDom],
  );


  useEffect(() => {
    isSeekingRef.current = isSeeking;
    updateProgressDom(isSeeking ? seekTime : currentTimeRef.current);
  }, [isSeeking, seekTime, updateProgressDom]);

  // Dok je seek preview aktivan, glavni player mora ostati zamrznut na trenutnom okviru:
  // pauziramo ga i blokiramo svaki pokušaj automatskog nastavka reprodukcije.
  useEffect(() => {
    if (!isSeeking) return;
    const video = videoRef.current;
    if (!video) return;

    const freeze = () => {
      if (!isSeekingRef.current) return;
      if (!video.paused) {
        try {
          video.pause();
        } catch {
          /* noop */
        }
      }
    };

    freeze();
    setIsPlaying(false);
    video.addEventListener("play", freeze);
    video.addEventListener("playing", freeze);
    video.addEventListener("canplay", freeze);

    return () => {
      video.removeEventListener("play", freeze);
      video.removeEventListener("playing", freeze);
      video.removeEventListener("canplay", freeze);
    };
  }, [isSeeking]);


  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleDuration = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  const handleSeeked = useCallback(() => {
    setIsSeeking(false);
    setIsBuffering(false);
  }, []);

  // Prati buffering stanje na glavnom video elementu
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [handleSeeked]);

  const displayTime = isSeeking ? seekTime : currentTimeRef.current;
  const elapsed = formatTime(displayTime);
  const remaining = formatTime(Math.max(0, totalDuration - displayTime));

  // ── NOVO: seek thumbnails su sada vremenski offseti + tražimo frame capture
  const seekThumbnailTimes = useMemo(() => {
    const half = Math.floor(THUMBNAIL_COUNT / 2);
    return Array.from({ length: THUMBNAIL_COUNT }, (_, i) => {
      const t = seekTime + (i - half) * 30;
      return Math.max(0, Math.min(totalDuration, t));
    });
  }, [seekTime, totalDuration]);

  // Kad se pokrene seeking, odmah zatraži sve frameove koji su nam potrebni
  useEffect(() => {
    if (!isSeeking) return;
    seekThumbnailTimes.forEach((t) => requestFrame(t));
  }, [isSeeking, seekThumbnailTimes, requestFrame]);

  // commitSeek — stvarno seekuje video, poziva se s debounceom
  const commitSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    setIsBuffering(true);
    if (typeof (video as HTMLVideoElement & { fastSeek?: (t: number) => void }).fastSeek === "function") {
      (video as HTMLVideoElement & { fastSeek: (t: number) => void }).fastSeek(time);
    } else {
      video.currentTime = time;
    }
  }, []);

  const seekVideo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, totalDurationRef.current));

      // Pauziraj video prvi put kad korisnik uđe u seek način.
      const video = videoRef.current;
      if (!isSeekingRef.current) {
        wasPlayingBeforeSeekRef.current = video ? !video.paused : false;
        if (video && !video.paused) {
          try {
            video.pause();
          } catch {
            /* noop */
          }
        }
      }

      // Samo ažuriraj UI/preview — video se NE pomiče dok korisnik ne potvrdi s OK.
      pendingSeekRef.current = clamped;
      updateProgressDom(clamped);
      setSeekTime(clamped);
      isSeekingRef.current = true;
      setIsSeeking(true);
      // HUD + seek preview ostaju vidljivi do potvrde.
      setIsVisible(true);
      cancelHideTimer();

      // Očisti eventualni raniji debounce timer — više ne komitamo automatski.
      if (pendingSeekTimerRef.current) {
        clearTimeout(pendingSeekTimerRef.current);
        pendingSeekTimerRef.current = null;
      }
    },
    [updateProgressDom, cancelHideTimer],
  );

  // Potvrda seeka (OK gumb) — sada stvarno pomakni video na odabranu poziciju.
  const confirmSeek = useCallback(() => {
    const target = pendingSeekRef.current;
    pendingSeekRef.current = null;
    if (target === null) {
      setIsSeeking(false);
      return;
    }
    currentTimeRef.current = target;
    updateProgressDom(target);
    commitSeek(target);
    setIsSeeking(false);
    // Nakon potvrde uvijek pokreni reprodukciju s odabrane pozicije.
    const video = videoRef.current;
    if (video) {
      try {
        video.play().catch(() => {});
      } catch {
        /* noop */
      }
    }
    wasPlayingBeforeSeekRef.current = false;
  }, [commitSeek, updateProgressDom]);

  // Otkazivanje seeka (Escape / promjena reda) — vrati UI na trenutnu poziciju videa.
  const cancelSeek = useCallback(() => {
    pendingSeekRef.current = null;
    if (pendingSeekTimerRef.current) {
      clearTimeout(pendingSeekTimerRef.current);
      pendingSeekTimerRef.current = null;
    }
    updateProgressDom(currentTimeRef.current);
    setSeekTime(currentTimeRef.current);
    setIsSeeking(false);
    // Ako je video svirao prije ulaska u seek, nastavi reprodukciju.
    if (wasPlayingBeforeSeekRef.current) {
      const video = videoRef.current;
      if (video) {
        try {
          video.play().catch(() => {});
        } catch {
          /* noop */
        }
      }
    }
    wasPlayingBeforeSeekRef.current = false;
  }, [updateProgressDom]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!loaderDone || !videoReady) return;

      if (!isVisible) {
        // Escape/Back radi i kad je HUD skriven — odmah izlazi iz playera.
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          onClose();
          return;
        }
        setIsVisible(true);
        startHideTimer();
        return;
      }


      startHideTimer();

      if (subtitleModalRef.current || audioModalRef.current || fontModalRef.current) return;
      if (episodesPanelRef.current) return;

      if ((e.key === "e" || e.key === "E") && hasEpisodesRef.current) {
        e.preventDefault();
        setShowEpisodesPanel(true);
        return;
      }

      switch (e.key) {
        case "Escape":
        case "Backspace":
          e.preventDefault();
          if (isSeeking) {
            cancelSeek();
          } else {
            // Back/Escape zatvara player u cijelosti — komponenta se demontira,
            // video/HLS se uništava i fokus se vraća na prethodni korak.
            onClose();
          }
          break;


        case "ArrowRight":
          e.preventDefault();
          // Dok je seek aktivan, strelice samo pomiču poziciju (bez promjene fokusa).
          if (isSeeking) {
            seekVideo((pendingSeekRef.current ?? seekTime) + SEEK_STEP);
            break;
          }
          if (focusedRow === 2) {
            if (focusedCol === 1) {
              setFocusedCol(2);
            } else if (focusedCol === 2) {
              seekVideo(currentTimeRef.current + SEEK_STEP);
            } else {
              setFocusedCol((prev) => Math.min(prev + 1, ROW_SIZES[focusedRow] - 1));
            }
          } else {
            setFocusedCol((prev) => Math.min(prev + 1, ROW_SIZES[focusedRow] - 1));
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (isSeeking) {
            seekVideo((pendingSeekRef.current ?? seekTime) - SEEK_STEP);
            break;
          }
          if (focusedRow === 2) {
            if (focusedCol === 1) {
              setFocusedCol(0);
            } else if (focusedCol === 0) {
              seekVideo(currentTimeRef.current - SEEK_STEP);
            } else {
              setFocusedCol((prev) => Math.max(prev - 1, 0));
            }
          } else {
            setFocusedCol((prev) => Math.max(prev - 1, 0));
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          // Dok skrolamo seek preview, ne dopusti promjenu reda — mora se potvrditi (OK) ili otkazati (Escape).
          if (isSeeking) break;
          if (focusedRow < ROW_SIZES.length - 1) {
            setFocusedRow((prev) => prev + 1);
            setFocusedCol(0);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (isSeeking) break;
          if (focusedRow > 0) {
            setFocusedRow((prev) => prev - 1);
            setFocusedCol(0);
          }
          break;

        case "Enter":
          e.preventDefault();
          // Dok je seek preview aktivan, OK ga uvijek potvrđuje i pokreće reprodukciju.
          if (isSeeking) {
            confirmSeek();
            startPlayback(150);
            break;
          }

          if (focusedRow === 0) {
            if (focusedCol === 0) onClose();
            if (focusedCol === 1) {
              if (videoRef.current) videoRef.current.currentTime = 0;
              currentTimeRef.current = 0;
              updateProgressDom(0);
              startPlayback(800);
            }
            if (focusedCol === 2 && onNextEpisode) onNextEpisode();
          } else if (focusedRow === 2) {
            if (focusedCol === 0)
              seekVideo((isSeeking ? (pendingSeekRef.current ?? seekTime) : currentTimeRef.current) - 10);
            if (focusedCol === 1) {
              if (isSeeking) {
                // OK potvrđuje seek preview i pokreće reprodukciju s odabrane pozicije.
                confirmSeek();
                startPlayback(150);
              } else if (videoRef.current?.paused) {
                startPlayback(150);
              } else {
                pausePlayback();
              }
            }
            if (focusedCol === 2)
              seekVideo((isSeeking ? (pendingSeekRef.current ?? seekTime) : currentTimeRef.current) + 10);
          } else if (focusedRow === 3) {
            if (focusedCol === 0) openSubtitleModal(DUMMY_SUBTITLES.findIndex((s) => s.code === selectedSubtitle));
            if (focusedCol === 1) openAudioModal(DUMMY_AUDIO_TRACKS.findIndex((a) => a.code === selectedAudio));
            if (focusedCol === 2) openFontModal(DUMMY_FONTS.findIndex((f) => f.code === selectedFont));
          }
          break;
      }
    },
    [
    loaderDone,
    isVisible,
    focusedRow,
    focusedCol,
    seekVideo,
    startHideTimer,
    onClose,
    startPlayback,
    pausePlayback,
    onNextEpisode,
    selectedSubtitle,
    selectedAudio,
    selectedFont,
    videoReady,
    isSeeking,
    seekTime,
    confirmSeek,
    cancelSeek,
    updateProgressDom,
  ]);

  useZoneKeys("videoteka-player", handleKeyDown, true, 40);

  const handleModalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!subtitleModalRef.current && !audioModalRef.current && !fontModalRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      if (subtitleModalRef.current) {
        if (e.key === "Escape" || e.key === "Backspace") closeSubtitleModal();
        else if (e.key === "ArrowDown")
          setSubtitleFocusIdx((prev) => {
            const n = Math.min(prev + 1, DUMMY_SUBTITLES.length - 1);
            subtitleFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "ArrowUp")
          setSubtitleFocusIdx((prev) => {
            const n = Math.max(prev - 1, 0);
            subtitleFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "Enter") {
          setSelectedSubtitle(DUMMY_SUBTITLES[subtitleFocusIdxRef.current].code);
          closeSubtitleModal();
        }
      } else if (audioModalRef.current) {
        if (e.key === "Escape" || e.key === "Backspace") closeAudioModal();
        else if (e.key === "ArrowDown")
          setAudioFocusIdx((prev) => {
            const n = Math.min(prev + 1, DUMMY_AUDIO_TRACKS.length - 1);
            audioFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "ArrowUp")
          setAudioFocusIdx((prev) => {
            const n = Math.max(prev - 1, 0);
            audioFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "Enter") {
          setSelectedAudio(DUMMY_AUDIO_TRACKS[audioFocusIdxRef.current].code);
          closeAudioModal();
        }
      } else if (fontModalRef.current) {
        if (e.key === "Escape" || e.key === "Backspace") closeFontModal();
        else if (e.key === "ArrowDown")
          setFontFocusIdx((prev) => {
            const n = Math.min(prev + 1, DUMMY_FONTS.length - 1);
            fontFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "ArrowUp")
          setFontFocusIdx((prev) => {
            const n = Math.max(prev - 1, 0);
            fontFocusIdxRef.current = n;
            return n;
          });
        else if (e.key === "Enter") {
          setSelectedFont(DUMMY_FONTS[fontFocusIdxRef.current].code);
          closeFontModal();
        }
      }
    },
    [closeSubtitleModal, closeAudioModal, closeFontModal],
  );

  useZoneKeys(
    "videoteka-player-modal",
    handleModalKeyDown,
    showSubtitleModal || showAudioModal || showFontModal,
    50,
  );

  // ── Keyboard za episode panel ─────────────────────────────────────────────
  const episodesPanelKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const currentSeason = seasons[epSeasonIdx];
      const epCount = currentSeason?.episodes.length ?? 0;
      if (e.key === "Escape" || e.key === "Backspace") {
        setShowEpisodesPanel(false);
        return;
      }
      if (e.key === "ArrowLeft") {
        setEpFocusArea("seasons");
        return;
      }
      if (e.key === "ArrowRight") {
        if (epCount > 0) setEpFocusArea("episodes");
        return;
      }
      if (e.key === "ArrowUp") {
        if (epFocusArea === "seasons") {
          setEpSeasonIdx((i) => Math.max(0, i - 1));
          setEpEpisodeIdx(0);
        } else {
          setEpEpisodeIdx((i) => Math.max(0, i - 1));
        }
        return;
      }
      if (e.key === "ArrowDown") {
        if (epFocusArea === "seasons") {
          setEpSeasonIdx((i) => Math.min(seasons.length - 1, i + 1));
          setEpEpisodeIdx(0);
        } else {
          setEpEpisodeIdx((i) => Math.min(Math.max(0, epCount - 1), i + 1));
        }
        return;
      }
      if (e.key === "Enter") {
        if (epFocusArea === "seasons") {
          if (epCount > 0) setEpFocusArea("episodes");
        } else {
          const ep = currentSeason?.episodes[epEpisodeIdx];
          if (ep) {
            setSelectedEpisodeId(ep.id);
            setStreamError(null);
            setShowEpisodesPanel(false);
          }
        }
      }
    },
    [epFocusArea, epSeasonIdx, epEpisodeIdx, seasons],
  );

  useZoneKeys("videoteka-player-episodes", episodesPanelKeyDown, showEpisodesPanel, 60);

  const skipActive = skipHovered || (focusedRow === 0 && focusedCol === 2);

  return (
    <div ref={playerRootRef} className="fixed inset-0 z-[100] bg-black font-sans overflow-hidden">
      <div className="absolute inset-0">
        <FrozenHlsVideo
          streamUrl={effectiveStreamUrl}
          thumbnail={thumbnail}
          fetchingStream={fetchingStream}
          fetchError={fetchError}
          videoRef={videoRef}
          hlsRef={hlsRef}
          onReady={markVideoReady}
          onError={setStreamError}
          onDuration={handleDuration}
          onPlayStateChange={handlePlayStateChange}
          onTimeSnapshot={handleTimeSnapshot}
        />
      </div>

      {streamError && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/85">
          <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
            <p className="text-white text-lg">{streamError}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-md bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {!loaderDone && !streamError && <Loader key="loader" ready={videoReady} onDone={markVideoReady} />}
      </AnimatePresence>

      {/* ── Buffering spinner — prikazuje se dok čeka segment nakon seeka ── */}
      <AnimatePresence>
        {loaderDone && isBuffering && (
          <motion.div
            key="buffering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 z-[50] flex items-center justify-center pointer-events-none"
          >
            <svg width={56} height={56} viewBox="0 0 56 56" style={{ animation: "spin 0.9s linear infinite" }}>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="#F5C518"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="138"
                strokeDashoffset="100"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loaderDone && isVisible && (
          <motion.div
            key="player-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 flex flex-col z-20"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/70" />

            <div
              className="relative flex flex-col h-full pt-16 pb-12"
              style={{ transform: "scale(1.08)", transformOrigin: "center center" }}
            >
              <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-4">
                {/* TOP AREA */}
                <div className="flex-1 flex flex-col mt-5">
                  <div
                    className={`flex items-center justify-between transition-opacity duration-300 ${
                      isSeeking ? "opacity-0 pointer-events-none" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <ArrowLeft
                        className={`w-8 h-8 transition-all ${
                          focusedRow === 0 && focusedCol === 0 ? "text-white scale-110" : "text-muted-foreground"
                        }`}
                      />
                      <div
                        className={`relative flex items-center justify-center transition-all ${
                          focusedRow === 0 && focusedCol === 1 ? "text-white scale-110" : "text-muted-foreground"
                        }`}
                      >
                        <RotateCcw className="w-10 h-10" />
                        <Play className="absolute w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div
                        onMouseEnter={() => setSkipHovered(true)}
                        onMouseLeave={() => setSkipHovered(false)}
                        onClick={() => {
                          if (onNextEpisode) onNextEpisode();
                        }}
                        style={{
                          color: skipActive ? "#ffffff" : "#71717a",
                          transform: skipActive ? "scale(1.1)" : "scale(1)",
                          transition: "color 0.15s ease, transform 0.15s ease",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SkipForward className="w-9 h-9" />
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <p className="text-sm font-bold">{title}</p>
                      {episodeInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5">{episodeInfo}</p>
                      )}
                    </div>
                  </div>

                  {/* Logo + naslov + like/dislike */}
                  <div className="flex-1 flex flex-col justify-end items-center pb-6">
                    <div className="relative w-full flex justify-center" style={{ height: 0 }}>
                      <img
                        src={logo}
                        alt="Logo"
                        className="w-auto pointer-events-none transition-opacity duration-300"
                        style={{
                          height: "280px",
                          position: "absolute",
                          /* FIX: clamp(min,pref,max) mora imati min < max. Prije je bilo
                             clamp(-40px, -6vw, -90px) što je nevažeći poredak (-40 > -90)
                             pa je vrijednost uvijek "zapinjala" na -40px (logo previsoko).
                             Sada je ispravno poredano; malo podignuto u odnosu na prijašnju verziju. */
                          bottom: "-219px",
                          opacity: isSeeking ? 0 : 1,
                        }}
                      />
                    </div>
                    <div
                      className={`transition-opacity duration-300 ${
                        isSeeking ? "opacity-0 pointer-events-none" : "opacity-100"
                      } flex flex-col items-center`}
                      style={{ marginTop: "112px" }}
                    >
                      <h1 className="text-4xl font-black text-white tracking-tight mb-6 uppercase leading-tight text-center">
                        {title}
                      </h1>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 flex items-center justify-center rounded-full border border-white/20 bg-muted/40 transition-all ${
                            focusedRow === 1 && focusedCol === 0 ? "bg-white text-black" : "text-white"
                          }`}
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-11 h-11 flex items-center justify-center rounded-full border border-white/20 bg-muted/40 transition-all ${
                            focusedRow === 1 && focusedCol === 1 ? "bg-white text-black" : "text-white"
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM AREA */}
                <div className="flex flex-col gap-4 pb-4 w-full">
                  {/* ── NOVO: Thumbnail strip s pravim frame capture-om ─────── */}
                  <div className="h-44 flex items-end justify-center">
                    <AnimatePresence>
                      {isSeeking && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-2 mb-4"
                        >
                          {seekThumbnailTimes.map((t, i) => {
                            const isCentre = i === Math.floor(THUMBNAIL_COUNT / 2);
                            // Pokušaj dohvatiti stvarni frame; fallback na poster
                            const frameSrc = seekFrames.get(Math.round(t)) ?? thumbnail;
                            return (
                              <div
                                key={i}
                                className={`relative overflow-hidden transition-all duration-200 ${
                                  isCentre
                                    ? "w-56 h-32 z-10 scale-110 ring-1 ring-white"
                                    : "w-40 h-24 opacity-50"
                                }`}
                              >
                                <img
                                  src={frameSrc}
                                  className="w-full h-full object-cover"
                                  alt="seek preview"
                                  // crossOrigin potrebno za canvas taint ako src nije isti origin
                                  crossOrigin="anonymous"
                                />
                                {isCentre && (
                                  <div className="absolute bottom-1 left-0 right-0 text-center">
                                    <span className="text-[15px] text-white font-bold font-mono drop-shadow">
                                      {formatTime(t)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-4 w-full">
                    <span
                      ref={elapsedTextRef}
                      className="text-sm font-mono tabular-nums text-muted-foreground w-12"
                    >
                      {elapsed}
                    </span>
                    <div className="flex-1 rounded-full relative bg-white/20" style={{ height: "3px" }}>
                      <div
                        ref={progressFillRef}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: GOLD,
                          width: `${(displayTime / totalDuration) * 100}%`,
                        }}
                      />
                    </div>
                    <div
                      ref={remainingTextRef}
                      className="min-w-[50px] text-right text-sm font-mono tabular-nums text-muted-foreground"
                    >
                      {remaining}
                    </div>
                  </div>

                  {/* Rewind | Play/Pause | FastForward */}
                  <div className="flex justify-center items-center gap-4">
                    <div
                      className="flex items-center justify-center w-[42px] h-[42px] transition-all duration-200 cursor-pointer"
                      style={{
                        color: GOLD,
                        transform: focusedRow === 2 && focusedCol === 0 ? "scale(1.2)" : "scale(1)",
                      }}
                      onClick={() => seekVideo(currentTimeRef.current - 10)}
                    >
                      <Rewind className="w-7 h-7 fill-current" />
                    </div>

                    <div className="w-[52px] h-[52px]">
                      <div
                        className="flex items-center justify-center rounded-full w-full h-full transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          if (videoRef.current?.paused) startPlayback(150);
                          else pausePlayback();
                        }}
                        style={{
                          backgroundColor: GOLD,
                          color: "#0d0d0d",
                          transform: focusedRow === 2 && focusedCol === 1 ? "translate3d(0,0,0) scale(1.15)" : "translate3d(0,0,0)",
                        }}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-center w-[42px] h-[42px] transition-all duration-200 cursor-pointer"
                      style={{
                        color: GOLD,
                        transform: focusedRow === 2 && focusedCol === 2 ? "scale(1.2)" : "scale(1)",
                      }}
                      onClick={() => seekVideo(currentTimeRef.current + 10)}
                    >
                      <FastForward className="w-7 h-7 fill-current" />
                    </div>
                  </div>

                  {/* Subtitle | Audio | Aa */}
                  <div className="flex w-full">
                    <div className="min-w-[136px]" />
                    <div className="flex-1 flex justify-center items-center gap-4">
                      {CONTROL_OPTIONS.map((opt, i) => {
                        const isFocused = focusedRow === 3 && focusedCol === i;
                        return (
                          <div
                            key={opt.label}
                            onClick={() => {
                              if (opt.label === "Subtitle")
                                openSubtitleModal(DUMMY_SUBTITLES.findIndex((s) => s.code === selectedSubtitle));
                              if (opt.label === "Audio")
                                openAudioModal(DUMMY_AUDIO_TRACKS.findIndex((a) => a.code === selectedAudio));
                              if (opt.label === "Aa")
                                openFontModal(DUMMY_FONTS.findIndex((f) => f.code === selectedFont));
                            }}
                            className={`w-32 h-10 flex items-center justify-center rounded-xl border border-white/20 bg-muted/40 transition-all cursor-pointer ${
                              isFocused ? "bg-white scale-105" : ""
                            }`}
                          >
                            <div
                              className={`flex items-center gap-2 font-bold transition-colors ${
                                isFocused ? "text-black" : "text-white"
                              } text-xs`}
                            >
                              {opt.hasIcon && opt.icon && <opt.icon className="w-4 h-4" />}
                              <span className={opt.label === "Aa" ? "text-base" : ""}>{opt.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="min-w-[66px]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Subtitle Modal ── */}
      <AnimatePresence>
        {showSubtitleModal && (
          <>
            <motion.div
              key="subtitle-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSubtitleModal}
              className="fixed inset-0 z-[300]"
              style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            />
            <motion.div
              key="subtitle-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none px-4"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto w-full"
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  maxWidth: "420px",
                }}
              >
                <div
                  className="flex items-center px-7 pt-7 pb-5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-white font-bold text-xl tracking-tight">Titlovi</h2>
                </div>
                <div className="py-3">
                  {DUMMY_SUBTITLES.map((sub, idx) => {
                    const isActive = selectedSubtitle === sub.code;
                    const isFocused = subtitleFocusIdx === idx;
                    return (
                      <button
                        key={sub.code}
                        onClick={() => {
                          setSelectedSubtitle(sub.code);
                          closeSubtitleModal();
                        }}
                        className="w-full flex items-center justify-between px-7 py-4 transition-all"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isFocused
                            ? "rgba(255,255,255,0.1)"
                            : isActive
                              ? "rgba(245,197,24,0.08)"
                              : "transparent",
                          outline: isFocused ? "2px solid rgba(255,255,255,0.3)" : "none",
                          outlineOffset: "-2px",
                        }}
                      >
                        <span
                          className="text-base font-medium"
                          style={{ color: isActive ? GOLD : "#ffffff" }}
                        >
                          {sub.label}
                        </span>
                        {isActive && <span style={{ color: GOLD, fontSize: "21px" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="px-7 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Odabrani titl primjenjuje se samo na ovaj video.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Audio Modal ── */}
      <AnimatePresence>
        {showAudioModal && (
          <>
            <motion.div
              key="audio-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAudioModal}
              className="fixed inset-0 z-[300]"
              style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            />
            <motion.div
              key="audio-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none px-4"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto w-full"
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  maxWidth: "420px",
                }}
              >
                <div
                  className="flex items-center px-7 pt-7 pb-5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-white font-bold text-xl tracking-tight">Audio</h2>
                </div>
                <div className="py-3">
                  {DUMMY_AUDIO_TRACKS.map((track, idx) => {
                    const isActive = selectedAudio === track.code;
                    const isFocused = audioFocusIdx === idx;
                    return (
                      <button
                        key={track.code}
                        onClick={() => {
                          setSelectedAudio(track.code);
                          closeAudioModal();
                        }}
                        className="w-full flex items-center justify-between px-7 py-4 transition-all"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isFocused
                            ? "rgba(255,255,255,0.1)"
                            : isActive
                              ? "rgba(245,197,24,0.08)"
                              : "transparent",
                          outline: isFocused ? "2px solid rgba(255,255,255,0.3)" : "none",
                          outlineOffset: "-2px",
                        }}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className="text-base font-medium"
                            style={{ color: isActive ? GOLD : "#ffffff" }}
                          >
                            {track.label}
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: isActive ? "rgba(245,197,24,0.6)" : "rgba(255,255,255,0.35)",
                            }}
                          >
                            {track.description}
                          </span>
                        </div>
                        {isActive && <span style={{ color: GOLD, fontSize: "21px" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="px-7 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Odabrani audio jezik primjenjuje se samo na ovaj video.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Font Modal ── */}
      <AnimatePresence>
        {showFontModal && (
          <>
            <motion.div
              key="font-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeFontModal}
              className="fixed inset-0 z-[300]"
              style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            />
            <motion.div
              key="font-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none px-4"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto w-full"
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  maxWidth: "420px",
                }}
              >
                <div
                  className="flex items-center px-7 pt-7 pb-5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-white font-bold text-xl tracking-tight">Font titlova</h2>
                </div>
                <div className="py-3">
                  {DUMMY_FONTS.map((font, idx) => {
                    const isActive = selectedFont === font.code;
                    const isFocused = fontFocusIdx === idx;
                    return (
                      <button
                        key={font.code}
                        onClick={() => {
                          setSelectedFont(font.code);
                          closeFontModal();
                        }}
                        className="w-full flex items-center justify-between px-7 py-4 transition-all"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isFocused
                            ? "rgba(255,255,255,0.1)"
                            : isActive
                              ? "rgba(245,197,24,0.08)"
                              : "transparent",
                          outline: isFocused ? "2px solid rgba(255,255,255,0.3)" : "none",
                          outlineOffset: "-2px",
                        }}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className="text-base font-medium"
                            style={{
                              color: isActive ? GOLD : "#ffffff",
                              fontFamily:
                                font.code === "serif"
                                  ? "Georgia, serif"
                                  : font.code === "mono"
                                    ? "monospace"
                                    : font.code === "rounded"
                                      ? "ui-rounded, system-ui, sans-serif"
                                      : font.code === "condensed"
                                        ? "Arial Narrow, sans-serif"
                                        : "inherit",
                            }}
                          >
                            {font.label}
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: isActive ? "rgba(245,197,24,0.6)" : "rgba(255,255,255,0.35)",
                            }}
                          >
                            {font.description}
                          </span>
                        </div>
                        {isActive && <span style={{ color: GOLD, fontSize: "21px" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="px-7 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Odabrani font primjenjuje se samo na titlove ovog videa.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ── Episode selector panel (za serije) ─────────────────────────── */}
      {hasEpisodes && (
        <button
          type="button"
          onClick={() => setShowEpisodesPanel(true)}
          className="absolute top-6 right-6 z-[160] px-4 py-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-sm font-semibold border border-white/20"
        >
          Epizode
        </button>
      )}

      <AnimatePresence>
        {showEpisodesPanel && (
          <motion.div
            key="episodes-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[170] flex bg-black/80"
          >
            {/* Seasons */}
            <div className="w-[280px] shrink-0 h-full overflow-y-auto p-6 border-r border-white/10">
              <h3 className="text-white/50 text-xs uppercase tracking-widest mb-4">Sezone</h3>
              <div className="flex flex-col gap-1">
                {seasons.map((s, idx) => {
                  const isFocused = epFocusArea === "seasons" && epSeasonIdx === idx;
                  const isSelected = epSeasonIdx === idx;
                  return (
                    <button
                      key={s.id}
                      onMouseEnter={() => {
                        setEpFocusArea("seasons");
                        setEpSeasonIdx(idx);
                        setEpEpisodeIdx(0);
                      }}
                      onClick={() => {
                        setEpSeasonIdx(idx);
                        setEpEpisodeIdx(0);
                        setEpFocusArea("episodes");
                      }}
                      className={`text-left px-4 py-3 rounded-lg transition ${
                        isSelected ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
                      } ${isFocused ? "ring-2 ring-inset ring-white/50" : ""}`}
                    >
                      <div className="font-semibold">Sezona {s.season_number}</div>
                      <div className="text-xs text-white/40">{s.episodes.length} epizoda</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Episodes */}
            <div className="flex-1 h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-bold">Sezona {seasons[epSeasonIdx]?.season_number ?? ""}</h3>
                <button onClick={() => setShowEpisodesPanel(false)} className="text-white/60 hover:text-white text-sm">
                  Zatvori (Esc)
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {(seasons[epSeasonIdx]?.episodes ?? []).map((ep, idx) => {
                  const isFocused = epFocusArea === "episodes" && epEpisodeIdx === idx;
                  const isActive = ep.id === selectedEpisodeId;
                  return (
                    <button
                      key={ep.id}
                      onMouseEnter={() => {
                        setEpFocusArea("episodes");
                        setEpEpisodeIdx(idx);
                      }}
                      onClick={() => {
                        setSelectedEpisodeId(ep.id);
                        setStreamError(null);
                        setShowEpisodesPanel(false);
                      }}
                      className={`flex gap-4 items-stretch text-left p-3 rounded-lg transition ${
                        isActive ? "bg-white/15" : "hover:bg-white/10"
                      } ${isFocused ? "ring-2 ring-white/60" : ""}`}
                    >
                      <div className="w-[160px] aspect-video shrink-0 rounded-md overflow-hidden bg-white/5 relative">
                        {ep.thumbnail_url ? (
                          <img
                            src={ep.thumbnail_url}
                            alt={ep.title ?? `Epizoda ${ep.episode_number}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-white/30 text-2xl">
                            {ep.episode_number}
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[13px] px-1.5 py-0.5 rounded">
                          E{ep.episode_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-white font-semibold truncate">
                            {ep.title ?? `Epizoda ${ep.episode_number}`}
                          </h4>
                          {ep.duration && <span className="shrink-0 text-white/40 text-xs">{ep.duration}</span>}
                        </div>
                        {ep.description && <p className="text-white/50 text-xs line-clamp-2">{ep.description}</p>}
                      </div>
                    </button>
                  );
                })}
                {(seasons[epSeasonIdx]?.episodes.length ?? 0) === 0 && (
                  <p className="text-white/40 text-sm">Nema dostupnih epizoda za ovu sezonu.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideotekaPlayer;
