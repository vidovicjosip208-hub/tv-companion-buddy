import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useZoneKeys } from "@/lib/focusZone";
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
  /**
   * Pozadinski mod: isti player svira ispod UI-a početne stranice (Startup
   * Action). Video je zatamnjen, HUD/sidebar/kontrole i tipke su isključeni.
   * Kada se mod ugasi, ISTI element preuzima puni ekran bez ponovnog
   * učitavanja streama i HUD se pokaže na 4.5s.
   */
  backgroundMode?: boolean;
  /** Zvuk u pozadinskom modu (u punom modu je zvuk uvijek uključen). */
  backgroundMuted?: boolean;
  /** Javlja da je stream počeo svirati (koristi startup loading gate). */
  onReady?: () => void;
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
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
const buildMiniChannelsFromDw = (rows: DwScheduleItem[], fallbackThumb: string): MiniChannel[] => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return rows.map((r, idx) => {
    const start = new Date(r.start_time);
    const end = new Date(r.end_time);
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
      id: r.id ?? `dw-${idx}`,
      title: r.title ?? "",
      timeRange: `${fmt(start)} - ${fmt(end)}`,
      day,
      date: `${String(start.getDate()).padStart(2, "0")}.${String(start.getMonth() + 1).padStart(2, "0")}.`,
      thumbnail: r.thumbnail_url || fallbackThumb,
      ...(isCurrent ? { isCurrent: true } : {}),
      streamUrl: r.stream_url ?? null,
      channelName: r.channel_name ?? null,
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

// Roditeljski PIN za zaključavanje programa (privremeno lokalno, do baze)
const PIN_LEN = 4;
const getParentalPin = () => {
  try {
    return localStorage.getItem("parental_pin") || "0000";
  } catch {
    return "0000";
  }
};

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

// React.memo — ove kartice se renderiraju u više primjeraka istovremeno (slot iznad HUD-a
// + HUD kartica) pri svakom renderu VideoPlayera (npr. svaki "tick" progress bara), iako se
// sam sadržaj kartice često uopće ne mijenja.
const ChannelCard = memo(
  ({
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
          <div
            style={{ height: 22, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 6 }}
          >
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
          }}
        >
          <span
            className="absolute top-1.5 left-2 font-bold tabular-nums leading-none"
            style={{ fontSize: "13px", color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}
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
                style={{}}
                decoding="async"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Tv
                style={{
                  width: 40,
                  height: 40,
                  color: isFocused ? GOLD : isActive ? "#e8c94a" : "rgba(255,255,255,0.8)",
                  transition: "color 0.18s",
                }}
              />
            )}
          </div>
        </div>

        {showArrows ? (
          <div
            style={{ height: 22, display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: 6 }}
          >
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
  },
);

interface EPGCardProps {
  channel: MiniChannel;
  isFocused: boolean;
  isFuture: boolean;
  onSelect: () => void;
}

// React.memo — u EPG traci je istovremeno prikazano više ovakvih kartica; bez memo-a se
// SVAKA od njih re-renderira (uključujući IIFE izračun postotka napretka programa) čim se
// bilo koja od njih pomakne, umjesto samo one čiji su se propovi stvarno promijenili.
const EPGCard = memo(({ channel, isFocused, isFuture, onSelect }: EPGCardProps) => (
  <div
    className={cn(
      "relative flex flex-col rounded-lg overflow-visible transition-all duration-300 ease-in-out cursor-pointer",
      isFocused ? "z-10" : "",
    )}
    style={{
      backgroundColor: "rgba(10,10,10,1)",
      boxShadow: isFocused ? `0 0 0 2px ${GOLD}` : "none",
    }}
    onClick={onSelect}
  >
    {isFocused && (
      <div
        className="absolute flex items-center justify-center"
        style={{ left: -15, top: 0, bottom: "2.5rem", width: 15, pointerEvents: "none" }}
      >
        <svg width="15" height="42" viewBox="0 0 12 36" fill="none">
          <path d="M10 1 L1 18 L10 35 Q7 18 10 1 Z" fill={GOLD} />
        </svg>
      </div>
    )}

    {isFocused && (
      <div
        className="absolute flex items-center justify-center"
        style={{ right: -15, top: 0, bottom: "2.5rem", width: 15, pointerEvents: "none" }}
      >
        <svg width="15" height="42" viewBox="0 0 12 36" fill="none">
          <path d="M2 1 L11 18 L2 35 Q5 18 2 1 Z" fill={GOLD} />
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
        // Animating `filter` re-rasterises the image every frame on Mali GPUs;
        // the end states (grayscale / none) are unchanged, only the 0.3s tween
        // between them is dropped.
        style={{ filter: isFuture && !isFocused ? "grayscale(100%)" : "none" }}
        decoding="async"
        loading="lazy"

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
        <p className="text-[13px] font-mono" style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}>
          {channel.timeRange}
        </p>
        <p className="text-[13px]" style={{ color: isFocused ? "rgba(245,197,24,0.7)" : "rgba(255,255,255,0.3)" }}>
          {channel.date}
        </p>
      </div>
      <p className="text-xs font-semibold truncate" style={{ color: isFocused ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
        {channel.title}
      </p>
      <p className="text-[13px]" style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.35)" }}>
        {channel.day}
      </p>
    </div>
  </div>
));

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
          fontSize: 20,
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
          fontSize: 91,
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
  backgroundMode = false,
  backgroundMuted = false,
  onReady,
}: VideoPlayerProps) => {
  // Refovi da promjena moda / callbacka ne ponovno pokreće HLS efekt (koji bi
  // iznova učitao stream — točno ono što u seamless prijelazu ne smije nastati).
  const backgroundModeRef = useRef(backgroundMode);
  backgroundModeRef.current = backgroundMode;
  const backgroundMutedRef = useRef(backgroundMuted);
  backgroundMutedRef.current = backgroundMuted;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const channelLookup = allChannels && allChannels.length > 0 ? allChannels : favoriteChannels;

  const showTitle = data?.showTitle ?? "Vesti B92";
  const timeRange = data?.timeRange ?? "18:10 - 18:30";
  const thumbnail = data?.thumbnail ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80";
  const streamUrl = data?.streamUrl;
  const channelId = data?.channelId;
  const fallbackThumb = data?.thumbnail ?? thumbnail;

  // Deklarirano ovdje (a ne niže s ostalim stanjem) jer o njima ovisi hoće li se
  // EPG uopće dohvaćati u ovom renderu.
  const [showHud, setShowHud] = useState<boolean>(false);
  const [epgMode, setEpgMode] = useState<boolean>(false);

  // EPG raspored se dohvaća/gradi SAMO kada je HUD (ili EPG prikaz) stvarno vidljiv.

  // U pozadinskom modu i u "mirnom" punom modu (HUD sakriven) nema mrežnog poziva,
  // ni mapiranja stotina redova — video svira bez ikakvog dodatnog opterećenja.
  const scheduleEnabled = !backgroundMode && (showHud || epgMode);
  const { data: dwRows } = useDwSchedule(scheduleEnabled);
  const miniChannels: MiniChannel[] = useMemo(() => {
    if (!scheduleEnabled) return [];
    if (dwRows && dwRows.length > 0) return buildMiniChannelsFromDw(dwRows, fallbackThumb);
    return FALLBACK_MINI_CHANNELS;
  }, [scheduleEnabled, dwRows, fallbackThumb]);


  const playScheduleItem = useCallback(
    (idx: number) => {
      const item = miniChannels[idx];
      if (!item || !item.streamUrl || !onSwitchChannel) return;
      onSwitchChannel({
        channelName: item.channelName ?? data?.channelName,
        showTitle: item.title,
        timeRange: item.timeRange,
        thumbnail: item.thumbnail,
        streamUrl: item.streamUrl,
        logoUrl: data?.logoUrl ?? null,
      });
    },
    [miniChannels, onSwitchChannel, data?.channelName, data?.logoUrl],
  );

  // favAsSidebarChannels — favoriteChannels konvertirani u SidebarChannel format.
  // useMemo umjesto plain .map() — bez ovoga se čitav niz (i svi objekti u njemu)
  // iznova kreirao pri SVAKOM renderu VideoPlayera (npr. svaki "tick" progress bara),
  // što je karticama ispod davalo nove reference propova i prisiljavalo ih na
  // re-render bez ikakve stvarne promjene sadržaja.
  const favAsSidebarChannels: SidebarChannel[] = useMemo(
    () =>
      favoriteChannels.map((fc) => ({
        id: `fav-${fc.number}`,
        num: fc.number,
        label: fc.channelName,
        sub: "ODIVIZIJA",
      })),
    [favoriteChannels],
  );

  // Mape za O(1) pretragu kanala — zamjena za ponovljene .find()/.findIndex() prolaze
  // kroz nizove kanala koji su se prije radili iznova pri svakom renderu i pri svakoj
  // promjeni kanala/tipke na daljinskom.
  const channelLookupByName = useMemo(() => {
    const map = new Map<string, FavoriteChannel>();
    for (const c of channelLookup) map.set(c.channelName, c);
    return map;
  }, [channelLookup]);

  const allChannelsByName = useMemo(() => {
    const map = new Map<string, FavoriteChannel>();
    for (const c of allChannels ?? []) map.set(c.channelName, c);
    return map;
  }, [allChannels]);

  const favoriteByNumber = useMemo(() => {
    const map = new Map<number, FavoriteChannel>();
    for (const c of favoriteChannels) map.set(c.number, c);
    return map;
  }, [favoriteChannels]);

  // Pozicija trenutnog kanala u listi omiljenih — prije se identičan izračun
  // (Math.max(0, favoriteChannels.findIndex(...))) ponavljao na 3 mjesta u komponenti
  // pri svakom renderu; sada se računa jednom i dijeli.
  const currentFavIndex = useMemo(
    () =>
      Math.max(
        0,
        favoriteChannels.findIndex((fc) => fc.channelName === data?.channelName),
      ),
    [favoriteChannels, data?.channelName],
  );

  // Jedini pouzdani izvor za logo je allChannels — direktno iz baze s channel_logos
  // merge-om. Sve kartice u lancu (slot + HUD) koriste ovu istu funkciju. Prebačeno u
  // useCallback + Map lookup (umjesto .find() i console.log pri svakom pozivu, za
  // svaku karticu, pri svakom renderu — console I/O na slabom uređaju zna biti
  // iznenađujuće skupo).
  const getLogoUrl = useCallback(
    (channelName: string | undefined): string | null => {
      if (!channelName) return null;
      return allChannelsByName.get(channelName)?.logoUrl ?? null;
    },
    [allChannelsByName],
  );

  const [progress, setProgress] = useState(42);
  const [aspectRatioMode, setAspectRatioMode] = useState<"original" | "fill" | "4:3" | "16:9">("fill");
  const [videoNativeAR, setVideoNativeAR] = useState<number | null>(null);
  // Zaključavanje programa — kada je true, gumb za zaključavanje je označen zlatnom bojom
  const [isLocked, setIsLocked] = useState<boolean>(false);
  // PIN potvrda prije (ot)ključavanja programa
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");

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
  const cycleAspectRatio = useCallback(() => {
    setAspectRatioMode((p) => {
      if (p === "original") return "fill";
      if (p === "fill") return "4:3";
      if (p === "4:3") return "16:9";
      return "original";
    });
  }, []);
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

    const applyMute = () => {
      try {
        video.muted = backgroundModeRef.current ? backgroundMutedRef.current : false;
        video.volume = 1;
      } catch {
        /* noop */
      }
    };
    const onPlaying = () => {
      setVideoReady(true);
      hideSpinner();
      applyMute();
      onReadyRef.current?.();
    };
    const enableSoundOnGesture = () => {
      applyMute();
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
      // Release the hardware decoder explicitly. Without this, Android TV
      // WebView keeps decoding/holding buffers while React tears the tree down,
      // which is exactly the freeze felt when leaving the player.
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
    };

  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    if (isPlaying) video.play().catch(() => {});
    else video.pause();
  }, [isPlaying, streamUrl]);

  // Zvuk se mijenja bez dodirivanja streama (prijelaz pozadina ⇄ puni ekran).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = backgroundMode ? backgroundMuted : false;
      video.volume = 1;
    } catch {
      /* noop */
    }
  }, [backgroundMode, backgroundMuted, videoReady]);



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
    setVerticalIndex(currentFavIndex);
    // -1 = HUD kartica je fokusirana (trokutići); 4 kartice iznad su preview bez fokusa.
    setSidebarFocus(-1);
    setFocusedControl(-1);
  }, [currentFavIndex]);

  const closeSidebar = useCallback(() => {
    setSidebarFocus(-1);
    setFocusedControl(0);
    resetHideTimer();
  }, [resetHideTimer]);

  // total/hudIdx/aboveWindow pomaknuti ovdje (prije early returna) i memoizirani kako bi
  // ChannelCard komponente u slotu mogle stvarno iskoristiti React.memo — bez ovoga su se
  // ovaj niz i onClick handleri ispod iznova računali pri SVAKOM renderu, pa je memo na
  // ChannelCard-u bio bezvrijedan i svaka kartica se ponovno crtala baš dok se HUD traka
  // otvara (otud sitni trzaji na slabijem GPU-u).
  const total = Math.max(favoriteChannels.length, 1);
  const hudIdx = useMemo(
    () => (sidebarOpen && sidebarFocus !== -1 ? sidebarFocus : currentFavIndex),
    [sidebarOpen, sidebarFocus, currentFavIndex],
  );
  const aboveWindow = useMemo(
    () => Array.from({ length: 4 }, (_, i) => (((hudIdx + (4 - i)) % total) + total) % total),
    [hudIdx, total],
  );

  // Stabilni onClick handleri za slot kartice — jedan po vidljivom kanalu, memoizirani
  // zajedno s aboveWindow. Bez ovoga bi svaka ChannelCard u slotu dobivala NOVU onClick
  // referencu pri svakom renderu (čak i nakon što je sam ChannelCard omotan u memo), što
  // u potpunosti poništava korist od memo-a.
  const slotClickHandlers = useMemo(
    () =>
      aboveWindow.map((chIdx) => () => {
        const favCh = favoriteChannels[chIdx];
        if (favCh && onSwitchChannel) {
          const resolvedStreamUrl = favCh.streamUrl ?? channelLookupByName.get(favCh.channelName)?.streamUrl;
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
      }),
    [aboveWindow, favoriteChannels, onSwitchChannel, channelLookupByName],
  );

  // "Latest values" ref — handleKeyDown čita svježe podatke odavde umjesto da ih drži kao
  // closure/dependency. Bez ovoga bi se handleKeyDown (i time useZoneKeys efekt koji ga
  // registrira/deregistrira) re-kreirao pri SVAKOJ promjeni fokusa/unosa na daljinskom —
  // što je bio glavni uzrok "laga" pri navigaciji unutar playera na slabijem uređaju.
  const kbStateRef = useRef({
    isVisible,
    focusedControl,
    epgMode,
    sidebarFocus,
    isProgressFocused,
    channelInput,
    showHud,
    pinOpen,
    pinValue,
    epgFocusIndex,
    miniChannels,
    data,
    currentFavIndex,
    favoriteChannels,
  });

  useEffect(() => {
    kbStateRef.current = {
      isVisible,
      focusedControl,
      epgMode,
      sidebarFocus,
      isProgressFocused,
      channelInput,
      showHud,
      pinOpen,
      pinValue,
      epgFocusIndex,
      miniChannels,
      data,
      currentFavIndex,
      favoriteChannels,
    };
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const {
        isVisible,
        focusedControl,
        epgMode,
        sidebarFocus,
        isProgressFocused,
        channelInput,
        showHud,
        pinOpen,
        pinValue,
        epgFocusIndex,
        miniChannels,
        data,
        currentFavIndex,
        favoriteChannels,
      } = kbStateRef.current;

      if (!isVisible) return;

      // PIN popup ima prioritet nad ostalom navigacijom playera
      if (pinOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (/^\d$/.test(e.key)) {
          setPinError("");
          setPinValue((p) => (p.length >= PIN_LEN ? p : p + e.key));
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          if (pinValue.length !== PIN_LEN) {
            setPinError("Unesite 4-cifreni PIN.");
            return;
          }
          if (pinValue === getParentalPin()) {
            setIsLocked((p) => !p);
            setPinOpen(false);
            setPinValue("");
            setPinError("");
          } else {
            setPinError("Pogrešan PIN, pokušajte ponovno.");
            setPinValue("");
          }
          return;
        }
        if (e.key === "Escape" || e.key === "Backspace" || e.key === "XF86Back") {
          if (e.key === "Backspace" && pinValue.length > 0) {
            setPinValue((p) => p.slice(0, -1));
            return;
          }
          setPinOpen(false);
          setPinValue("");
          setPinError("");
          return;
        }
        return;
      }

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
          const favCh = favoriteByNumber.get(num);
          if (favCh && onSwitchChannel) {
            // Fallback: ako favCh.streamUrl nije dostupan, traži u allChannels po imenu
            const resolvedStreamUrl = favCh.streamUrl ?? allChannelsByName.get(favCh.channelName)?.streamUrl;
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
          case "Enter":
            e.preventDefault();
            playScheduleItem(epgFocusIndex);
            return;
          case "Escape":
          case "Backspace":
            e.preventDefault();
            closeEpgMode();
            return;
        }
        return;
      }

      if (focusedControl === -1) {
        const favTotal = Math.max(favoriteChannels.length, 1);
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            // HUD kartica je uvijek fokus. Skrol gore = HUD prikazuje sljedeći kanal u nizu.
            setSidebarFocus((p) => {
              const cur = p === -1 ? currentFavIndex : p;
              return (cur + 1) % favTotal;
            });
            resetHideTimer();
            return;
          case "ArrowDown":
            e.preventDefault();
            // Skrol dolje = HUD prikazuje prethodni kanal u nizu.
            setSidebarFocus((p) => {
              const cur = p === -1 ? currentFavIndex : p;
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
            const hudIdxLocal = sidebarFocus === -1 ? currentFavIndex : sidebarFocus;
            const favCh = favoriteChannels[hudIdxLocal];
            if (favCh && onSwitchChannel && favCh.channelName !== data?.channelName) {
              // Fallback: ako favCh.streamUrl nije dostupan, traži u channelLookup
              const resolvedStreamUrl = favCh.streamUrl ?? channelLookupByName.get(favCh.channelName)?.streamUrl;
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
          if (focusedControl < 5) setFocusedControl((p) => p + 1);
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
          if (focusedControl === 3) {
            setPinValue("");
            setPinError("");
            setPinOpen(true);
          }

          if (focusedControl === 4) cycleAspectRatio();
          if (focusedControl === 5) onToggleFavorite?.();
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [
      onClose,
      openEpgMode,
      closeEpgMode,
      openSidebar,
      closeSidebar,
      resetHideTimer,
      goLive,
      onToggleFavorite,
      onSwitchChannel,
      cycleAspectRatio,
      playScheduleItem,
      favoriteByNumber,
      allChannelsByName,
      channelLookupByName,
    ],
  );

  useZoneKeys("tv-player", handleKeyDown, isVisible && !backgroundMode, 40);

  // U pozadinskom modu nema HUD-a. Čim mod prestane (korisnik odabere kanal koji
  // već svira), HUD se pokaže na 4.5s bez ponovnog učitavanja streama.
  useEffect(() => {
    if (!isVisible) return;
    if (backgroundMode) {
      setShowHud(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
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
  }, [isVisible, streamUrl, backgroundMode]);


  if (!isVisible) return null;

  // HUD kartica je UVIJEK fokus zona. Skrolanjem se mijenja koji se kanal prikazuje
  // u HUD-u (preview), a 4 kartice iznad progress bara su sljedeći kandidati u nizu.
  // Enter učitava stream kanala koji je trenutno u HUD-u.
  const currentIdx = currentFavIndex;

  // hudIdx / total / aboveWindow / slotClickHandlers su već izračunati gore (prije early
  // returna) kao memoizirane vrijednosti — ovdje se samo izvode preostale, jeftine vrijednosti.
  const hudFav = favoriteChannels[hudIdx];
  const hudIsCurrent = hudIdx === currentIdx;

  const hudChannel: SidebarChannel = {
    id: "hud",
    num: hudFav?.number ?? 0,
    label: hudFav?.channelName ?? data?.channelName ?? "",
    sub: "ODIVIZIJA",
  };

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
  const foundFavChannel = isNaN(inputNum) ? undefined : favoriteByNumber.get(inputNum);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={
        backgroundMode
          ? "absolute inset-0 z-0 overflow-hidden pointer-events-none"
          : "absolute inset-0 z-50 overflow-hidden"
      }
      style={{ backgroundColor: backgroundMode ? "transparent" : "#0d0d0d" }}
    >

      {pinOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: 420,
              padding: "36px 40px",
              backgroundColor: "#000",
              border: `3px solid ${GOLD}`,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
            }}
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
              <defs>
                <mask id="pin-lock-mask">
                  <rect x="4" y="10" width="16" height="11" rx="2" fill="white" />
                  <circle cx="12" cy="15.3" r="1.7" fill="black" />
                  <rect x="11.2" y="15.3" width="1.6" height="3" fill="black" />
                </mask>
              </defs>
              <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke={GOLD} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <rect x="4" y="10" width="16" height="11" rx="2" fill={GOLD} mask="url(#pin-lock-mask)" />
            </svg>

            <div style={{ display: "flex", gap: 18 }}>
              {Array.from({ length: PIN_LEN }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 34,
                  }}
                >
                  {pinValue.length > i ? (
                    <div style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: GOLD }} />
                  ) : (
                    <div style={{ width: 30, height: 5, borderRadius: 3, backgroundColor: GOLD }} />
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, textAlign: "center", margin: 0 }}>
              Unesite PIN i potvrdite s OK
            </p>
            <p
              style={{
                color: "#ff6b6b",
                fontSize: 14,
                textAlign: "center",
                margin: 0,
                height: 18,
                lineHeight: "18px",
                visibility: pinError ? "visible" : "hidden",
              }}
            >
              {pinError || "\u00A0"}
            </p>
          </div>
        </div>
      )}
      <div className="relative w-full h-full overflow-hidden">
        {!videoReady && !backgroundMode && (
          <div className="absolute inset-0" style={{ backgroundColor: "#000", zIndex: 0 }} />
        )}
        {streamUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              overflow: "hidden",
              opacity: backgroundMode ? 0.4 : 1,
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
        {/* Zatamnjenje ispod UI-a početne stranice (pozadinski mod) */}
        {backgroundMode && <div className="absolute inset-0 bg-background/70" style={{ zIndex: 2 }} />}

        {/* Spinner (i njegova beskonačna CSS animacija) postoji SAMO dok se stream
            učitava u punom modu. U pozadinskom modu i nakon što video krene se
            uopće ne montira — inače bi rotacija trošila GPU/CPU cijelo vrijeme. */}
        {!videoReady && !backgroundMode && (
          <>
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
                transition: "opacity 0.15s linear",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
            <style>{`@keyframes vp-spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}


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
                // willChange + contain: priprema GPU sloj unaprijed i izolira layout/style
                // izračun ove trake od ostatka stranice — pozadinska optimizacija, ne mijenja
                // izgled ni ponašanje.
                willChange: "opacity",
                contain: "layout style",
              }}
            >
              {aboveWindow.map((chIdx, i) => {
                const ch = favAsSidebarChannels[chIdx];
                if (!ch) return null;
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
                      logoUrl={getLogoUrl(favoriteChannels[chIdx]?.channelName)}
                      onClick={slotClickHandlers[i]}
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
              style={{
                zIndex: 40,
                // willChange + contain: isto obrazloženje kao kod slot trake iznad — priprema
                // GPU sloj i izolira layout ove trake, bez utjecaja na izgled.
                willChange: "transform, opacity",
                contain: "layout style",
              }}
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
                          <div className="p-1 bg-white/20 rounded-lg border border-white/40 shadow-2xl">
                            <div className="w-56 aspect-video rounded overflow-hidden relative bg-black">
                              <img
                                src={thumbnail}
                                alt="preview"
                                className="w-full h-full object-cover"
                                decoding="async"
                              />
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-[14px] font-bold text-white tabular-nums border border-white/10">
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
                              transform: isBtnFocused ? "translate3d(0,0,0) scale(1.12)" : "translate3d(0,0,0)",
                            }}
                          >
                            <Icon className={isMain ? "w-6 h-6" : "w-5 h-5"} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, flexShrink: 0 }}>
                    {/* Zaključaj program — obris uvijek zlatan, rupica (ključanica) prozirna dok nije zaključano, puna zlatna kad jeste.
                        IZMJENA: fokus se sad prikazuje samo promjenom opacity/scale ikone, bez kockastog
                        containera sa žutim borderom i pozadinom. */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocusedControl(3);
                        setPinValue("");
                        setPinError("");
                        setPinOpen(true);
                      }}
                      title={isLocked ? "Otključaj program" : "Zaključaj program"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        background: "none",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: isLocked || (focusedControl === 3 && !epgMode && !isProgressFocused) ? 1 : 0.55,
                        transform: focusedControl === 3 && !epgMode && !isProgressFocused ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <mask id="lock-keyhole-mask">
                            <rect x="4" y="10" width="16" height="11" rx="2" fill="white" />
                            <circle cx="12" cy="15.5" r="1.8" fill="black" />
                          </mask>
                        </defs>
                        <path
                          d="M7 10V7a5 5 0 0 1 10 0v3"
                          stroke={GOLD}
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                        />
                        {isLocked ? (
                          <rect x="4" y="10" width="16" height="11" rx="2" fill={GOLD} mask="url(#lock-keyhole-mask)" />
                        ) : (
                          <>
                            <rect
                              x="4"
                              y="10"
                              width="16"
                              height="11"
                              rx="2"
                              stroke={GOLD}
                              strokeWidth="2"
                              fill="none"
                            />
                            <circle cx="12" cy="15.5" r="1.8" stroke={GOLD} strokeWidth="1.4" fill="none" />
                          </>
                        )}
                      </svg>
                    </button>

                    {/* Aspect Ratio gumb.
                        IZMJENA: fokus se sad prikazuje samo promjenom opacity/scale ikone, bez kockastog
                        containera sa žutim borderom i pozadinom. */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocusedControl(4);
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
                        background: "none",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: focusedControl === 4 && !epgMode && !isProgressFocused ? 1 : 0.55,
                        transform: focusedControl === 4 && !epgMode && !isProgressFocused ? "scale(1.08)" : "scale(1)",
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
                          fontSize: 11,
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
                        opacity: isFavoriteProp || (focusedControl === 5 && !epgMode && !isProgressFocused) ? 1 : 0.55,
                        outline: "none",
                        borderRadius: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        transform: focusedControl === 5 && !epgMode && !isProgressFocused ? "scale(1.08)" : "scale(1)",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocusedControl(5);
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
                              onSelect={() => {
                                const target = start + i;
                                if (epgFocusIndex === target) {
                                  playScheduleItem(target);
                                } else {
                                  setEpgFocusIndex(target);
                                }
                              }}
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
                            decoding="async"
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
