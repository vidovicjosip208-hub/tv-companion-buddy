import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Tv } from "lucide-react";

// --- KONSTANTE ZA LANAC ---
const GOLD = "#F5C518";
const AUTO_HIDE_MS = 4500;
const CARD_W = 132;
const CARD_H = 80;
const GAP = 16;
const ITEM_STEP = CARD_H + 44 + GAP;

// --- INTERFEJSI ---
interface SidebarChannel {
  id: string;
  num: number;
  label: string;
  sub: string;
}

// --- MOCK DATA ---
const sidebarChannels: SidebarChannel[] = [
  { id: "s1", num: 4, label: "federalna", sub: "ODIVIZIJA" },
  { id: "s2", num: 5, label: "RTRS", sub: "ODIVIZIJA" },
  { id: "s3", num: 6, label: "MAX", sub: "ODIVIZIJA" },
  { id: "s4", num: 7, label: "Hayat TV", sub: "ODIVIZIJA" },
  { id: "s5", num: 8, label: "OBN", sub: "ODIVIZIJA" },
  { id: "s6", num: 9, label: "Nova TV", sub: "ODIVIZIJA" },
  { id: "s7", num: 10, label: "HRT 1", sub: "ODIVIZIJA" },
];

// --- POMOĆNE KOMPONENTE ---
const ChannelCard = ({ ch, isActive = false, isFocused = false, width = "100%", showArrows = false }: any) => (
  <div className="flex flex-col items-center flex-shrink-0 select-none" style={{ width }}>
    <div style={{ height: 22, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 6 }}>
      {showArrows && isFocused && (
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
        boxShadow: isFocused ? `0 0 14px 4px rgba(245,197,24,0.28)` : "none",
      }}
    >
      <span
        className="absolute top-1.5 left-2 font-bold text-[10px]"
        style={{ color: isFocused ? GOLD : "rgba(255,255,255,0.5)" }}
      >
        {ch.num}
      </span>
      <div className="mt-3 mb-1 flex items-center justify-center" style={{ height: 32 }}>
        <Tv
          style={{ width: 24, height: 24, color: isFocused ? GOLD : isActive ? "#e8c94a" : "rgba(255,255,255,0.8)" }}
        />
      </div>
      <span className="font-bold text-center leading-tight w-full truncate text-[11px] text-white/85">{ch.label}</span>
      <span className="font-semibold tracking-widest text-[6.5px] text-white/30 uppercase mt-0.5">{ch.sub}</span>
    </div>
    <div style={{ height: 22, display: "flex", alignItems: "flex-start", justifyContent: "center", marginTop: 6 }}>
      {showArrows && isFocused && (
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
  </div>
);

// --- GLAVNA KOMPONENTA (Sada kao DEFAULT EXPORT) ---
const VideoPlayer = ({
  isVisible = true,
  onClose = () => {},
  data,
  onToggleFavorite,
  favoriteChannels = [],
  onSwitchChannel,
}: any) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showHud, setShowHud] = useState(false);
  const [focusedControl, setFocusedControl] = useState(1);
  const [sidebarFocus, setSidebarFocus] = useState(2);
  const [verticalIndex, setVerticalIndex] = useState(2);

  const videoRef = useRef<HTMLVideoElement>(null);
  const sidebarOpen = focusedControl === -1;
  const hideTimer = useRef<any>(null);

  const resetHideTimer = useCallback(() => {
    setShowHud(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowHud(false), AUTO_HIDE_MS);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;
      resetHideTimer();

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
            setFocusedControl(1);
            return;
          case "Escape":
          case "Backspace":
            setFocusedControl(0);
            return;
        }
      }

      if (e.key === "ArrowLeft" && focusedControl === 0) {
        setFocusedControl(-1);
        setVerticalIndex(sidebarFocus);
      } else if (e.key === "ArrowRight" && focusedControl < 3) {
        setFocusedControl((p) => p + 1);
      } else if (e.key === "ArrowLeft" && focusedControl > 0) {
        setFocusedControl((p) => p - 1);
      }
    },
    [isVisible, sidebarOpen, verticalIndex, sidebarFocus, focusedControl, resetHideTimer],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover" />

      <AnimatePresence>
        {showHud && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* SIDEBAR ZUPČANIK */}
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden"
              style={{ width: CARD_W + 20, height: ITEM_STEP }}
            >
              <motion.div
                className="flex flex-col items-center"
                animate={{ translateY: -(verticalIndex * ITEM_STEP) }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ gap: GAP }}
              >
                {sidebarChannels.map((ch, idx) => {
                  const isFocusedInGear = verticalIndex === idx;
                  return (
                    <div key={ch.id} style={{ height: ITEM_STEP - GAP }}>
                      <motion.div
                        animate={{
                          scale: isFocusedInGear ? 1.1 : 0.85,
                          opacity: Math.abs(verticalIndex - idx) > 1 ? 0 : 1,
                        }}
                      >
                        <ChannelCard
                          ch={ch}
                          isActive={sidebarFocus === idx}
                          isFocused={sidebarOpen && isFocusedInGear}
                          width={CARD_W}
                          showArrows={isFocusedInGear}
                        />
                      </motion.div>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* DONJI HUD (Osnovno za build) */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
              <div className={`p-4 rounded-full ${focusedControl === 1 ? "bg-yellow-500" : "bg-white/10"}`}>
                {isPlaying ? <Pause /> : <Play />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;
