import { memo, useState, useEffect, useCallback, useMemo, useRef, type MutableRefObject } from "react";
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
}

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
const ZERO_UI_VIDEO_TEST = true;

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

    const playInitial = useCallback(() => {
      const video = localVideoRef.current;
      if (!video) return;
      video.muted = true;
      video.play().catch(() => {});
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

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const isNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
      const hasHEVC = supportsHEVC();

      if (Hls.isSupported() && !isNativeHls) {
        const hlsConfig = {
          enableWorker: true,
          forceVideoHWAcceleration: true,
          progressive: true,
          lowLatencyMode: false,
          autoStartLoad: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 300 * 1000 * 1000,
          backBufferLength: 60,
          startLevel: -1,
          abrEwmaFastVoD: 4.0,
          abrEwmaSlowVoD: 15.0,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.75,
          manifestLoadingMaxRetry: 8,
          levelLoadingMaxRetry: 8,
          fragLoadingMaxRetry: 12,
          fragLoadingRetryDelay: 1000,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 30000,
          levelLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 20000,
        } as ConstructorParameters<typeof Hls>[0] & { forceVideoHWAcceleration: boolean };
        const hls = new Hls(hlsConfig);

        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.startLoad();
          playInitial();

          if (!hasHEVC && hls.levels?.length) {
            const supported = hls.levels
              .map((lvl, idx) => ({ lvl, idx }))
              .filter(({ lvl }) => {
                const codec = (lvl.videoCodec ?? "").toLowerCase();
                return !(codec.startsWith("hvc1") || codec.startsWith("hev1"));
              });
            if (supported.length && supported.length < hls.levels.length) {
              hls.autoLevelCapping = supported[supported.length - 1].idx;
            }
          }
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try {
              hls.recoverMediaError();
              return;
            } catch {
              /* fallthrough */
            }
          }
          onError("Reprodukcija nije uspjela.");
        });
      } else if (isNativeHls) {
        video.src = streamUrl;
        playInitial();
      } else {
        onError("Vaš preglednik ne podržava HLS reprodukciju.");
      }

      const bypassTimer = setTimeout(() => {
        onReady();
        playInitial();
      }, LOADER_MAX_DURATION);

      return () => {
        clearTimeout(bypassTimer);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [streamUrl, fetchingStream, fetchError, hlsRef, onError, onReady, playInitial]);

    useEffect(() => {
      const video = localVideoRef.current;
      if (!video) return;

      let lastTime = video.currentTime;
      let stalledFor = 0;
      let recoveryStage = 0;
      let lastRecoveryAt = 0;

      const STALL_MS = 3000;
      const TICK_MS = 500;
      const RECOVERY_COOLDOWN_MS = 8000;

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
      const onTimeUpdate = () => onTimeSnapshot(Math.floor(video.currentTime));
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
        className="relative z-10 w-full h-full object-contain bg-black"
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          contain: "strict",
        }}
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
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;

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
      const p = Math.min(90, Math.round(eased * 90));
      setPercent(p);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
          style={{ color: GOLD, fontSize: "15px" }}
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
}: VideotekaPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const {
    data: movie,
    isLoading: fetchingStream,
    error: fetchError,
  } = useMovieStream(streamUrlProp ? undefined : itemId);
  const streamUrl = streamUrlProp ?? movie?.stream_url ?? null;

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
  const [skipHovered, setSkipHovered] = useState(false);

  // Modal state
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
    if (remainingTextRef.current) remainingTextRef.current.textContent = formatTime(Math.max(0, safeDuration - clamped));
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

  // Auto-hide timer
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);
  const startHideTimer = useCallback(() => {
    cancelHideTimer();
    hideTimerRef.current = setTimeout(() => setIsVisible(false), 3000);
  }, [cancelHideTimer]);

  const unmuteVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
  }, []);

  const startPlayback = useCallback(
    (delay = 150) => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        video.volume = 1;
        if (video.paused) {
          video.play().catch(() => {
            video.muted = true;
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
    if (isVisible && isPlaying) startHideTimer();
    else cancelHideTimer();
    return () => cancelHideTimer();
  }, [isVisible, isPlaying, startHideTimer, cancelHideTimer]);

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
      currentTimeRef.current = time;
      if (!isSeekingRef.current) updateProgressDom(time);
    },
    [updateProgressDom],
  );

  useEffect(() => {
    isSeekingRef.current = isSeeking;
    updateProgressDom(isSeeking ? seekTime : currentTimeRef.current);
  }, [isSeeking, seekTime, updateProgressDom]);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleDuration = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  const handleSeeked = useCallback(() => setIsSeeking(false), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [handleSeeked]);

  const displayTime = isSeeking ? seekTime : currentTimeRef.current;
  const elapsed = formatTime(displayTime);
  const remaining = formatTime(Math.max(0, totalDuration - displayTime));

  const seekThumbnails = useMemo(() => {
    const half = Math.floor(THUMBNAIL_COUNT / 2);
    return Array.from({ length: THUMBNAIL_COUNT }, (_, i) => {
      const t = seekTime + (i - half) * 30;
      return Math.max(0, Math.min(totalDuration, t));
    });
  }, [seekTime, totalDuration]);

  const seekVideo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, totalDurationRef.current));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    currentTimeRef.current = clamped;
    updateProgressDom(clamped);
    setSeekTime(clamped);
    setIsSeeking(true);
  }, [updateProgressDom]);

  // ── Main keyboard handler ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!loaderDone || !videoReady) return;

      if (!isVisible) {
        setIsVisible(true);
        startHideTimer();
        return;
      }

      startHideTimer();

      if (subtitleModalRef.current || audioModalRef.current || fontModalRef.current) return;

      switch (e.key) {
        case "Escape":
        case "Backspace":
          e.preventDefault();
          setIsVisible(false);
          break;

        case "ArrowRight":
          e.preventDefault();
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
          if (focusedRow < ROW_SIZES.length - 1) {
            setIsSeeking(false);
            setFocusedRow((prev) => prev + 1);
            setFocusedCol(0);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (focusedRow > 0) {
            setIsSeeking(false);
            setFocusedRow((prev) => prev - 1);
            setFocusedCol(0);
          }
          break;

        case "Enter":
          e.preventDefault();
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
            if (focusedCol === 0) seekVideo(currentTimeRef.current - 10);
            if (focusedCol === 1) {
              setIsSeeking(false);
              if (videoRef.current?.paused) startPlayback(150);
              else pausePlayback();
            }
            if (focusedCol === 2) seekVideo(currentTimeRef.current + 10);
          } else if (focusedRow === 3) {
            if (focusedCol === 0) openSubtitleModal(DUMMY_SUBTITLES.findIndex((s) => s.code === selectedSubtitle));
            if (focusedCol === 1) openAudioModal(DUMMY_AUDIO_TRACKS.findIndex((a) => a.code === selectedAudio));
            if (focusedCol === 2) openFontModal(DUMMY_FONTS.findIndex((f) => f.code === selectedFont));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
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
  ]);

  // ── Capture-phase listener za modale ──
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
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
    };

    window.addEventListener("keydown", handleModalKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleModalKeyDown, { capture: true });
  }, []);

  const skipActive = skipHovered || (focusedRow === 0 && focusedCol === 2);
  const zeroUiActive = ZERO_UI_VIDEO_TEST && isPlaying;

  return (
    <div className="fixed inset-0 z-[100] bg-black font-sans overflow-hidden">
      <div className="absolute inset-0">
        <FrozenHlsVideo
          streamUrl={streamUrl}
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

      {streamError && !zeroUiActive && (
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
        {!zeroUiActive && !loaderDone && !streamError && <Loader key="loader" ready={videoReady} onDone={markVideoReady} />}
      </AnimatePresence>

      <AnimatePresence>
        {!zeroUiActive && loaderDone && isVisible && (
          <motion.div
            key="player-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 flex flex-col z-20 pointer-events-none"
          >
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(0,0,0,0.38)" }} />

            <div className="relative flex flex-col h-full pt-14 pb-6 pointer-events-none">
              <div className="w-full max-w-5xl mx-auto flex flex-col h-full px-4">
                {/* TOP AREA */}
                <div className="flex-1 flex flex-col">
                  <div
                    className={`flex items-center justify-between transition-opacity duration-300 ${isSeeking ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                  >
                    <div className="flex items-center gap-6">
                      <ArrowLeft
                        className={`w-8 h-8 transition-colors ${focusedRow === 0 && focusedCol === 0 ? "text-white" : "text-muted-foreground"}`}
                      />
                      <div
                        className={`relative flex items-center justify-center transition-colors ${focusedRow === 0 && focusedCol === 1 ? "text-white" : "text-muted-foreground"}`}
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
                          transition: "color 0.15s ease",
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
                      {episodeInfo && <p className="text-xs text-muted-foreground mt-0.5">{episodeInfo}</p>}
                    </div>
                  </div>

                  {/* Logo + naslov + like/dislike */}
                  <div className="flex-1 flex flex-col justify-end items-center pb-6">
                    <div className="relative w-full flex justify-center" style={{ height: 0 }}>
                      <img
                        src={logo}
                        alt="Logo"
                        className="w-auto pointer-events-none transition-opacity duration-300"
                        style={{ height: "280px", position: "absolute", bottom: "-90px", opacity: isSeeking ? 0 : 1 }}
                      />
                    </div>
                    <div
                      className={`transition-opacity duration-300 ${isSeeking ? "opacity-0 pointer-events-none" : "opacity-100"} flex flex-col items-center`}
                    >
                      <h1 className="text-4xl font-black text-white tracking-tight mb-6 uppercase leading-tight text-center">
                        {title}
                      </h1>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 flex items-center justify-center rounded-full border border-white/20 bg-muted/40 transition-all ${focusedRow === 1 && focusedCol === 0 ? "bg-white text-black" : "text-white"}`}
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-11 h-11 flex items-center justify-center rounded-full border border-white/20 bg-muted/40 transition-all ${focusedRow === 1 && focusedCol === 1 ? "bg-white text-black" : "text-white"}`}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM AREA */}
                <div className="flex flex-col gap-4 pb-4 w-full">
                  {/* Thumbnail strip */}
                  <div className="h-32 flex items-end justify-center">
                    <AnimatePresence>
                      {isSeeking && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-2 mb-4"
                        >
                          {seekThumbnails.map((t, i) => (
                            <div
                              key={i}
                              className={`relative overflow-hidden transition-opacity duration-200 ${i === 3 ? "w-48 h-28 z-10 ring-1 ring-white" : "w-32 h-20 opacity-50"}`}
                            >
                              <img src={thumbnail} className="w-full h-full object-cover" alt="seek preview" />
                              {i === 3 && (
                                <div className="absolute bottom-1 left-0 right-0 text-center">
                                  <span className="text-[12px] text-white font-bold font-mono">{formatTime(t)}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-4 w-full">
                    <span ref={elapsedTextRef} className="text-sm font-mono tabular-nums text-muted-foreground w-12">
                      {elapsed}
                    </span>
                    <div className="flex-1 rounded-full relative bg-white/20" style={{ height: "3px" }}>
                      <div
                        ref={progressFillRef}
                        className="h-full rounded-full"
                        style={{ backgroundColor: GOLD, width: `${(displayTime / totalDuration) * 100}%` }}
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
                        outline: focusedRow === 2 && focusedCol === 0 ? `2px solid ${GOLD}` : "none",
                        outlineOffset: "4px",
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
                          boxShadow:
                            focusedRow === 2 && focusedCol === 1 ? "0 0 20px 5px rgba(245,197,24,0.4)" : "none",
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
                        outline: focusedRow === 2 && focusedCol === 2 ? `2px solid ${GOLD}` : "none",
                        outlineOffset: "4px",
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
                            className={`w-32 h-10 flex items-center justify-center rounded-xl border border-white/20 bg-muted/40 transition-colors cursor-pointer ${isFocused ? "bg-white" : ""}`}
                          >
                            <div
                              className={`flex items-center gap-2 font-bold transition-colors ${isFocused ? "text-black" : "text-white"} text-xs`}
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
        {!zeroUiActive && showSubtitleModal && (
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
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", width: "420px" }}
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
                        <span className="text-base font-medium" style={{ color: isActive ? GOLD : "#ffffff" }}>
                          {sub.label}
                        </span>
                        {isActive && <span style={{ color: GOLD, fontSize: "18px" }}>✓</span>}
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
        {!zeroUiActive && showAudioModal && (
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
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", width: "420px" }}
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
                          <span className="text-base font-medium" style={{ color: isActive ? GOLD : "#ffffff" }}>
                            {track.label}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: isActive ? "rgba(245,197,24,0.6)" : "rgba(255,255,255,0.35)" }}
                          >
                            {track.description}
                          </span>
                        </div>
                        {isActive && <span style={{ color: GOLD, fontSize: "18px" }}>✓</span>}
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
        {!zeroUiActive && showFontModal && (
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
              className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-2xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", width: "420px" }}
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
                            style={{ color: isActive ? "rgba(245,197,24,0.6)" : "rgba(255,255,255,0.35)" }}
                          >
                            {font.description}
                          </span>
                        </div>
                        {isActive && <span style={{ color: GOLD, fontSize: "18px" }}>✓</span>}
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
    </div>
  );
};

export default VideotekaPlayer;
