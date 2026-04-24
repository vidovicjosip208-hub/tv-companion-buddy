import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useMemo, useRef, useEffect } from "react";

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
  if (current < start || current > end) return 0;
  const total = end - start;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((current - start) / total) * 100));
}

const ChannelItem = ({
  channel,
  isFocused,
  onClick,
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
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all",
        isFocused
          ? "bg-primary/15 ring-1 ring-primary/40"
          : "hover:bg-white/5",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white">
        {channel.abbreviation}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{channel.name}</div>
        <div className="text-[11px] text-white/50">Kanal {channel.number}</div>
      </div>
    </button>
  );
};

const ProgramRow = ({
  program,
  isFocused,
}: {
  program: EPGProgram;
  index: number;
  isFocused: boolean;
}) => {
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
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-[60px_1fr_60px] items-center gap-3 rounded-lg px-3 py-2 transition-all",
        isFocused ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-white/5",
      )}
    >
      <div className="text-xs font-mono text-white/60">{program.startTime}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-white">{program.title}</div>
          {program.isLive && (
            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              Live
            </span>
          )}
        </div>
        {program.isLive && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="text-right text-xs font-mono text-white/40">{program.endTime}</div>
    </div>
  );
};

const EPGGrid = ({
  channels,
  focusedIndex,
  isFocusActive,
  focusedProgramIndex = 0,
  isProgramFocused = false,
  onChannelClick,
}: EPGGridProps) => {
  const selectedChannel =
    isFocusActive || isProgramFocused ? channels[focusedIndex] : channels[0];

  const selectedProgram = useMemo(() => {
    if (!selectedChannel) return undefined;
    if (isProgramFocused) return selectedChannel.programs[focusedProgramIndex];
    return selectedChannel.programs.find((p) => p.isLive) ?? selectedChannel.programs[0];
  }, [selectedChannel, isProgramFocused, focusedProgramIndex]);

  const programDuration = useMemo(() => {
    if (!selectedProgram) return 0;
    const [sh, sm] = selectedProgram.startTime.split(":").map(Number);
    const [eh, em] = selectedProgram.endTime.split(":").map(Number);
    let dur = eh * 60 + em - (sh * 60 + sm);
    if (dur < 0) dur += 24 * 60;
    return dur;
  }, [selectedProgram]);

  return (
    <div className="grid grid-cols-[21%_1px_44%_1px_31%] gap-0 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 backdrop-blur-sm">
      {/* Left — Channels */}
      <div className="flex flex-col gap-1 overflow-y-auto pr-3">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400/80">
          Uživo
        </div>
        {channels.map((channel, index) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isFocused={isFocusActive && index === focusedIndex}
            onClick={() => onChannelClick?.(index)}
            index={index}
          />
        ))}
      </div>

      <div className="mx-2 w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />

      {/* Middle — Schedule */}
      <div className="flex flex-col gap-2 overflow-hidden px-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">
          TV Raspored
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 text-xs font-bold text-white">
            {selectedChannel?.abbreviation}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {selectedChannel?.name}
            </div>
            <div className="text-[11px] text-white/50">Kanal {selectedChannel?.number}</div>
          </div>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {selectedChannel?.programs.map((program, i) => (
            <ProgramRow
              key={`${program.startTime}-${i}`}
              program={program}
              index={i}
              isFocused={isProgramFocused && i === focusedProgramIndex}
            />
          ))}
        </div>
      </div>

      <div className="mx-2 w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />

      {/* Right — Details */}
      <div className="overflow-hidden px-3">
        <AnimatePresence mode="wait">
          {selectedProgram && (
            <motion.div
              key={`${selectedChannel?.id}-${selectedProgram.title}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex h-full flex-col gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-bold text-white">
                {selectedChannel?.abbreviation}
              </div>
              <h3 className="text-lg font-bold leading-tight text-white">
                {selectedProgram.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                {selectedProgram.isLive && (
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Live
                  </span>
                )}
                <span>{selectedProgram.isLive ? "Danas" : selectedProgram.date}</span>
                <span className="text-white/30">|</span>
                <span>
                  {selectedProgram.startTime} - {selectedProgram.endTime}
                </span>
                {programDuration > 0 && (
                  <>
                    <span className="text-white/30">|</span>
                    <span>{programDuration} min</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed text-white/60">
                {selectedProgram.description ??
                  `Pogledajte ${selectedProgram.title} na kanalu ${selectedChannel?.name}.`}
              </p>
              <button
                onClick={() => onChannelClick?.(focusedIndex)}
                className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-black transition hover:from-amber-400 hover:to-amber-500"
              >
                <Play className="h-4 w-4 fill-current" />
                GLEDAJ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EPGGrid;
