import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Heart, Tv } from "lucide-react";
import Hls from "hls.js";
import { useDwSchedule, type DwScheduleItem } from "@/hooks/useChannels";

// Detect HEVC (H.265) decoding support — most 4K IPTV streams use HEVC.
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

const calculateTimeFromProgress = (pct: number, range: string) => {
  const [startPart, endPart] = range.split(" - ");
  const [sh, sm] = startPart.split(":").map(Number);
  const [eh, em] = endPart.split(":").map(Number);
  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) endTotal += 1440;
  const currentTotal = startTotal + (endTotal - startTotal) * (pct / 100);
  const h = Math.floor((currentTotal % 1440) / 60);
  const m = Math.floor(currentTotal % 60);
  const s = Math.floor((currentTotal * 60) % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const cn = (...args: (string | boolean | undefined | null)[]): string => args.filter(Boolean).join(" ");

interface MiniChannel {
  id: string;
  title: string;
  timeRange: string;
  day: string;
  date: string;
  thumbnail: string;
  isCurrent?: boolean;
  streamUrl?: string | null;
  channelName?: string | null;
}

interface SidebarChannel {
  id: string;
  num: number;
  label: string;
  sub: string;
}

export interface PlayerData {
  channelId?: string;
  channelNumber?: string;
  showTitle?: string;
  timeRange?: string;
  thumbnail?: string;
  channelName?: string;
  streamUrl?: string;
  logoUrl?: string | null;
}

export interface FavoriteChannel {
  number: number;
  channelName: string;
  showTitle: string;
  timeRange: string;
  thumbnail: string;
  streamUrl?: string;
  logoUrl?: string | null;
}

interface VideoPlayerProps {
  isVisible?: boolean;
  onClose?: () => void;
  data?: PlayerData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteChannels?: FavoriteChannel[];
  allChannels?: FavoriteChannel[];
  onSwitchChannel?: (data: PlayerData) => void;
}

interface ControlItem {
  icon: React.ElementType;
  label: string;
  action: () => void;
}

const DAILY_SHOWS = [
  {
    title: "Jutarnji program",
    start: "06:00",
    end: "09:00",
    thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=300&q=70",
  },
  {
    title: "Dobro jutro",
    start: "09:00",
    end: "10:00",
    thumb: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&q=70",
  },
  {
    title: "MasterChef",
    start: "13:10",
    end: "14:45",
    thumb: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=300&q=70",
  },
  {
    title: "Dnevnik",
    start: "18:10",
    end: "18:30",
    thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=70",
  },
  {
    title: "Rock Hronika",
    start: "18:30",
    end: "19:00",
    thumb: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&q=70",
  },
];

const DAY_NAMES_HR = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

const buildSchedule = (): MiniChannel[] => {
  const now = new Date();
  const result: MiniChannel[] = [];
  let idCounter = 1;

  for (let dayOffset = -7; dayOffset <= 1; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const dayLabel =
      dayOffset === 0 ? "Danas" : dayOffset === 1 ? "Sutra" : dayOffset === -1 ? "Jučer" : DAY_NAMES_HR[date.getDay()];

    for (const show of DAILY_SHOWS) {
      const [sh, sm] = show.start.split(":").map(Number);
      const [eh, em] = show.end.split(":").map(Number);

      const showStart = new Date(date);
      showStart.setHours(sh, sm, 0, 0);

      const showEnd = new Date(date);
      if (eh < sh) showEnd.setDate(showEnd.getDate() + 1);
      showEnd.setHours(eh, em, 0, 0);

      if (showEnd < new Date(now.getTime() - 168 * 60 * 60 * 1000)) continue;

      const isCurrent = showStart <= now && now < showEnd;

      result.push({
        id: `m${idCounter++}`,
        title: show.title,
        timeRange: `${show.start} - ${show.end}`,
        day: dayLabel,
        date: `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`,
        thumbnail: show.thumb,
        ...(isCurrent ? { isCurrent: true } : {}),
      });
    }
  }

  return result;
};

const FALLBACK_MINI_CHANNELS: MiniChannel[] = buildSchedule();

const buildMiniChannelsFromEPG = (
  programs: Array<{ id: string; title: string; start_time: string; end_time: string; is_live?: boolean | null }>,
  fallbackThumb: string,
): MiniChannel[] => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return programs.map((p) => {
    const start = new Date(p.start_time);
    const end = new Date(p.end_time);
    const fmt = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dayStart.getTime() - startOfToday.getTime()) / 86400000);
    let day: string;
    if (diffDays === 0) day = "Danas";
    else if (diffDays === 1) day = "Sutra";
    else if (diffDays === -1) day = "Jučer";
    else day = DAY_NAMES_HR[start.getDay()];
    const isCurrent = start <= now && now < end;
    return {
      id: p.id,
      title: p.title,
      timeRange: `${fmt(start)} - ${fmt(end)}`,
      day,
      date: `${String(start.getDate()).padStart(2, "0")}.${String(start.getMonth() + 1).padStart(2, "0")}.`,
      thumbnail: fallbackThumb,
      ...(isCurrent ? { isCurrent: true } : {}),
    };
  });
};

const sidebarChannels: SidebarChannel[] = [
  { id: "s1", num: 4, label: "federalna", sub: "ODIVIZIJA" },
  { id: "s2", num: 5, label: "RTRS", sub: "ODIVIZIJA" },
  { id: "s3", num: 6, label: "MAX", sub: "ODIVIZIJA" },
  { id: "s4", num: 7, label: "Hayat TV", sub: "ODIVIZIJA" },
  { id: "s5", num: 8, label: "OBN", sub: "ODIVIZIJA" },
  { id: "s6", num: 9, label: "Nova TV", sub: "ODIVIZIJA" },
  { id: "s7", num: 10, label: "HRT 1", sub: "ODIVIZIJA" },
];

const AUTO_HIDE_MS = 4500;
const GOLD = "#F5C518";

// Broj kartica vidljivih u sidebaru istovremeno (uvijek neparan da je fokusirana u sredini)
const SIDEBAR_VISIBLE = 5;
const SIDEBAR_HALF = Math.floor(SIDEBAR_VISIBLE / 2);

const isFutureShow = (timeRange: string, day: string): boolean => {
  const now = new Date();
  const startStr = timeRange.split(" - ")[0];
  const [h, m] = startStr.split(":").map(Number);
  const showStart = new Date(now);
  if (day === "Sutra") showStart.setDate(showStart.getDate() + 1);
  else if (day !== "Danas" && day !== "Jučer") return false;
  showStart.setHours(h, m, 0, 0);
  return showStart > now;
};

interface ChannelCardProps {
  ch: SidebarChannel;
  isActive?: boolean;
  isFocused?: boolean;
  width?: string | number;
  onClick?: () => void;
  showArrows?: boolean;
  logoUrl?: string | null;
  overrideNum?: number | string;
}

const ChannelCard = ({
  ch,
  isActive = false,
  isFocused = false,
  width = "100%",
  onClick,
  showArrows = false,
  logoUrl = null,
  overrideNum,
}: ChannelCardProps) => {
  const [logoError, setLogoError] = useState(false);

  // Reset error kada se logoUrl promijeni
  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer flex-shrink-0 select-none"
      style={{ width }}
    >
      {showArrows ? (
        <div style={{ height: 22, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 6 }}>
          {isFocused && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "22px solid transparent",
                borderRight: "22px solid transparent",
                borderBottom: `16px solid ${GOLD}`,
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ height: 8 }} />
      )}

      <div
        className="w-full relative flex flex-col items-center"
        style={{
          backgroundColor: "rgba(22,22,30,1)",
          border: isFocused
            ? `1.5px solid ${GOLD}`
            : isActive
              ? `1px solid rgba(245,197,24,0.45)`
              : "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          padding: "6px 8px 9px 8px",
          minHeight: "96px",
          boxShadow: isFocused
            ? `0 0 14px 4px rgba(245,197,24,0.28)`
            : isActive
              ? `0 0 6px 2px rgba(245,197,24,0.1)`
              : "none",
        }}
      >
        <span
          className="absolute top-1.5 left-2 font-bold tabular-nums leading-none"
          style={{ fontSize: "10px", color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}
        >
          {overrideNum ?? ch.num}
        </span>

        <div className="mt-3 mb-1 flex items-center justify-center" style={{ height: 62 }}>
          {logoUrl && !logoError ? (
            <img
              key={logoUrl}
              src={logoUrl}
              alt={ch.label}
              className="max-h-[62px] max-w-full object-contain"
              style={{
                filter: isFocused ? `drop-shadow(0 0 4px rgba(245,197,24,0.55))` : "none",
                transition: "filter 0.18s",
              }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <Tv
              style={{
                width: 40,
                height: 40,
                color: isFocused ? GOLD : isActive ? "#e8c94a" : "rgba(255,255,255,0.8)",
                filter: isFocused ? `drop-shadow(0 0 4px rgba(245,197,24,0.55))` : "none",
                transition: "color 0.18s, filter 0.18s",
              }}
            />
          )}
        </div>
      </div>

      {showArrows ? (
        <div style={{ height: 22, display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: 6 }}>
          {isFocused && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "22px solid transparent",
                borderRight: "22px solid transparent",
                borderTop: `16px solid ${GOLD}`,
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ height: 8 }} />
      )}
    </div>
  );
};

interface EPGCardProps {
  channel: MiniChannel;
  isFocused: boolean;
  isFuture: boolean;
  onSelect: () => void;
}

const EPGCard = ({ channel, isFocused, isFuture, onSelect }: EPGCardProps) => (
  <div
    className={cn(
      "relative flex flex-col rounded-lg overflow-visible transition-all duration-300 ease-in-out cursor-pointer",
      isFocused ? "z-10" : "",
    )}
    style={{
      backgroundColor: "rgba(10,10,10,1)",
      boxShadow: isFocused ? `0 0 0 2px ${GOLD}, 0 0 16px 4px rgba(245,197,24,0.4)` : "none",
    }}
    onClick={onSelect}
  >
    {isFocused && (
      <div
        className="absolute flex items-center justify-center"
        style={{ left: -15, top: 0, bottom: "2.5rem", width: 15, pointerEvents: "none" }}
      >
        <svg width="15" height="42" viewBox="0 0 12 36" fill="none">
          <path
            d="M10 1 L1 18 L10 35 Q7 18 10 1 Z"
            fill={GOLD}
            style={{ filter: "drop-shadow(0 0 4px rgba(245,197,24,0.9))" }}
          />
        </svg>
      </div>
    )}

    {isFocused && (
      <div
        className="absolute flex items-center justify-center"
        style={{ right: -15, top: 0, bottom: "2.5rem", width: 15, pointerEvents: "none" }}
      >
        <svg width="15" height="42" viewBox="0 0 12 36" fill="none">
          <path
            d="M2 1 L11 18 L2 35 Q5 18 2 1 Z"
            fill={GOLD}
            style={{ filter: "drop-shadow(0 0 4px rgba(245,197,24,0.9))" }}
          />
        </svg>
      </div>
    )}

    <div
      className="relative w-full aspect-video rounded-t-lg overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <img
        src={channel.thumbnail}
        alt={channel.title}
        className="w-full h-full object-cover"
        style={{ filter: isFuture && !isFocused ? "grayscale(100%)" : "none", transition: "filter 0.3s" }}
      />

      {!isFuture &&
        (() => {
          const now = new Date();
          const [sh, sm] = channel.timeRange.split(" - ")[0].split(":").map(Number);
          const [eh, em] = channel.timeRange.split(" - ")[1].split(":").map(Number);
          const start = new Date(now);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(now);
          end.setHours(eh < sh ? eh + 24 : eh, em, 0, 0);
          const pct = channel.isCurrent
            ? Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
            : 100;

          return (
            <div
              className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: GOLD, transition: "width 0.5s" }} />
            </div>
          );
        })()}
    </div>

    <div
      className="flex-1 px-2 py-2 rounded-b-lg"
      style={{
        backgroundColor: isFocused ? "rgba(30,22,0,1)" : "rgba(10,10,10,1)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "none",
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-mono" style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}>
          {channel.timeRange}
        </p>
        <p className="text-[10px]" style={{ color: isFocused ? "rgba(245,197,24,0.7)" : "rgba(255,255,255,0.3)" }}>
          {channel.date}
        </p>
      </div>
      <p className="text-xs font-semibold truncate" style={{ color: isFocused ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
        {channel.title}
      </p>
      <p className="text-[10px]" style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.35)" }}>
        {channel.day}
      </p>
    </div>
  </div>
);

interface ChannelNumberOverlayProps {
  input: string;
  channelLabel: string | undefined;
  isFound: boolean;
}

const ChannelNumberOverlay = ({ input, channelLabel, isFound }: ChannelNumberOverlayProps) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 80 }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="pointer-events-none flex flex-col items-center justify-center"
      style={{
        backgroundColor: "rgba(245,197,24,0.55)",
        outline: "2px solid rgba(245,197,24,0.9)",
        borderRadius: 12,
        padding: "28px 52px 24px",
        minWidth: 200,
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: isFound ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.35)",
          transition: "color 0.3s",
          minHeight: 16,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 180,
          wordBreak: "break-word" as const,
        }}
      >
        {isFound ? channelLabel : "\u00A0"}
      </span>

      <span
        style={{
          fontSize: 88,
          fontWeight: 200,
          lineHeight: 1,
          color: "#000000",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {input}
      </span>

      <div style={{ marginTop: 10, position: "relative", width: "65%", height: 4 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 1, background: "#FFE600" }} />
        <motion.div
          style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 1, background: "#FFE600" }}
          animate={{ width: isFound ? "100%" : "30%" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  </div>
);

// Pomoćna funkcija: vraća listu indeksa koji su vidljivi u kružnom sidebaru
// sa fokusiranom karticom uvijek u sredini
const getCircularWindow = (focusedIdx: number, total: number, windowSize: number): number[] => {
  const half = Math.floor(windowSize / 2);
  const result: number[] = [];
  for (let i = -half; i <= half; i++) {
    result.push((((focusedIdx + i) % total) + total) % total);
  }
  return result;
};

const VideoPlayer = ({
  isVisible = true,
  onClose = () => {},
  data,
  isFavorite: isFavoriteProp = false,
  onToggleFavorite,
  favoriteChannels = [],
  allChannels,
  onSwitchChannel,
}: VideoPlayerProps) => {
  const channelLookup = allChannels && allChannels.length > 0 ? allChannels : favoriteChannels;
  const showTitle = data?.showTitle ?? "Vesti B92";
  const timeRange = data?.timeRange ?? "18:10 - 18:30";
  const thumbnail = data?.thumbnail ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80";
  const streamUrl = data?.streamUrl;
  const channelId = data?.channelId;
  const fallbackThumb = data?.thumbnail ?? thumbnail;

  const { data: dwRows } = useDwSchedule();
  const miniChannels: MiniChannel[] = useMemo(() => {
    if (dwRows && dwRows.length > 0) return buildMiniChannelsFromDw(dwRows, fallbackThumb);
    return FALLBACK_MINI_CHANNELS;
  }, [dwRows, fallbackThumb]);

  // favAsSidebarChannels — favoriteChannels konvertirani u SidebarChannel format
  const favAsSidebarChannels: SidebarChannel[] = favoriteChannels.map((fc) => ({
    id: `fav-${fc.number}`,
    num: fc.number,
    label: fc.channelName,
    sub: "ODIVIZIJA",
  }));

  const [progress, setProgress] = useState(42);
  const [aspectRatioMode, setAspectRatioMode] = useState<"original" | "fill" | "4:3" | "16:9">("fill");
  const [videoNativeAR, setVideoNativeAR] = useState<number | null>(null);

  // Detektiramo native aspect ratio streama čim metadata bude dostupna
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoNativeAR(video.videoWidth / video.videoHeight);
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [streamUrl]);
  const cycleAspectRatio = () => {
    setAspectRatioMode((p) => {
      if (p === "original") return "fill";
      if (p === "fill") return "4:3";
      if (p === "4:3") return "16:9";
      return "original";
    });
  };
  const [isProgressFocused, setIsProgressFocused] = useState(false);
  const [focusedControl, setFocusedControl] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showHud, setShowHud] = useState<boolean>(false);
  const [epgMode, setEpgMode] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setVideoReady(false);
    const hevcOk = supportsHEVC();

    const showSpinner = () => {
      if (spinnerRef.current) spinnerRef.current.style.opacity = "1";
    };
    const hideSpinner = () => {
      if (spinnerRef.current) spinnerRef.current.style.opacity = "0";
    };

    const onPlaying = () => {
      setVideoReady(true);
      hideSpinner();
      try {
        video.muted = false;
        video.volume = 1;
      } catch {
        /* noop */
      }
    };
    const enableSoundOnGesture = () => {
      try {
        video.muted = false;
        video.volume = 1;
      } catch {
        /* noop */
      }
      window.removeEventListener("pointerdown", enableSoundOnGesture);
      window.removeEventListener("keydown", enableSoundOnGesture);
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", showSpinner);
    video.addEventListener("stalled", showSpinner);
    video.addEventListener("canplay", hideSpinner);
    window.addEventListener("pointerdown", enableSoundOnGesture);
    window.addEventListener("keydown", enableSoundOnGesture);

    const loadingFallbackTimer = window.setTimeout(() => {
      setVideoReady(true);
      hideSpinner();
    }, 7000);

    // Uništi stari HLS prije učitavanja novog sourcea
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        capLevelToPlayerSize: false,
        autoStartLoad: false,
        testBandwidth: false,
        startLevel: -1,
        abrEwmaDefaultEstimate: 50_000_000,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // Odaberi najvišu upotrebljivu razinu (preskoči HEVC ako nije podržan)
        const usable = data.levels
          .map((lvl, idx) => ({ lvl, idx }))
          .filter(({ lvl }) => {
            const codecs = (lvl.videoCodec || "").toLowerCase();
            const isHevc = codecs.includes("hvc1") || codecs.includes("hev1") || codecs.includes("h265");
            return isHevc ? hevcOk : true;
          });
        const best = usable.length
          ? usable.reduce((a, b) => ((b.lvl.bitrate || 0) > (a.lvl.bitrate || 0) ? b : a))
          : { idx: data.levels.length - 1 };
        hls.startLevel = best.idx;
        hls.nextLevel = best.idx;
        hls.loadLevel = best.idx;
        hls.currentLevel = best.idx;
        hls.startLoad();
        video.play().catch(() => {});
      });

      let recoverAttempts = 0;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        showSpinner();
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            recoverAttempts++;
            try {
              hls.startLoad();
            } catch {
              hls.recoverMediaError();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            recoverAttempts++;
            if (recoverAttempts <= 2) hls.recoverMediaError();
            else {
              hls.swapAudioCodec();
              hls.recoverMediaError();
            }
            break;
          default:
            try {
              hls.recoverMediaError();
            } catch {
              /* noop */
            }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", showSpinner);
      video.removeEventListener("stalled", showSpinner);
      video.removeEventListener("canplay", hideSpinner);
      window.removeEventListener("pointerdown", enableSoundOnGesture);
      window.removeEventListener("keydown", enableSoundOnGesture);
      window.clearTimeout(loadingFallbackTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    if (isPlaying) video.play().catch(() => {});
    else video.pause();
  }, [isPlaying, streamUrl]);

  const [channelInput, setChannelInput] = useState<string>("");
  const [showChannelOverlay, setShowChannelOverlay] = useState<boolean>(false);
  const channelInputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSeekStep = useCallback(() => {
    const [startPart, endPart] = timeRange.split(" - ");
    const [sh, sm] = startPart.split(":").map(Number);
    const [eh, em] = endPart.split(":").map(Number);
    const startTotal = sh * 60 + sm;
    let endTotal = eh * 60 + em;
    if (endTotal < startTotal) endTotal += 1440;
    const totalSeconds = (endTotal - startTotal) * 60;
    return totalSeconds > 0 ? (10 / totalSeconds) * 100 : 1;
  }, [timeRange]);

  const startSeeking = useCallback(() => {
    setIsSeeking(true);
    if (seekTimer.current) clearTimeout(seekTimer.current);
    seekTimer.current = setTimeout(() => setIsSeeking(false), 1500);
  }, []);

  const goLive = useCallback(() => {
    setProgress(100);
    setIsPlaying(true);
  }, []);

  const [epgFocusIndex, setEpgFocusIndex] = useState<number>(() => {
    const idx = miniChannels.findIndex((c) => c.isCurrent);
    return idx >= 0 ? idx : Math.min(2, Math.max(0, miniChannels.length - 1));
  });

  // Re-center epg focus on current program whenever channel/EPG changes
  useEffect(() => {
    const idx = miniChannels.findIndex((c) => c.isCurrent);
    setEpgFocusIndex(idx >= 0 ? idx : Math.min(2, Math.max(0, miniChannels.length - 1)));
  }, [channelId, miniChannels]);

  // verticalIndex — pozicija u favAsSidebarChannels, inicijalizira se na trenutni kanal
  const [verticalIndex, setVerticalIndex] = useState<number>(() =>
    Math.max(
      0,
      favoriteChannels.findIndex((fc) => fc.channelName === data?.channelName),
    ),
  );
  // sidebarFocus = indeks favorita koji je TIK iznad HUD-a (kartica u stvarnom fokusu u slotu).
  // -1 znači da slot još nije "engaged" — HUD kartica drži fokus (trokutiće), a 4 kartice
  // iznad progress bara su preview bez fokusa. Prvi ArrowUp prebacuje fokus u slot.
  const [sidebarFocus, setSidebarFocus] = useState<number>(-1);

  const sidebarOpen = focusedControl === -1;

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setShowHud(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (epgMode) return;
    hideTimer.current = setTimeout(() => {
      setShowHud(false);
    }, AUTO_HIDE_MS);
  }, [epgMode]);

  const openEpgMode = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowHud(true);
    setEpgMode(true);
  }, []);

  const closeEpgMode = useCallback(() => {
    setEpgMode(false);
    setShowHud(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowHud(false);
    }, AUTO_HIDE_MS);
  }, []);

  const openSidebar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowHud(true);
    const currentIdx = Math.max(
      0,
      favoriteChannels.findIndex((fc) => fc.channelName === data?.channelName),
    );
    setVerticalIndex(currentIdx);
    // -1 = HUD kartica je fokusirana (trokutići); 4 kartice iznad su preview bez fokusa.
    setSidebarFocus(-1);
    setFocusedControl(-1);
  }, [favoriteChannels, data?.channelName]);

  const closeSidebar = useCallback(() => {
    setSidebarFocus(-1);
    setFocusedControl(0);
    resetHideTimer();
  }, [resetHideTimer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        const newInput = channelInput + e.key;
        setChannelInput(newInput);
        setShowChannelOverlay(true);
        setShowHud(false);
        setEpgMode(false);

        if (channelInputTimer.current) clearTimeout(channelInputTimer.current);
        channelInputTimer.current = setTimeout(() => {
          const num = parseInt(newInput, 10);
          // Numerički unos traži po poziciji u listi omiljenih (1-based),
          // jer korisnik tipka "3" misleći na 3. omiljeni kanal — ne na channel_number iz baze.
          const favCh = favoriteChannels.find((c) => c.number === num);
          if (favCh && onSwitchChannel) {
            // Fallback: ako favCh.streamUrl nije dostupan, traži u allChannels po imenu
            const resolvedStreamUrl =
              favCh.streamUrl ?? (allChannels ?? []).find((c) => c.channelName === favCh.channelName)?.streamUrl;
            onSwitchChannel({
              channelNumber: String(favCh.number),
              showTitle: favCh.showTitle,
              timeRange: favCh.timeRange,
              thumbnail: favCh.thumbnail,
              channelName: favCh.channelName,
              streamUrl: resolvedStreamUrl,
              logoUrl: favCh.logoUrl,
            });
          }
          setChannelInput("");
          setShowChannelOverlay(false);
          setEpgMode(false);
          setShowHud(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setShowHud(false), 2500);
        }, 2000);

        return;
      }

      if (isProgressFocused) {
        resetHideTimer();
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setIsProgressFocused(false);
            setFocusedControl(1);
            return;
          case "ArrowLeft":
            e.preventDefault();
            setProgress((p) => Math.max(0, p - 0.5));
            return;
          case "ArrowRight":
            e.preventDefault();
            setProgress((p) => Math.min(100, p + 0.5));
            return;
          case "Enter":
            e.preventDefault();
            setIsProgressFocused(false);
            setFocusedControl(1);
            return;
        }
      }

      if (epgMode) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            closeEpgMode();
            setFocusedControl(1);
            return;
          case "ArrowLeft":
            e.preventDefault();
            setEpgFocusIndex((p) => Math.max(p - 1, 0));
            return;
          case "ArrowRight":
            e.preventDefault();
            setEpgFocusIndex((p) => Math.min(p + 1, miniChannels.length - 1));
            return;
          case "Escape":
          case "Backspace":
            e.preventDefault();
            closeEpgMode();
            return;
        }
        return;
      }

      if (sidebarOpen) {
        const favTotal = Math.max(favoriteChannels.length, 1);
        const currentIdx = Math.max(
          0,
          favoriteChannels.findIndex((fc) => fc.channelName === data?.channelName),
        );
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            // HUD kartica je uvijek fokus. Skrol gore = HUD prikazuje sljedeći kanal u nizu.
            setSidebarFocus((p) => {
              const cur = p === -1 ? currentIdx : p;
              return (cur + 1) % favTotal;
            });
            resetHideTimer();
            return;
          case "ArrowDown":
            e.preventDefault();
            // Skrol dolje = HUD prikazuje prethodni kanal u nizu.
            setSidebarFocus((p) => {
              const cur = p === -1 ? currentIdx : p;
              return (((cur - 1) % favTotal) + favTotal) % favTotal;
            });
            resetHideTimer();
            return;
          case "ArrowRight":
            e.preventDefault();
            closeSidebar();
            return;
          case "Enter":
          case " ": {
            e.preventDefault();
            // Enter učitava stream kanala koji je trenutno u HUD-u.
            const hudIdxLocal = sidebarFocus === -1 ? currentIdx : sidebarFocus;
            const favCh = favoriteChannels[hudIdxLocal];
            if (favCh && onSwitchChannel && favCh.channelName !== data?.channelName) {
              // Fallback: ako favCh.streamUrl nije dostupan, traži u channelLookup
              const resolvedStreamUrl =
                favCh.streamUrl ?? channelLookup.find((c) => c.channelName === favCh.channelName)?.streamUrl;
              onSwitchChannel({
                channelNumber: String(favCh.number),
                showTitle: favCh.showTitle,
                timeRange: favCh.timeRange,
                thumbnail: favCh.thumbnail,
                channelName: favCh.channelName,
                streamUrl: resolvedStreamUrl,
                logoUrl: favCh.logoUrl,
              });
            }
            closeSidebar();
            return;
          }
          case "Escape":
          case "Backspace":
            e.preventDefault();
            closeSidebar();
            return;
        }
        return;
      }

      if (!showHud && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        resetHideTimer();
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          resetHideTimer();
          if (focusedControl !== -1) setIsProgressFocused(true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          resetHideTimer();
          if (focusedControl === 0) openSidebar();
          else if (focusedControl > 0) setFocusedControl((p) => p - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          resetHideTimer();
          if (focusedControl < 4) setFocusedControl((p) => p + 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (focusedControl !== -1) openEpgMode();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedControl === 0) openEpgMode();
          if (focusedControl === 1) setIsPlaying((p) => !p);
          if (focusedControl === 2) goLive();
          if (focusedControl === 3) cycleAspectRatio();
          if (focusedControl === 4) onToggleFavorite?.();
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [
      isVisible,
      onClose,
      focusedControl,
      epgMode,
      sidebarOpen,
      sidebarFocus,
      verticalIndex,
      openEpgMode,
      closeEpgMode,
      openSidebar,
      closeSidebar,
      resetHideTimer,
      isProgressFocused,
      getSeekStep,
      startSeeking,
      goLive,
      onToggleFavorite,
      channelInput,
      favoriteChannels,
      channelLookup,
      onSwitchChannel,
      showHud,
    ],
  );

  useEffect(() => {
    if (isVisible) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isVisible, handleKeyDown, resetHideTimer]);

  useEffect(() => {
    if (!isVisible) return;
    setShowHud(true);
    setFocusedControl(-1);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowHud(false);
      setFocusedControl(1);
    }, AUTO_HIDE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isVisible, streamUrl]);

  if (!isVisible) return null;

  // HUD kartica je UVIJEK fokus zona. Skrolanjem se mijenja koji se kanal prikazuje
  // u HUD-u (preview), a 4 kartice iznad progress bara su sljedeći kandidati u nizu.
  // Enter učitava stream kanala koji je trenutno u HUD-u.
  const currentIdx = Math.max(
    0,
    favoriteChannels.findIndex((fc) => fc.channelName === data?.channelName),
  );
  const total = Math.max(favoriteChannels.length, 1);

  // hudIdx — koji se kanal prikazuje u HUD kartici. Default = trenutno reproducirani.
  // Kad korisnik skrola, hudIdx se mijenja iako stream ostaje isti dok ne pritisne Enter.
  const hudIdx = sidebarOpen && sidebarFocus !== -1 ? sidebarFocus : currentIdx;
  const hudFav = favoriteChannels[hudIdx];
  const hudIsCurrent = hudIdx === currentIdx;

  const hudChannel: SidebarChannel = {
    id: "hud",
    num: hudFav?.number ?? 0,
    label: hudFav?.channelName ?? data?.channelName ?? "",
    sub: "ODIVIZIJA",
  };
  // Jedini pouzdani izvor za logo je allChannels — direktno iz baze s channel_logos merge-om.
  // Sve kartice u lancu (slot + HUD) koriste ovu istu funkciju.
  const getLogoUrl = (channelName: string | undefined): string | null => {
    if (!channelName) return null;
    const found = (allChannels ?? []).find((c) => c.channelName === channelName);
    const logo = found?.logoUrl ?? null;
    console.log(
      `[getLogoUrl] "${channelName}" → found=${!!found} logoUrl=${logo} allChannels.length=${(allChannels ?? []).length}`,
    );
    return logo;
  };

  // Slot prozor: 4 kartice iznad HUD-a. Uvijek pokazuju sljedeća 4 kanala nakon hudIdx.
  // Renderiramo odozgo prema dolje: [hud+4, hud+3, hud+2, hud+1].
  const aboveWindow: number[] = Array.from({ length: 4 }, (_, i) => (((hudIdx + (4 - i)) % total) + total) % total);

  const CARD_W = 170;
  // SIDEBAR_BOTTOM = visina HUD-a. Sidebar raste prema gore od ove točke.
  // Fokusirana kartica (s trokutićima, visina ~142px) je najniža u sidebaru
  // pa sidebar container treba početi dovoljno visoko da fokusirana ne ulazi u HUD.
  // 216 = visina HUD-a bez trokutića fokusirane kartice koji vire dolje.
  // Dodajemo 22px za donji trokutić fokusirane kartice koji inače viri u HUD.
  const SIDEBAR_BOTTOM = 216; // visina cijelog HUD-a — kartice rastu iznad

  const controls: ControlItem[] = [
    { icon: RotateCcw, label: "Rewind", action: openEpgMode },
    { icon: isPlaying ? Pause : Play, label: "Play/Pause", action: () => setIsPlaying((p) => !p) },
    { icon: RotateCw, label: "Forward", action: goLive },
  ];

  const syncTransition = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 } as const;
  const inputNum = parseInt(channelInput, 10);
  const foundFavChannel = isNaN(inputNum) ? undefined : favoriteChannels.find((c) => c.number === inputNum);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {!videoReady && <div className="absolute inset-0" style={{ backgroundColor: "#000", zIndex: 0 }} />}
        {streamUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              playsInline
              {...({ "webkit-playsinline": "" } as Record<string, string>)}
              muted
              preload="auto"
              crossOrigin="anonymous"
              style={(() => {
                const base = {
                  position: "absolute" as const,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                };
                if (aspectRatioMode === "fill") {
                  return { ...base, width: "100%", height: "100%", objectFit: "fill" as const };
                }
                if (aspectRatioMode === "4:3") {
                  return {
                    ...base,
                    width: "auto",
                    height: "100%",
                    aspectRatio: "4/3",
                    objectFit: "fill" as const,
                    maxWidth: "100%",
                  };
                }
                // Referentno platno se zasebno skalira po X/Y osi na stvarni ekran.
                // Zato video mora ispuniti cijelo platno; contain bi unutar njega
                // dodao trake koje nakon vanjskog skaliranja ostaju vidljive.
                return {
                  ...base,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill" as const,
                  backgroundColor: "transparent",
                };
              })()}
            />
          </div>
        )}
        <div
          ref={spinnerRef}
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 56,
            height: 56,
            marginTop: -28,
            marginLeft: -28,
            border: "4px solid rgba(255,255,255,0.18)",
            borderTopColor: GOLD,
            borderRadius: "50%",
            animation: "vp-spin 0.9s linear infinite",
            opacity: videoReady ? 0 : 1,
            transition: "opacity 0.15s linear",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
        <style>{`@keyframes vp-spin { to { transform: rotate(360deg); } }`}</style>

        <AnimatePresence>
          {videoReady && showChannelOverlay && (
            <ChannelNumberOverlay
              input={channelInput}
              channelLabel={foundFavChannel?.channelName}
              isFound={!!foundFavChannel}
            />
          )}
        </AnimatePresence>

        {/* ── SLOT — 4 kartice iznad HUD trake koje se vrte navigacijom ── */}
        <AnimatePresence initial={false}>
          {videoReady && showHud && sidebarOpen && (
            <motion.div
              key="slot-stack"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-auto"
              style={{
                zIndex: 45,
                left: 16,
                bottom: SIDEBAR_BOTTOM + 70, // ← IZMJENA: +70px razmaka iznad progress bara
                width: CARD_W,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {aboveWindow.map((chIdx) => {
                const ch = favAsSidebarChannels[chIdx];
                if (!ch) return null;
                const favCh = favoriteChannels[chIdx];
                return (
                  <motion.div
                    key={`slot-${chIdx}`}
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  >
                    <ChannelCard
                      ch={ch}
                      isActive={false}
                      isFocused={false}
                      width="100%"
                      showArrows={false}
                      logoUrl={getLogoUrl(favCh?.channelName)}
                      onClick={() => {
                        if (favCh && onSwitchChannel) {
                          const resolvedStreamUrl =
                            favCh.streamUrl ??
                            channelLookup.find((c) => c.channelName === favCh.channelName)?.streamUrl;
                          onSwitchChannel({
                            channelNumber: String(favCh.number),
                            showTitle: favCh.showTitle,
                            timeRange: favCh.timeRange,
                            thumbnail: favCh.thumbnail,
                            channelName: favCh.channelName,
                            streamUrl: resolvedStreamUrl,
                            logoUrl: favCh.logoUrl,
                          });
                        }
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HUD ── */}
        <AnimatePresence>
          {videoReady && showHud && (
            <motion.div
              key="hud"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 flex flex-col gap-0 pointer-events-none"
              style={{ zIndex: 40 }}
            >
              <div className="relative overflow-visible pointer-events-auto flex flex-col">
                {/* Progress bar */}
                <div className="relative h-1.5 w-full bg-white/10 flex items-center">
                  <motion.div
                    className="absolute top-0 left-0 h-full"
                    style={{ backgroundColor: GOLD }}
                    animate={{ width: `${progress}%` }}
                    transition={syncTransition}
                  />
                  <motion.div
                    className="absolute w-5 h-5 rounded-full shadow-lg"
                    style={{
                      backgroundColor: "#bbbbbb",
                      border: isProgressFocused ? "2px solid white" : "none",
                      zIndex: 20,
                    }}
                    animate={{ left: `${progress}%`, x: "-50%", scale: isProgressFocused || isSeeking ? 1.2 : 1 }}
                    transition={syncTransition}
                  >
                    <AnimatePresence>
                      {(isProgressFocused || isSeeking) && (
                        <motion.div
                          key="thumbnail-preview"
                          initial={{ opacity: 0, scale: 0.92, y: 0 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute pointer-events-none flex flex-col items-center"
                          style={{
                            zIndex: 100,
                            bottom: "calc(100% + 14px)",
                            left: "50%",
                            x: "-50%",
                            width: "max-content",
                          }}
                        >
                          <div className="p-1 bg-white/20 backdrop-blur-md rounded-lg border border-white/40 shadow-2xl">
                            <div className="w-56 aspect-video rounded overflow-hidden relative bg-black">
                              <img src={thumbnail} alt="preview" className="w-full h-full object-cover" />
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-[11px] font-bold text-white tabular-nums border border-white/10">
                                {calculateTimeFromProgress(progress, timeRange)}
                              </div>
                            </div>
                          </div>
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/40 mt-[-1px]" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* HUD control row */}
                <div
                  className="relative flex items-center pt-3 pb-3"
                  style={{ backgroundColor: epgMode ? "rgba(10,10,10,0.46)" : "rgba(10,10,10,0.78)" }}
                >
                  {/* HUD kartica — fokusirana kartica u slotu, uvijek na dnu */}
                  <div className="ml-4 flex-shrink-0" style={{ width: CARD_W }}>
                    <ChannelCard
                      ch={favAsSidebarChannels[hudIdx] ?? hudChannel}
                      isActive={true}
                      isFocused={sidebarOpen}
                      width={CARD_W}
                      showArrows
                      logoUrl={getLogoUrl(favoriteChannels[hudIdx]?.channelName ?? data?.channelName)}
                      onClick={openSidebar}
                    />
                  </div>

                  <div className="flex items-center gap-3 ml-5 min-w-0 flex-1">
                    <span className="text-sm font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {timeRange}
                    </span>
                    <h2 className="font-bold text-lg truncate" style={{ color: "#ffffff" }}>
                      {showTitle}
                    </h2>
                  </div>

                  <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-8 pointer-events-auto">
                      {controls.map((ctrl, i) => {
                        const Icon = ctrl.icon;
                        const isBtnFocused = focusedControl === i && !epgMode && !isProgressFocused;
                        const isMain = i === 1;
                        return (
                          <button
                            key={ctrl.label}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFocusedControl(i);
                              ctrl.action();
                            }}
                            className="flex items-center justify-center rounded-full transition-all duration-200"
                            style={{
                              width: isMain ? "52px" : "42px",
                              height: isMain ? "52px" : "42px",
                              backgroundColor: isMain ? GOLD : isBtnFocused ? "rgba(245,197,24,0.15)" : "transparent",
                              color: isMain ? "#0d0d0d" : GOLD,
                              outline: isBtnFocused && !isMain ? "2px solid rgba(245,197,24,0.5)" : "none",
                              transform: isBtnFocused ? "scale(1.12)" : "scale(1)",
                              boxShadow: isMain ? "0 0 18px 4px rgba(245,197,24,0.35)" : "none",
                            }}
                          >
                            <Icon className={isMain ? "w-6 h-6" : "w-5 h-5"} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, flexShrink: 0 }}>
                    {/* Aspect Ratio gumb */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocusedControl(3);
                        cycleAspectRatio();
                      }}
                      title={`Aspect ratio: ${aspectRatioMode}`}
                      style={{
                        display: "inline-flex",
                        flexDirection: "column" as const,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        padding: "4px 10px",
                        background:
                          focusedControl === 3 && !epgMode && !isProgressFocused
                            ? "rgba(245,197,24,0.15)"
                            : "none",
                        border: `1.5px solid ${focusedControl === 3 && !epgMode && !isProgressFocused ? GOLD : "transparent"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: focusedControl === 3 && !epgMode && !isProgressFocused ? 1 : 0.55,
                        transform: focusedControl === 3 && !epgMode && !isProgressFocused ? "scale(1.08)" : "scale(1)",
                      }}

                    >
                      <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                        {aspectRatioMode === "original" && (
                          <>
                            <rect
                              x="1"
                              y="1"
                              width="20"
                              height="12"
                              rx="1.5"
                              stroke={GOLD}
                              strokeWidth="1.5"
                              fill="none"
                            />
                            <rect
                              x="5"
                              y="3"
                              width="12"
                              height="8"
                              rx="0.5"
                              stroke={GOLD}
                              strokeWidth="1"
                              fill="none"
                              strokeDasharray="2 1"
                            />
                          </>
                        )}
                        {aspectRatioMode === "fill" && (
                          <rect
                            x="1"
                            y="1"
                            width="20"
                            height="12"
                            rx="1.5"
                            stroke={GOLD}
                            strokeWidth="1.5"
                            fill={GOLD}
                            fillOpacity="0.4"
                          />
                        )}
                        {aspectRatioMode === "4:3" && (
                          <>
                            <rect
                              x="1"
                              y="1"
                              width="20"
                              height="12"
                              rx="1.5"
                              stroke={GOLD}
                              strokeWidth="1.5"
                              fill="none"
                            />
                            <rect x="3" y="1" width="16" height="12" rx="0.5" fill={GOLD} fillOpacity="0.4" />
                          </>
                        )}
                        {aspectRatioMode === "16:9" && (
                          <>
                            <rect
                              x="1"
                              y="1"
                              width="20"
                              height="12"
                              rx="1.5"
                              stroke={GOLD}
                              strokeWidth="1.5"
                              fill={GOLD}
                              fillOpacity="0.4"
                            />
                            <line x1="1" y1="3.5" x2="21" y2="3.5" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
                            <line x1="1" y1="10.5" x2="21" y2="10.5" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
                          </>
                        )}
                      </svg>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: GOLD,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase" as const,
                        }}
                      >
                        {aspectRatioMode === "original"
                          ? "Original"
                          : aspectRatioMode === "fill"
                            ? "Fill"
                            : aspectRatioMode}
                      </span>
                    </button>

                    {/* Dodajte u omiljene */}
                    <button
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        marginRight: "16px",
                        flexShrink: 0,
                        transition: "all 0.2s",
                        width: "fit-content",
                        opacity: isFavoriteProp || focusedControl === 4 ? 1 : 0.55,
                        outline:
                          focusedControl === 4 && !epgMode && !isProgressFocused
                            ? `2px solid rgba(245,197,24,0.5)`
                            : "2px solid transparent",
                        outlineOffset: "4px",
                        borderRadius: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        transform: focusedControl === 4 && !epgMode && !isProgressFocused ? "scale(1.06)" : "scale(1)",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocusedControl(4);
                        onToggleFavorite?.();
                      }}
                    >
                      <Heart
                        className="w-5 h-5"
                        style={{ color: GOLD, fill: isFavoriteProp ? GOLD : "none", transition: "fill 0.2s" }}
                      />
                      <span className="text-xs font-medium" style={{ color: GOLD }}>
                        Dodajte u omiljene
                      </span>
                    </button>
                  </div>
                </div>

                {/* EPG / mini strip */}
                <div
                  className="w-full transition-all duration-500 overflow-visible"
                  style={{
                    borderTop: "1px solid rgba(245,197,24,0.12)",
                    backgroundColor: epgMode ? "transparent" : "rgba(10,10,10,0.62)",
                  }}
                >
                  {epgMode ? (
                    (() => {
                      const half = 2;
                      const total = miniChannels.length;
                      let start = epgFocusIndex - half;
                      if (start < 0) start = 0;
                      if (start + 5 > total) start = Math.max(0, total - 5);
                      const visible = miniChannels.slice(start, start + 5);

                      return (
                        <div className="grid grid-cols-5 gap-1 py-3 px-3 overflow-visible items-stretch">
                          {visible.map((ch, i) => (
                            <EPGCard
                              key={ch.id}
                              channel={ch}
                              isFocused={epgFocusIndex === start + i}
                              isFuture={isFutureShow(ch.timeRange, ch.day)}
                              onSelect={() => setEpgFocusIndex(start + i)}
                            />
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex gap-2 h-24 px-3 py-2 overflow-hidden">
                      {miniChannels.slice(0, 5).map((ch) => (
                        <div
                          key={ch.id}
                          className="flex-1 rounded overflow-hidden"
                          style={{
                            border: ch.isCurrent
                              ? "1px solid rgba(245,197,24,0.6)"
                              : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <img
                            src={ch.thumbnail}
                            className="w-full h-full object-cover"
                            alt={ch.title}
                            style={{ filter: isFutureShow(ch.timeRange, ch.day) ? "grayscale(100%)" : "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default VideoPlayer;
