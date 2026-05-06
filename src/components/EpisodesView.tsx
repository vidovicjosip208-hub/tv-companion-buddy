import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ContentDetailsData, getEpisodesForItem, allContentItems } from "@/data/videotekaContent";

interface EpisodesViewProps {
  itemId: string;
  details: ContentDetailsData;
  onClose: () => void;
}

const EpisodesView = ({ itemId, details, onClose }: EpisodesViewProps) => {
  const { t } = useTranslation();
  const seasons = getEpisodesForItem(itemId);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [focusedArea, setFocusedArea] = useState<"seasons" | "episodes">("seasons");
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState(0);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(0);
  const isTrailersSelected = selectedSeason === seasons.length;

  const currentSeason = isTrailersSelected ? seasons[0] : seasons[selectedSeason];
  const contentItem = allContentItems.find((item) => item.id === itemId);
  const backdropImage = contentItem?.thumbnail ?? null;

  const episodeListRef = useRef<HTMLDivElement>(null);
  const seasonListRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusedArea === "seasons") {
      setSelectedSeason(focusedSeasonIndex);
      setFocusedEpisodeIndex(0);
    }
  }, [focusedSeasonIndex, focusedArea]);

  useEffect(() => {
    if (focusedArea !== "episodes" || !episodeListRef.current) return;
    const items = episodeListRef.current.querySelectorAll("[data-episode]");
    (items[focusedEpisodeIndex] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedEpisodeIndex, focusedArea]);

  useEffect(() => {
    if (focusedArea !== "seasons" || !seasonListRef.current) return;
    const items = seasonListRef.current.querySelectorAll("[data-season]");
    (items[focusedSeasonIndex] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedSeasonIndex, focusedArea]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
        case "Backspace":
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusedArea === "seasons") {
            setFocusedSeasonIndex((p) => Math.max(p - 1, 0));
          } else {
            setFocusedEpisodeIndex((p) => Math.max(p - 1, 0));
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (focusedArea === "seasons") {
            setFocusedSeasonIndex((p) => Math.min(p + 1, seasons.length));
          } else {
            setFocusedEpisodeIndex((p) => Math.min(p + 1, currentSeason.episodes.length - 1));
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (focusedArea === "seasons" && focusedSeasonIndex < seasons.length) {
            setFocusedArea("episodes");
            setFocusedEpisodeIndex(0);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusedArea === "episodes") setFocusedArea("seasons");
          break;
        case "Enter":
          e.preventDefault();
          if (focusedArea === "seasons" && focusedSeasonIndex < seasons.length) {
            setSelectedSeason(focusedSeasonIndex);
            setFocusedEpisodeIndex(0);
          }
          break;
      }
    },
    [focusedArea, focusedSeasonIndex, focusedEpisodeIndex, seasons.length, currentSeason.episodes.length, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-[60] flex flex-col lg:flex-row overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {backdropImage ? (
          <img
            src={backdropImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "blur(7px) saturate(0.7)", transform: "scale(1.04)" }}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* LEFT SIDEBAR */}
      <div className="relative z-10 w-full lg:w-[42%] shrink-0 lg:h-full flex flex-col px-4 sm:px-8 lg:px-12 py-6 lg:py-12">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 lg:mb-10"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            {details.title}
          </h2>
          <p className="text-sm sm:text-base text-white/50">
            {details.year} · {details.episodes || "1 Season"}
          </p>
        </motion.div>

        <motion.nav
          ref={seasonListRef}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-1 flex-1 overflow-y-auto scrollbar-hide"
        >
          {seasons.map((season, index) => {
            const isSelected = selectedSeason === index;
            const isFocused = focusedArea === "seasons" && focusedSeasonIndex === index;
            return (
              <button
                key={season.season}
                data-season=""
                onMouseEnter={() => {
                  setFocusedArea("seasons");
                  setFocusedSeasonIndex(index);
                  setSelectedSeason(index);
                  setFocusedEpisodeIndex(0);
                }}
                onClick={() => {
                  setSelectedSeason(index);
                  setFocusedSeasonIndex(index);
                  setFocusedArea("seasons");
                  setFocusedEpisodeIndex(0);
                }}
                className={`
                  flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 lg:py-5 rounded-xl text-left transition-colors w-full flex-shrink-0
                  ${isSelected ? "bg-white/15 text-white" : "text-white/50"}
                  ${isFocused ? "ring-2 ring-inset ring-white/40" : ""}
                `}
              >
                <span className="font-semibold text-base sm:text-lg lg:text-xl">
                  {t("videotekaDetail.season")} {season.season}
                </span>
                <span className="text-xs sm:text-sm text-white/40">
                  {season.episodes.length} {t("videotekaDetail.episodes")}
                </span>
              </button>
            );
          })}

          <button
            data-season=""
            onMouseEnter={() => {
              setFocusedArea("seasons");
              setFocusedSeasonIndex(seasons.length);
              setSelectedSeason(seasons.length);
              setFocusedEpisodeIndex(0);
            }}
            onClick={() => {
              setSelectedSeason(seasons.length);
              setFocusedSeasonIndex(seasons.length);
              setFocusedArea("seasons");
              setFocusedEpisodeIndex(0);
            }}
            className={`
              flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 lg:py-5 rounded-xl text-left transition-colors w-full flex-shrink-0
              ${isTrailersSelected ? "bg-white/15 text-white" : "text-white/50"}
              ${focusedArea === "seasons" && focusedSeasonIndex === seasons.length ? "ring-2 ring-inset ring-white/40" : ""}
            `}
          >
            <span className="font-semibold text-base sm:text-lg lg:text-xl">{t("videotekaDetail.trailersAndMore")}</span>
            <span className="text-xs sm:text-sm text-white/40">9 {t("videotekaDetail.videos")}</span>
          </button>
        </motion.nav>
      </div>

      {/* RIGHT — Episodes */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 py-6 lg:py-12 px-4 sm:px-8 lg:px-12 overflow-hidden">
        <motion.div
          key={isTrailersSelected ? "trailers-header" : `season-header-${currentSeason.season}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 mb-5 lg:mb-7 shrink-0"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {isTrailersSelected
              ? t("videotekaDetail.trailersAndMore")
              : `${t("videotekaDetail.season")} ${currentSeason.season}`}
          </h3>
          {!isTrailersSelected && details.rating && (
            <span className="px-2.5 py-1 border border-white/25 rounded text-xs sm:text-sm text-white/50 font-medium">
              {details.rating}
            </span>
          )}
        </motion.div>

        <div ref={episodeListRef} className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-2 h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {isTrailersSelected ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center h-full"
              >
                <p className="text-white/40 text-base sm:text-lg">Traileri trenutno nisu dostupni.</p>
              </motion.div>
            ) : (
              currentSeason.episodes.map((ep, index) => {
                const isFocused = focusedArea === "episodes" && focusedEpisodeIndex === index;
                return (
                  <motion.div
                    key={ep.id}
                    data-episode=""
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.04 }}
                    onMouseEnter={() => {
                      setFocusedArea("episodes");
                      setFocusedEpisodeIndex(index);
                    }}
                    className={`
                      flex gap-3 sm:gap-5 rounded-xl px-3 sm:px-4 py-3 sm:py-4 cursor-pointer transition-colors flex-shrink-0
                      ${isFocused ? "bg-white/12" : ""}
                    `}
                  >
                    <div
                      className={`
                        relative w-[120px] sm:w-[200px] lg:w-[280px] shrink-0 aspect-video rounded-lg overflow-hidden bg-white/5
                        ${isFocused ? "ring-2 ring-white/70" : ""}
                      `}
                    >
                      <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 bg-black/65 px-2 py-0.5 rounded text-[10px] sm:text-xs text-white font-medium">
                        S{currentSeason.season}: E{ep.number}
                      </span>
                      {ep.progress !== undefined && ep.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
                          <div className="h-full bg-[#F5C518]" style={{ width: `${ep.progress}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-center flex-1 min-w-0 gap-1 sm:gap-2">
                      <div className="flex items-baseline justify-between gap-2 sm:gap-3">
                        <h4 className="text-white font-bold text-sm sm:text-base lg:text-lg leading-snug truncate">
                          {ep.title}
                        </h4>
                        <span className="shrink-0 text-white/40 text-xs sm:text-sm">({ep.duration})</span>
                      </div>
                      <p className="text-white/55 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {ep.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EpisodesView;
