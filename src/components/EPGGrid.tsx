import { useMemo, useRef, useEffect } from "react";
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

const ChannelItem = ({
  channel,
  isFocused,
  onClick,
  index,
}: {
  channel: EPGChannel;
  isFocused: boolean;
  onClick?: () => void;
  index: number;
}) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={onClick}
      onMouseEnter={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 text-left",
        "border border-transparent",
        isFocused
          ? "bg-accent/15 border-accent/40 shadow-[0_0_16px_3px_hsl(var(--accent)/0.15)]"
          : "bg-transparent hover:bg-muted/20",
      )}
    >
      <div
        className={cn(
          "w-12 sm:w-16 h-9 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all overflow-hidden",
          isFocused ? "bg-accent/20" : "bg-muted/40",
        )}
      >
        {channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt={channel.name}
            className="w-full h-full object-contain p-1"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span
            className={cn(
              "text-xs sm:text-sm font-bold tracking-wide transition-colors",
              isFocused ? "text-accent" : "text-foreground/60",
            )}
          >
            {channel.abbreviation}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-xs sm:text-sm font-medium truncate transition-colors",
          isFocused ? "text-foreground" : "text-foreground/50",
        )}
      >
        {channel.name}
      </span>
    </motion.button>
  );
};

const ProgramRow = ({ program, index, isFocused }: { program: EPGProgram; index: number; isFocused: boolean }) => {
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
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        "flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 rounded-lg transition-all duration-200",
        isFocused
          ? "bg-accent/15 shadow-[0_0_12px_2px_hsl(var(--accent)/0.1)]"
          : program.isLive
            ? "bg-accent/8"
            : "bg-transparent hover:bg-muted/10",
      )}
    >
      <span
        className={cn(
          "text-xs sm:text-sm font-mono w-12 sm:w-14 flex-shrink-0",
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
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current text-accent-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-xs sm:text-sm block truncate",
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
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ boxShadow: "0 0 8px 2px hsl(var(--accent) / 0.4)" }}
            />
          </div>
        )}
      </div>

      <span className="text-xs text-muted-foreground flex-shrink-0">{program.endTime}</span>

      <span className="hidden sm:block text-xs text-muted-foreground/60 flex-shrink-0 w-14 text-right">
        {program.date}
      </span>
    </motion.div>
  );
};

const EPGGrid = ({
  channels,
  focusedIndex,
  isFocusActive,
  focusedProgramIndex = 0,
  isProgramFocused = false,
  onChannelClick,
  hideSchedule = false,
}: EPGGridProps) => {
  const { t } = useTranslation();
  const selectedChannel = isFocusActive || isProgramFocused ? channels[focusedIndex] : channels[0];

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
      className="flex flex-col lg:flex-row flex-1 overflow-hidden rounded-xl gap-2"
    >
      {/* Left Column — Channel List */}
      <div className={cn("w-full flex flex-col overflow-y-auto scrollbar-hide pr-0 py-2", hideSchedule ? "lg:w-[35%]" : "lg:w-[21%]") }>
        <h2 className="text-muted-foreground font-medium text-sm px-3 sm:px-4 pb-2">{t("epg.live")}</h2>
        {channels.map((channel, index) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isFocused={isFocusActive && focusedIndex === index}
            onClick={() => onChannelClick?.(index)}
            index={index}
          />
        ))}
      </div>

      {/* Gold Divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />

      {/* Middle Column — Program Guide */}
      {!hideSchedule && (
        <>
          <div className="w-full lg:w-[44%] flex flex-col overflow-y-auto scrollbar-hide py-2">
            <h2 className="text-muted-foreground font-medium text-sm px-3 sm:px-5 pb-2">{t("epg.schedule")}</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChannel?.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 px-3 sm:px-5 pb-3 mb-1 border-b border-border/20">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/15 flex items-center justify-center overflow-hidden">
                    {selectedChannel?.logoUrl ? (
                      <img
                        src={selectedChannel.logoUrl}
                        alt={selectedChannel.name}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs font-bold text-accent">{selectedChannel?.abbreviation}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">{selectedChannel?.name}</h3>
                    <span className="text-xs text-muted-foreground">{t("epg.channel")} {selectedChannel?.number}</span>
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
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent flex-shrink-0" />
        </>
      )}
      {/* Right Column — Program Details */}
      <div className={cn("w-full flex flex-col justify-center py-2 px-3 overflow-hidden lg:h-full", hideSchedule ? "lg:flex-1 lg:items-center" : "lg:w-[31%]") }>
        <AnimatePresence mode="wait">
          {selectedProgram && isProgramFocused && (
            <motion.div
              key={`${selectedChannel?.id}-${selectedProgram.title}-${selectedProgram.startTime}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 shadow-[0_8px_40px_-8px_hsl(var(--accent)/0.25)] p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto scrollbar-hide lg:h-[80%]"
            >
              <div className="flex justify-center">
                <div className="w-16 h-10 sm:w-20 sm:h-12 rounded-md bg-accent/20 flex items-center justify-center overflow-hidden">
                  {selectedChannel?.logoUrl ? (
                    <img
                      src={selectedChannel.logoUrl}
                      alt={selectedChannel.name}
                      className="w-full h-full object-contain p-1.5"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-accent tracking-wider">
                      {selectedChannel?.abbreviation}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{selectedProgram.title}</h3>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
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

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {selectedProgram.description ??
                  t("epg.programDesc", { title: selectedProgram.title, channel: selectedChannel?.name })}
              </p>

              <button className="mt-auto self-center flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-md transition-colors">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                <span className="tracking-wide">{t("epg.watch")}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default EPGGrid;
