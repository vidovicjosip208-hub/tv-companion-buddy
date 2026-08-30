import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv } from "lucide-react";

const GOLD = "#F5C518";

interface SeamlessLiveHudProps {
  visible: boolean;
  channelName?: string;
  channelNumber?: string;
  showTitle?: string;
  timeRange?: string;
  logoUrl?: string | null;
}

// Postotak odgledane emisije iz "HH:MM - HH:MM" raspona (live TV progress).
const liveProgress = (range?: string): number => {
  if (!range) return 0;
  const [startPart, endPart] = range.split(" - ");
  if (!startPart || !endPart) return 0;
  const [sh, sm] = startPart.split(":").map(Number);
  const [eh, em] = endPart.split(":").map(Number);
  const now = new Date();
  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  let end = new Date(now);
  end.setHours(eh, em, 0, 0);
  if (end <= start) end = new Date(end.getTime() + 86400000);
  const pct = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  return Math.min(100, Math.max(0, pct));
};

/**
 * Lagana HUD traka za "seamless" gledanje: kanal već svira u BackgroundPlayeru,
 * pa se pri odabiru istog kanala iz Omiljenih ne otvara pravi VideoPlayer (bez
 * ponovnog učitavanja streama) — samo se na kratko pokaže ista HUD traka.
 */
const SeamlessLiveHud = ({
  visible,
  channelName,
  channelNumber,
  showTitle,
  timeRange,
  logoUrl,
}: SeamlessLiveHudProps) => {
  const [progress, setProgress] = useState(() => liveProgress(timeRange));
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setProgress(liveProgress(timeRange));
    if (!visible) return;
    const t = window.setInterval(() => setProgress(liveProgress(timeRange)), 1000);
    return () => window.clearInterval(t);
  }, [visible, timeRange]);

  useEffect(() => setLogoError(false), [logoUrl]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="seamless-hud"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-none"
          style={{ zIndex: 40, willChange: "transform, opacity", contain: "layout style" }}
        >
          {/* Progress bar */}
          <div className="relative h-1.5 w-full bg-white/10 flex items-center">
            <div className="absolute top-0 left-0 h-full" style={{ backgroundColor: GOLD, width: `${progress}%` }} />
            <div
              className="absolute w-5 h-5 rounded-full shadow-lg"
              style={{ backgroundColor: "#bbbbbb", left: `${progress}%`, transform: "translateX(-50%)", zIndex: 20 }}
            />
          </div>

          {/* HUD control row — isti izgled kao VideoPlayer HUD */}
          <div className="relative flex items-center pt-3 pb-3" style={{ backgroundColor: "rgba(10,10,10,0.78)" }}>
            <div
              className="ml-4 flex-shrink-0 flex items-center gap-3 rounded-md px-3 py-2"
              style={{ backgroundColor: "rgba(22,22,30,1)", border: `1px solid rgba(245,197,24,0.45)` }}
            >
              {channelNumber && (
                <span className="font-bold tabular-nums leading-none" style={{ fontSize: "16px", color: GOLD }}>
                  {channelNumber}
                </span>
              )}
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={channelName ?? ""}
                  className="max-h-[40px] max-w-[90px] object-contain"
                  decoding="async"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Tv style={{ width: 28, height: 28, color: "rgba(255,255,255,0.6)" }} />
              )}
              <span className="font-semibold text-white text-base truncate max-w-[180px]">{channelName}</span>
            </div>

            <div className="flex items-center gap-3 ml-5 min-w-0 flex-1">
              <span className="text-sm font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                {timeRange}
              </span>
              <h2 className="font-bold text-lg truncate" style={{ color: "#ffffff" }}>
                {showTitle}
              </h2>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SeamlessLiveHud;
