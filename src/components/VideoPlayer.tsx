import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Heart, Tv } from "lucide-react";
import Hls from "hls.js";

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
}

interface SidebarChannel {
  id: string;
  num: number;
  label: string;
  sub: string;
}

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

const miniChannels: MiniChannel[] = buildSchedule();

const sidebarChannels: SidebarChannel[] = [
  { id: "s1", num: 4, label: "federalna", sub: "ODIVIZIJA" },
  { id: "s2", num: 5, label: "RTRS", sub: "ODIVIZIJA" },
  { id: "s3", num: 6, label: "MAX", sub: "ODIVIZIJA" },
  { id: "s4", num: 7, label: "Hayat TV", sub: "ODIVIZIJA" },
  { id: "s5", num: 8, label: "OBN", sub: "ODIVIZIJA" },
  { id: "s6", num: 9, label: "Nova TV", sub: "ODIVIZIJA" },
  { id: "s7", num: 10, label: "HRT 1", sub: "ODIVIZIJA" },
];

const AUTO_HIDE_MS = 5000;
const GOLD = "#F5C518";

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
}

const ChannelCard = ({
  ch,
  isActive = false,
  isFocused = false,
  width = "100%",
  onClick,
  showArrows = false,
}: ChannelCardProps) => (
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
        borderRadius: "5px",
        padding: "5px 7px 9px 7px",
        minHeight: "80px",
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
        {ch.num}
      </span>

      <div className="mt-4 mb-1 flex items-center justify-center">
        <Tv
          style={{
            width: 24,
            height: 24,
            color: isFocused ? GOLD : isActive ? "#e8c94a" : "rgba(255,255,255,0.8)",
            filter: isFocused ? `drop-shadow(0 0 4px rgba(245,197,24,0.55))` : "none",
            transition: "color 0.18s, filter 0.18s",
          }}
        />
      </div>

      <span
        className="font-bold text-center leading-tight w-full truncate"
        style={{
          fontSize: "11px",
          color: isFocused ? "#fff" : isActive ? "#f0e8c0" : "rgba(255,255,255,0.85)",
          letterSpacing: "0.01em",
        }}
      >
        {ch.label}
      </span>

      <span
        className="font-semibold tracking-widest text-center"
        style={{
          fontSize: "6.5px",
          color: isFocused ? `rgba(245,197,24,0.7)` : "rgba(255,255,255,0.28)",
          marginTop: "2px",
          letterSpacing: "0.1em",
        }}
      >
        {ch.sub}
      </span>
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
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: isFound ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.35)",
          transition: "color 0.3s",
          minHeight: 16,
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

const VideoPlayer = ({
  isVisible = true,
  onClose = () => {},
  data,
  isFavorite: isFavoriteProp = false,
  onToggleFavorite,
  favoriteChannels = [],
  onSwitchChannel,
}: VideoPlayerProps) => {
  const showTitle = data?.showTitle ?? "Vesti B92";
  const timeRange = data?.timeRange ?? "18:10 - 18:30";
  const thumbnail = data?.thumbnail ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80";
  const streamUrl = data?.streamUrl;

  const [progress, setProgress] = useState(42);
  const [isProgressFocused, setIsProgressFocused] = useState(false);
  const [focusedControl, setFocusedControl] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showHud, setShowHud] = useState<boolean>(true);
  const [epgMode, setEpgMode] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);

  // HLS attach — runs only when streamUrl changes. No state writes here, so
  // unrelated re-renders (timer, progress bar) never tear down the player.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Spinner is controlled directly via DOM events — detached from React state.
    const showSpinner = () => {
      if (spinnerRef.current) spinnerRef.current.style.opacity = "1";
    };
    const hideSpinner = () => {
      if (spinnerRef.current) spinnerRef.current.style.opacity = "0";
    };

    video.addEventListener("waiting", showSpinner);
    video.addEventListener("stalled", showSpinner);
    video.addEventListener("playing", hideSpinner);
    video.addEventListener("canplay", hideSpinner);

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      // Auto-recovery — keep the picture alive on transient network/media errors.
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal || !hls) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
            return;
          } catch {
            /* fall through to destroy */
          }
        }
        hls.destroy();
        hlsRef.current = null;
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari / iOS) — hardware decoded.
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      video.removeEventListener("waiting", showSpinner);
      video.removeEventListener("stalled", showSpinner);
      video.removeEventListener("playing", hideSpinner);
      video.removeEventListener("canplay", hideSpinner);
      if (hls) {
        hls.destroy();
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
    return idx >= 0 ? idx : 2;
  });

  const [sidebarFocus, setSidebarFocus] = useState<number>(2);
  const [verticalIndex, setVerticalIndex] = useState<number>(2);

  const sidebarOpen = focusedControl === -1;

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setShowHud(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!epgMode) hideTimer.current = setTimeout(() => setShowHud(false), AUTO_HIDE_MS);
  }, [epgMode]);

  const openEpgMode = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowHud(true);
    setEpgMode(true);
  }, []);

  const closeEpgMode = useCallback(() => {
    setEpgMode(false);
    resetHideTimer();
  }, [resetHideTimer]);

  const openSidebar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowHud(true);
    setVerticalIndex(sidebarFocus);
    setFocusedControl(-1);
  }, [sidebarFocus]);

  const closeSidebar = useCallback(() => {
    setFocusedControl(0);
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    if (!sidebarOpen || !sidebarRef.current) return;
    const items = sidebarRef.current.querySelectorAll("[data-item]");
    (items[verticalIndex] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [verticalIndex, sidebarOpen]);

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
          const favCh = favoriteChannels.find((c) => c.number === num);
          if (favCh && onSwitchChannel) {
            onSwitchChannel({
              channelNumber: String(favCh.number),
              showTitle: favCh.showTitle,
              timeRange: favCh.timeRange,
              thumbnail: favCh.thumbnail,
              channelName: favCh.channelName,
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
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setVerticalIndex((p) => Math.max(p - 1, 0));
            resetHideTimer();
            return;
          case "ArrowDown":
            e.preventDefault();
            setVerticalIndex((p) => Math.min(p + 1, sidebarChannels.length - 1));
            resetHideTimer();
            return;
          case "ArrowRight":
            e.preventDefault();
            setSidebarFocus(verticalIndex);
            closeSidebar();
            return;
          case "Enter":
          case " ":
            e.preventDefault();
            setSidebarFocus(verticalIndex);
            setFocusedControl(1);
            resetHideTimer();
            return;
          case "Escape":
          case "Backspace":
            e.preventDefault();
            closeSidebar();
            return;
        }
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
          if (focusedControl < 3) setFocusedControl((p) => p + 1);
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
          if (focusedControl === 3) onToggleFavorite?.();
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
      onSwitchChannel,
    ],
  );

  useEffect(() => {
    if (isVisible) {
      resetHideTimer();
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isVisible, handleKeyDown, resetHideTimer]);

  if (!isVisible) return null;

  const activeCh = sidebarChannels[sidebarOpen ? verticalIndex : sidebarFocus];
  const CARD_W = 132;
  const SIDEBAR_BOTTOM = 216;

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
        {!streamUrl && (
          <img
            src={thumbnail}
            alt={showTitle}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
          />
        )}
        {streamUrl && (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              style={{ zIndex: 1 }}
              playsInline
              {...({ "webkit-playsinline": "true" } as Record<string, string>)}
              preload="auto"
              crossOrigin="anonymous"
              muted
              autoPlay
            />
            {/* CSS-only spinner — toggled via DOM events, detached from React state */}
            <div
              ref={spinnerRef}
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200"
              style={{ zIndex: 2, opacity: 1 }}
            >
              <div
                className="rounded-full border-4 border-white/20 border-t-white animate-spin"
                style={{ width: 56, height: 56 }}
              />
            </div>
          </>
        )}

        <AnimatePresence>
          {showChannelOverlay && (
            <ChannelNumberOverlay
              input={channelInput}
              channelLabel={foundFavChannel?.channelName}
              isFound={!!foundFavChannel}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHud && sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              ref={sidebarRef}
              className="absolute flex flex-col overflow-y-auto pointer-events-auto"
              style={{
                bottom: SIDEBAR_BOTTOM,
                left: 16,
                width: CARD_W,
                maxHeight: `calc(100% - ${SIDEBAR_BOTTOM + 20}px)`,
                scrollbarWidth: "none",
              }}
            >
              <div className="flex flex-col gap-1.5">
                {sidebarChannels.map((ch, i) => (
                  <div key={ch.id} data-item="">
                    <ChannelCard
                      ch={ch}
                      isActive={sidebarFocus === i}
                      isFocused={verticalIndex === i}
                      width="100%"
                      onClick={() => {
                        setVerticalIndex(i);
                        setSidebarFocus(i);
                        setFocusedControl(1);
                      }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHud && (
            <motion.div
              key="hud"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 flex flex-col gap-0 pointer-events-none"
            >
              <div
                className="relative overflow-visible pointer-events-auto flex flex-col"
                style={{ backgroundColor: "rgba(10,10,10,0.55)", border: "1px solid rgba(245,197,24,0.25)" }}
              >
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

                <div className="relative flex items-center pt-3 pb-3">
                  <div className="ml-4 flex-shrink-0">
                    <ChannelCard
                      ch={activeCh}
                      isActive={true}
                      isFocused={focusedControl === -1}
                      width={CARD_W}
                      showArrows
                      onClick={() => {
                        if (sidebarOpen) {
                          setSidebarFocus(verticalIndex);
                          closeSidebar();
                        } else {
                          openSidebar();
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-baseline gap-3 ml-5 min-w-0 flex-1">
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

                  <button
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginRight: "16px",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      width: "fit-content",
                      opacity: isFavoriteProp || focusedControl === 3 ? 1 : 0.55,
                      outline:
                        focusedControl === 3 && !epgMode && !isProgressFocused
                          ? `2px solid rgba(245,197,24,0.5)`
                          : "2px solid transparent",
                      outlineOffset: "4px",
                      borderRadius: "6px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                      transform: focusedControl === 3 && !epgMode && !isProgressFocused ? "scale(1.06)" : "scale(1)",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFocusedControl(3);
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

                <div
                  className="w-full transition-all duration-500 overflow-visible"
                  style={{ borderTop: "1px solid rgba(245,197,24,0.12)" }}
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
                    <div className="flex gap-2 h-24 px-3 py-2">
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
