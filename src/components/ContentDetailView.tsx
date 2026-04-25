import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Layers, Captions, ThumbsUp, ThumbsDown, Plus, Film } from "lucide-react";
import { ContentDetailsData } from "@/data/videotekaContent";
import EpisodesView from "@/components/EpisodesView";
import VideotekaPlayer from "@/components/VideotekaPlayer";

interface ContentDetailViewProps {
  details: ContentDetailsData;
  thumbnail: string;
  itemId: string;
  onClose: () => void;
}

const MAIN_BUTTONS = ["resume", "playFromBeginning", "episodesAndMore", "audioSubtitles", "addToMyList"] as const;
const THUMB_BUTTONS = ["thumbsUp", "thumbsDown"] as const;
const ALL_BUTTONS = [...MAIN_BUTTONS, ...THUMB_BUTTONS] as const;
type ButtonId = (typeof ALL_BUTTONS)[number];

const VISIBLE_COUNT = 4;

const ContentDetailView = ({ details, thumbnail, itemId, onClose }: ContentDetailViewProps) => {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleSelect = useCallback((id: ButtonId) => {
    if (id === "resume" || id === "playFromBeginning") setShowPlayer(true);
    if (id === "episodesAndMore") setShowEpisodes(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showEpisodes || showPlayer) return;

      const moveMainFocus = (direction: -1 | 1) => {
        setFocusedIndex((currentFocus) => {
          const nextFocus = Math.max(0, Math.min(currentFocus + direction, ALL_BUTTONS.length - 1));

          setScrollOffset((currentOffset) => {
            const nextMainIndex = nextFocus < MAIN_BUTTONS.length ? nextFocus : -1;
            const maxOffset = Math.max(0, MAIN_BUTTONS.length - VISIBLE_COUNT);

            if (nextMainIndex === -1) return currentOffset;

            if (direction === -1 && nextMainIndex <= currentOffset && currentOffset > 0) {
              return Math.max(0, currentOffset - 1);
            }

            if (
              direction === 1 &&
              nextMainIndex >= currentOffset + VISIBLE_COUNT - 1 &&
              nextMainIndex < MAIN_BUTTONS.length - 1
            ) {
              return Math.min(maxOffset, currentOffset + 1);
            }

            return currentOffset;
          });

          return nextFocus;
        });
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveMainFocus(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveMainFocus(-1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((i) => (i === 6 ? 5 : i));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((i) => (i === 5 ? 6 : i));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(ALL_BUTTONS[focusedIndex]);
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedIndex, showEpisodes, showPlayer, handleSelect, onClose]);

  const f = (id: ButtonId) => ALL_BUTTONS[focusedIndex] === id;

  const isMovie = !details.episodes;
  const hasProgress = false;
  const showPlaySeries = !isMovie && !hasProgress;

  const getButtonContent = (id: ButtonId, isFocused: boolean) => {
    if (id === "resume") {
      const showPlay = (isMovie && !hasProgress) || showPlaySeries;
      return (
        <button
          key={id}
          onClick={() => setShowPlayer(true)}
          className={`flex items-center gap-3 rounded-lg px-10 py-4 w-fit min-w-[360px] transition-all duration-300 group ${
            isFocused ? "bg-white/20 border border-white/60 ring-2 ring-white/80" : "hover:bg-muted/20"
          }`}
        >
          <Play
            className={`w-6 h-6 transition-colors ${isFocused ? "text-foreground fill-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          />
          <span
            className={`font-medium text-base transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          >
            {showPlay ? (isMovie ? "Play" : "Play S1: Ep. 1") : isMovie ? "Resume" : "Resume S1: Ep. 1"}
          </span>
          {!showPlay && (
            <div className="ml-auto w-20 h-1 bg-muted-foreground/30 rounded-full overflow-hidden">
              <div className="w-[40%] h-full bg-[#FFBE00] rounded-full" />
            </div>
          )}
        </button>
      );
    }

    const config: Record<string, { icon: React.ReactNode; label: string; onClick?: () => void }> = {
      playFromBeginning: {
        icon: (
          <RotateCcw
            className={`w-6 h-6 transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          />
        ),
        label: "Play From Beginning",
        onClick: () => setShowPlayer(true),
      },
      episodesAndMore: {
        icon: (
          <Layers
            className={`w-6 h-6 transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          />
        ),
        label: isMovie ? "Trailers & More" : "Episodes & More",
        onClick: () => setShowEpisodes(true),
      },
      audioSubtitles: {
        icon: (
          <Captions
            className={`w-6 h-6 transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          />
        ),
        label: "Audio & Subtitles",
      },
      addToMyList: {
        icon: (
          <Plus
            className={`w-6 h-6 transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
          />
        ),
        label: "Add To My List",
      },
    };

    const btn = config[id];
    if (!btn) return null;

    return (
      <button
        key={id}
        onClick={btn.onClick}
        className={`flex items-center gap-3 px-10 py-4 min-w-[360px] rounded-lg transition-all duration-300 group ${
          isFocused ? "bg-white/20 ring-2 ring-white/80" : "hover:bg-muted/20"
        }`}
      >
        {btn.icon}
        <span
          className={`font-medium text-base transition-colors ${isFocused ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
        >
          {btn.label}
        </span>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 flex"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={thumbnail} alt={details.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-12 w-full h-full text-center pb-[280px]">
        {/* Logo - text fallback until image asset is added */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4 -mt-52 flex items-center gap-2"
        >
          <Film className="w-10 h-10 text-accent" />
          <span className="text-foreground font-bold text-3xl tracking-wide">
            Max<span className="text-accent">Videoteka</span>
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-black text-foreground tracking-tight mb-5 -mt-24"
        >
          {details.title}
        </motion.h1>

        {/* Meta info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 text-base mb-5 flex-wrap justify-center"
        >
          <span className="text-foreground">{details.year}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground">{details.genre}</span>
          {details.episodes && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-foreground">{details.episodes}</span>
            </>
          )}
          <span className="px-1.5 py-0.5 border border-muted-foreground/40 rounded text-xs text-muted-foreground font-medium">
            HD
          </span>
          <span className="px-1.5 py-0.5 border border-muted-foreground/40 rounded text-xs text-muted-foreground font-medium">
            5.1
          </span>
          <span className="px-1.5 py-0.5 border border-muted-foreground/40 rounded text-xs text-muted-foreground font-medium">
            {details.rating}
          </span>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-lg leading-relaxed mb-10 line-clamp-5 max-w-[700px]"
        >
          {details.description}
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-3"
        >
          <div className="flex flex-col items-center gap-3" style={{ minHeight: `${VISIBLE_COUNT * 60}px` }}>
            <AnimatePresence mode="popLayout">
              {MAIN_BUTTONS.map((id, idx) => {
                const visibleStart = scrollOffset;
                const visibleEnd = scrollOffset + VISIBLE_COUNT;

                if (idx < visibleStart || idx >= visibleEnd) return null;

                const hasMoreAbove = visibleStart > 0;
                const hasMoreBelow = visibleEnd < MAIN_BUTTONS.length;

                const isPeekTop = idx === visibleStart && hasMoreAbove;
                const isPeekBottom = idx === visibleEnd - 1 && hasMoreBelow;
                const isPeek = isPeekTop || isPeekBottom;

                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: isPeekTop ? -20 : 20 }}
                    animate={{
                      opacity: isPeek ? 0.35 : 1,
                      y: 0,
                      scale: isPeek ? 0.9 : 1,
                    }}
                    exit={{ opacity: 0, y: isPeekTop ? -20 : 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {getButtonContent(id, f(id))}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Thumbs */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
          <button
            className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all ${
              f("thumbsUp")
                ? "bg-white border-white"
                : "border-muted-foreground/30 hover:bg-muted/30 hover:border-muted-foreground/50"
            }`}
          >
            <ThumbsUp
              className={`w-5 h-5 transition-colors ${f("thumbsUp") ? "text-black" : "text-muted-foreground"}`}
            />
          </button>
          <button
            className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all ${
              f("thumbsDown")
                ? "bg-white border-white"
                : "border-muted-foreground/30 hover:bg-muted/30 hover:border-muted-foreground/50"
            }`}
          >
            <ThumbsDown
              className={`w-5 h-5 transition-colors ${f("thumbsDown") ? "text-black" : "text-muted-foreground"}`}
            />
          </button>
        </div>
      </div>

      {/* Episodes overlay */}
      <AnimatePresence>
        {showEpisodes && <EpisodesView itemId={itemId} details={details} onClose={() => setShowEpisodes(false)} />}
      </AnimatePresence>

      {/* Player overlay */}
      <AnimatePresence>
        {showPlayer && (
          <VideotekaPlayer
            title={details.title}
            episodeInfo={details.episodes ? `S1: E1 "${details.title}"` : undefined}
            thumbnail={thumbnail}
            onClose={() => setShowPlayer(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ContentDetailView;
