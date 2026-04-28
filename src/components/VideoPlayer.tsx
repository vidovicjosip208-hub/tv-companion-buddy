import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Heart, Tv } from "lucide-react";
import Hls from "hls.js";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-levels";
import "videojs-hls-quality-selector";

// --- KONSTANTE ZA MEHANIKU ZUPČANIKA ---
const GOLD = "#F5C518";
const AUTO_HIDE_MS = 4500;
const CARD_W = 132; // Širina kartice
const CARD_H = 80; // Visina kartice (iz ChannelCard stila)
const GAP = 16; // Razmak (gap) između kartica
const ITEM_STEP = CARD_H + GAP; // Ukupni pomak po jednoj karici lanca

// --- POMOĆNE FUNKCIJE ---
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

const cn = (...args: (string | boolean | undefined | null)[]): string => args.filter(Boolean).join(" ");

// --- INTERFEJSI ---
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

// --- MOCK DATA ---
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

const buildSchedule = (): MiniChannel[] => {
  const now = new Date();
  const result: MiniChannel[] = [];
  let idCounter = 1;
  for (let dayOffset = -7; dayOffset <= 1; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);
    const dayLabel =
      dayOffset === 0
        ? "Danas"
        : dayOffset === 1
          ? "Sutra"
          : dayOffset === -1
            ? "Jučer"
            : date.toLocaleDateString("hr-HR", { weekday: "long" });
    for (const show of DAILY_SHOWS) {
      const isCurrent = idCounter === 5; // Pojednostavljeno za demo
      result.push({
        id: `m${idCounter++}`,
        title: show.title,
        timeRange: `${show.start} - ${show.end}`,
        day: dayLabel,
        date: `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`,
        thumbnail: show.thumb,
        isCurrent,
      });
    }
  }
  return result;
};

const miniChannels = buildSchedule();

const sidebarChannels: SidebarChannel[] = [
  { id: "s1", num: 4, label: "federalna", sub: "ODIVIZIJA" },
  { id: "s2", num: 5, label: "RTRS", sub: "ODIVIZIJA" },
  { id: "s3", num: 6, label: "MAX", sub: "ODIVIZIJA" },
  { id: "s4", num: 7, label: "Hayat TV", sub: "ODIVIZIJA" },
  { id: "s5", num: 8, label: "OBN", sub: "ODIVIZIJA" },
  { id: "s6", num: 9, label: "Nova TV", sub: "ODIVIZIJA" },
  { id: "s7", num: 10, label: "HRT 1", sub: "ODIVIZIJA" },
];

// --- KOMPONENTE ---

const ChannelCard = ({
  ch,
  isActive = false,
  isFocused = false,
  width = "100%",
  showArrows = false,
  logoUrl = null,
}: any) => (
  <div className="flex flex-col items-center flex-shrink-0 select-none relative" style={{ width }}>
    {/* Gornja strelica - fiksna pozicija unutar kartice */}
    <div className="flex items-end justify-center mb-1" style={{ height: 18 }}>
      {showArrows && (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderBottom: `12px solid ${GOLD}`,
          }}
        />
      )}
    </div>

    <div
      className="w-full relative flex flex-col items-center"
      style={{
        backgroundColor: "rgba(22,22,30,1)",
        border: isFocused
          ? `2px solid ${GOLD}`
          : isActive
            ? `1px solid rgba(245,197,24,0.45)`
            : "1px solid rgba(255,255,255,0.1)",
        borderRadius: "5px",
        padding: "5px 7px",
        height: "80px", // FIKSNA VISINA ZA LANAC
        boxShadow: isFocused ? `0 0 14px 4px rgba(245,197,24,0.28)` : "none",
      }}
    >
      <span
        className="absolute top-1 left-2 font-bold tabular-nums text-[10px]"
        style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}
      >
        {ch.num}
      </span>
      <div className="mt-2 flex items-center justify-center" style={{ height: 30 }}>
        <Tv style={{ width: 20, height: 20, color: isFocused ? GOLD : "rgba(255,255,255,0.8)" }} />
      </div>
      <span className="font-bold text-center text-[11px] w-full truncate text-white">{ch.label}</span>
      <span className="font-semibold tracking-widest text-[7px] text-white/30 uppercase">{ch.sub}</span>
    </div>

    {/* Donja strelica */}
    <div className="flex items-start justify-center mt-1" style={{ height: 18 }}>
      {showArrows && (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: `12px solid ${GOLD}`,
          }}
        />
      )}
    </div>
  </div>
);

// --- GLAVNA KOMPONENTA ---

export default function VideoPlayer({
  isVisible = true,
  onClose = () => {},
  data,
  onToggleFavorite,
  favoriteChannels = [],
  onSwitchChannel,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showHud, setShowHud] = useState(false);
  const [epgMode, setEpgMode] = useState(false);
  const [focusedControl, setFocusedControl] = useState(1);
  const [sidebarFocus, setSidebarFocus] = useState(2);
  const [verticalIndex, setVerticalIndex] = useState(2);
  const [channelInput, setChannelInput] = useState("");
  const [showChannelOverlay, setShowChannelOverlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<any>(null);

  const sidebarOpen = focusedControl === -1;

  const resetHideTimer = useCallback(() => {
    setShowHud(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (epgMode) return;
    hideTimer.current = setTimeout(() => setShowHud(false), AUTO_HIDE_MS);
  }, [epgMode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;
      resetHideTimer();

      // SIDEBAR LOGIKA (Zupčanik i Lanac)
      if (sidebarOpen) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setVerticalIndex((p) => (p - 1 + sidebarChannels.length) % sidebarChannels.length);
            return;
          case "ArrowDown":
            e.preventDefault();
            setVerticalIndex((p) => (p + 1) % sidebarChannels.length);
            return;
          case "ArrowRight":
          case "Enter":
            e.preventDefault();
            setSidebarFocus(verticalIndex);
            setFocusedControl(1); // Vrati fokus na Play dugme
            return;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            setFocusedControl(0);
            return;
        }
      }

      // GENERALNA NAVIGACIJA
      switch (e.key) {
        case "ArrowLeft":
          if (focusedControl === 0) {
            setFocusedControl(-1); // Otvori sidebar
            setVerticalIndex(sidebarFocus);
          } else {
            setFocusedControl((p) => Math.max(0, p - 1));
          }
          break;
        case "ArrowRight":
          setFocusedControl((p) => Math.min(3, p + 1));
          break;
        case "ArrowDown":
          setEpgMode(true);
          break;
        case "Enter":
          if (focusedControl === 1) setIsPlaying(!isPlaying);
          break;
        case "Escape":
          onClose();
          break;
      }
    },
    [isVisible, sidebarOpen, focusedControl, sidebarFocus, verticalIndex, isPlaying, resetHideTimer, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] overflow-hidden flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover" />

      {/* HUD LAYER */}
      <AnimatePresence>
        {showHud && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* --- SIDEBAR: MEHANIKA LANCA --- */}
            <div
              className="absolute left-10 top-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden"
              style={{
                width: CARD_W + 40,
                height: ITEM_STEP + 40, // Vidimo samo jednu kariku jasno, ostale se odsecaju
                zIndex: 50,
              }}
            >
              {/* ZUPČANIK (Navigaciona traka - fiksni okvir) */}
              <div
                className="absolute inset-0 border-y-2 border-yellow-500/30 bg-yellow-500/5 pointer-events-none"
                style={{ height: ITEM_STEP, top: "50%", transform: "translateY(-50%)" }}
              />

              {/* LANAC (Pokretne kartice) */}
              <motion.div
                className="flex flex-col items-center"
                animate={{ translateY: -(verticalIndex * ITEM_STEP) }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ gap: GAP }}
              >
                {sidebarChannels.map((ch, idx) => {
                  const isCurrentInGear = verticalIndex === idx;
                  return (
                    <div key={ch.id} style={{ height: CARD_H }}>
                      <motion.div
                        animate={{
                          scale: isCurrentInGear ? 1.1 : 0.85,
                          opacity: Math.abs(verticalIndex - idx) > 1 ? 0.3 : 1,
                        }}
                      >
                        <ChannelCard
                          ch={ch}
                          isActive={sidebarFocus === idx}
                          isFocused={sidebarOpen && isCurrentInGear}
                          width={CARD_W}
                          showArrows={isCurrentInGear}
                        />
                      </motion.div>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* DONJI CONTROLS (Zadržano iz originala) */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 to-transparent p-10 flex items-end justify-between">
              <div className="flex gap-6">
                <div
                  className={cn(
                    "p-4 rounded-full transition-all",
                    focusedControl === 1 ? "bg-yellow-500 scale-110" : "bg-white/10",
                  )}
                >
                  {isPlaying ? <Pause /> : <Play />}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
