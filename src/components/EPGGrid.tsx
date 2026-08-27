import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface EPGProgram {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  isLive?: boolean;
  description?: string;
  season?: string;
  episode?: string;
}

export interface EPGChannel {
  id: string;
  number: number;
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
  streamUrl?: string;
  category?: string;
  programs: EPGProgram[];
}

interface EPGGridProps {
  channels: EPGChannel[];
  focusedIndex: number;
  isFocusActive: boolean;
  focusedProgramIndex?: number;
  isProgramFocused?: boolean;
  onChannelClick?: (index: number) => void;
  hideSchedule?: boolean;
  isRadio?: boolean;
  showNumbers?: boolean;
}

// Ovo je TV aplikacija — scroll mišem/kotačićem ne treba postojati nigdje, samo
// navigacija strelicama. React od v17 dodaje wheel/touch listenere kao PASSIVE po
// defaultu, pa preventDefault() unutar običnog onWheel propa NEMA efekta (browser ga
// ignorira). Ovaj hook ručno veže native "wheel" listener s { passive: false } preko
// ref callbacka — zakači se točno kad React montira DOM element, neovisno o
// Framer Motion/AnimatePresence tajmingu. Vraća ref koji se stavlja na scrollable div;
// postojeći scrollIntoView() pozivi (za praćenje fokusa strelicama) ostaju netaknuti,
// jer to je programski scroll, ne scroll mišem.
function useNoWheelRef<T extends HTMLElement>() {
  const nodeRef = useRef<T | null>(null);
  const blockWheel = useCallback((e: WheelEvent) => e.preventDefault(), []);

  return useCallback(
    (el: T | null) => {
      if (nodeRef.current) {
        nodeRef.current.removeEventListener("wheel", blockWheel);
      }
      nodeRef.current = el;
      if (el) {
        el.addEventListener("wheel", blockWheel, { passive: false });
      }
    },
    [blockWheel],
  );
}

function calculateProgress(startTime: string, endTime: string): number {
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (current < start || current > end) return Math.min(100, ((Date.now() % 10000) / 10000) * 60 + 20);
  const total = end - start;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((current - start) / total) * 100));
}

const ChannelItem = memo(
  ({
    channel,
    isFocused,
    onClick,
    index,
    showNumber = false,
  }: {
    channel: EPGChannel;
    isFocused: boolean;
    onClick?: () => void;
    index: number;
    showNumber?: boolean;
  }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
      if (isFocused && ref.current) {
        ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [isFocused]);

    useEffect(() => {
      setLogoError(false);
    }, [channel.logoUrl]);

    return (
      <motion.button
        ref={ref}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.03 }}
        onClick={onClick}
        onMouseEnter={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-300 text-left",
          "border border-transparent",
          isFocused ? "bg-accent/15 border-accent/40" : "bg-transparent hover:bg-muted/20",
        )}
      >
        {showNumber && (
          <span
            className={cn(
              "flex-shrink-0 min-w-[28px] text-center text-sm font-bold tabular-nums px-1.5 py-0.5 rounded-md border transition-colors",
              isFocused ? "text-accent border-accent/60 bg-accent/10" : "text-foreground/50 border-border/40",
            )}
          >
            {channel.number}
          </span>
        )}
        <div
          className={cn(
            "w-16 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-[background-color,border-color,color,box-shadow,transform,opacity] overflow-hidden",
            "bg-transparent",
          )}
        >
          {channel.logoUrl && !logoError ? (
            <img
              src={channel.logoUrl}
              alt={channel.name}
              decoding="async"
              className="w-full h-full object-contain scale-125"
              loading="eager"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span
              className={cn(
                "text-sm font-bold tracking-wide transition-colors",
                isFocused ? "text-accent" : "text-foreground/60",
              )}
            >
              {channel.abbreviation}
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium truncate transition-colors",
            isFocused ? "text-foreground" : "text-foreground/50",
          )}
        >
          {channel.name}
        </span>
      </motion.button>
    );
  },
);
ChannelItem.displayName = "ChannelItem";

const ProgramRow = memo(({ program, index, isFocused }: { program: EPGProgram; index: number; isFocused: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useMemo(
    () => (program.isLive ? calculateProgress(program.startTime, program.endTime) : 0),
    [program.startTime, program.endTime, program.isLive],
  );

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04 }}
      className={cn(
        "flex items-center gap-4 px-5 py-3 rounded-lg transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200",
        isFocused ? "bg-accent/15" : program.isLive ? "bg-accent/8" : "bg-transparent hover:bg-muted/10",
      )}
    >
      <span
        className={cn(
          "text-sm font-mono w-14 flex-shrink-0",
          isFocused
            ? "text-accent font-semibold"
            : program.isLive
              ? "text-accent font-semibold"
              : "text-muted-foreground",
        )}
      >
        {program.startTime}
      </span>

      {program.isLive && (
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Play className="w-3 h-3 fill-current text-accent-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm block truncate",
            isFocused
              ? "text-foreground font-semibold"
              : program.isLive
                ? "text-foreground font-semibold"
                : "text-foreground/70",
          )}
        >
          {program.title}
        </span>
        {program.isLive && (
          <div className="mt-1.5 w-full max-w-[240px] h-[3px] rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className="h-full w-full origin-left rounded-full bg-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      <span className="text-xs text-muted-foreground flex-shrink-0">{program.endTime}</span>

      <span className="hidden text-xs text-muted-foreground/60 flex-shrink-0 w-14 text-right">{program.date}</span>
    </motion.div>
  );
});
ProgramRow.displayName = "ProgramRow";

const EPGGrid = ({
  channels,
  focusedIndex,
  isFocusActive,
  focusedProgramIndex = 0,
  isProgramFocused = false,
  onChannelClick,
  hideSchedule = false,
  isRadio = false,
  showNumbers = false,
}: EPGGridProps) => {
  const { t } = useTranslation();
  const selectedChannel = isFocusActive || isProgramFocused ? channels[focusedIndex] : channels[0];

  // Refovi koji blokiraju scroll mišem na sva tri scrollable stupca (lista kanala,
  // raspored programa, panel s detaljima) — postojeći scrollIntoView() u ChannelItem/
  // ProgramRow (za praćenje fokusa strelicama) ostaje netaknut jer je to programski scroll.
  const noWheelChannelListRef = useNoWheelRef<HTMLDivElement>();
  const noWheelProgramListRef = useNoWheelRef<HTMLDivElement>();
  const noWheelDetailPanelRef = useNoWheelRef<HTMLDivElement>();

  const selectedProgram = useMemo(() => {
    if (!selectedChannel) return undefined;
    if (isProgramFocused) return selectedChannel.programs[focusedProgramIndex];
    return selectedChannel.programs.find((p) => p.isLive) ?? selectedChannel.programs[0];
  }, [selectedChannel, isProgramFocused, focusedProgramIndex]);

  const programDuration = useMemo(() => {
    if (!selectedProgram) return 0;
    const [sh, sm] = selectedProgram.startTime.split(":").map(Number);
    const [eh, em] = selectedProgram.endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [selectedProgram]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-row flex-1 overflow-hidden rounded-xl gap-2"
    >
      {/* Left Column — Channel List */}
      <div
        ref={noWheelChannelListRef}
        className={cn(
          "flex flex-col overflow-y-auto scrollbar-hide pr-0 py-2 flex-shrink-0",
          hideSchedule ? "w-[35%]" : "w-[21%]",
        )}
      >
        <h2 className="text-muted-foreground font-medium text-sm px-4 pb-2">{t("epg.live")}</h2>
        {channels.map((channel, index) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isFocused={isFocusActive && focusedIndex === index}
            onClick={() => onChannelClick?.(index)}
            index={index}
            showNumber={showNumbers}
          />
        ))}
      </div>

      {/* Gold Divider */}
      <div className="w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />

      {/* Middle Column — Program Guide */}
      {!hideSchedule && (
        <>
          <div
            ref={noWheelProgramListRef}
            className="w-[44%] flex flex-col overflow-y-auto scrollbar-hide py-2 flex-shrink-0"
          >
            <h2 className="text-muted-foreground font-medium text-sm px-5 pb-2">{t("epg.schedule")}</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChannel?.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 px-5 pb-3 mb-1 border-b border-border/20">
                  <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center overflow-hidden">
                    {selectedChannel?.logoUrl ? (
                      <img
                        src={selectedChannel.logoUrl}
                        alt={selectedChannel.name}
                        className="w-full h-full object-contain scale-125"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-xs font-bold text-accent">{selectedChannel?.abbreviation}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{selectedChannel?.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t("epg.channel")} {selectedChannel?.number}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 mt-1">
                  {selectedChannel?.programs.map((program, i) => (
                    <ProgramRow
                      key={`${program.title}-${program.startTime}`}
                      program={program}
                      index={i}
                      isFocused={isProgramFocused && focusedProgramIndex === i}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Gold Divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />
        </>
      )}
      {/* Right Column — Program Details */}
      <div
        className={cn(
          "flex flex-col justify-center py-2 px-3 overflow-hidden h-full",
          hideSchedule ? "flex-1" : "flex-1",
        )}
      >
        <AnimatePresence mode="wait">
          {selectedProgram && (isProgramFocused || hideSchedule) && (
            <motion.div
              ref={noWheelDetailPanelRef}
              key={`${selectedChannel?.id}-${selectedProgram.title}-${selectedProgram.startTime}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl bg-card border border-border/40 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-hide h-[80%] w-[448px] max-w-full self-center"
            >
              <div className="flex justify-center">
                <div className="w-20 h-12 rounded-md bg-transparent flex items-center justify-center overflow-hidden">
                  {selectedChannel?.logoUrl ? (
                    <img
                      src={selectedChannel.logoUrl}
                      alt={selectedChannel.name}
                      className="w-full h-full object-contain scale-125"
                      loading="eager"
                        decoding="async"
                    />
                  ) : (
                    <span className="text-sm font-bold text-accent tracking-wider">
                      {selectedChannel?.abbreviation}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground leading-tight">{selectedProgram.title}</h3>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {selectedProgram.isLive && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                <span>{selectedProgram.isLive ? t("epg.today") : selectedProgram.date}</span>
                <span>|</span>
                <span>
                  {selectedProgram.startTime} - {selectedProgram.endTime}
                </span>
                {programDuration > 0 && (
                  <>
                    <span>|</span>
                    <span>{programDuration} min</span>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedProgram.description ??
                  t("epg.programDesc", { title: selectedProgram.title, channel: selectedChannel?.name })}
              </p>

              <button className="mt-auto self-center flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm px-5 py-2.5 rounded-md transition-colors">
                <Play className="w-4 h-4 fill-current" />
                <span className="tracking-wide">{t(isRadio ? "epg.listen" : "epg.watch")}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default memo(EPGGrid);
