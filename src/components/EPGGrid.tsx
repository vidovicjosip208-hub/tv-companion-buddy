import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

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
  category?: string;
  streamUrl?: string;
  programs: EPGProgram[];
}

interface EPGGridProps {
  channels: EPGChannel[];
  focusedIndex?: number;
  isFocusActive?: boolean;
  onChannelClick?: (index: number) => void;
}

const EPGGrid = ({ channels, focusedIndex = 0, isFocusActive, onChannelClick }: EPGGridProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[21%_40%_35%]">
      {/* Channels column */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
          Kanali
        </h3>
        <div className="space-y-1">
          {channels.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => onChannelClick?.(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                isFocusActive && i === focusedIndex
                  ? "bg-amber-500/20 ring-1 ring-amber-400"
                  : "hover:bg-white/5",
              )}
            >
              <span className="w-6 text-xs font-bold text-white/50">{ch.number}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {ch.abbreviation}
              </span>
              <span className="truncate text-sm text-white">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule column */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
          TV raspored
        </h3>
        <div className="space-y-3">
          {channels[focusedIndex]?.programs.map((p, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg p-2 transition",
                p.isLive ? "bg-red-500/10 ring-1 ring-red-500/40" : "hover:bg-white/5",
              )}
            >
              <div className="w-14 shrink-0 text-xs font-bold text-white/70">
                {p.startTime}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{p.title}</div>
                <div className="text-xs text-white/50">
                  {p.startTime} – {p.endTime}
                </div>
              </div>
              {p.isLive && (
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Live
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Details column */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
          Detalji programa
        </h3>
        {channels[focusedIndex] && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {channels[focusedIndex].abbreviation} · Kanal {channels[focusedIndex].number}
            </div>
            <div className="text-lg font-bold text-white">
              {channels[focusedIndex].programs.find((p) => p.isLive)?.title ??
                channels[focusedIndex].programs[0]?.title}
            </div>
            <p className="text-sm text-white/70">
              {channels[focusedIndex].programs.find((p) => p.isLive)?.description ??
                "Više informacija o programu uskoro."}
            </p>
            <button
              onClick={() => onChannelClick?.(focusedIndex)}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-400"
            >
              <Play className="h-4 w-4 fill-current" />
              GLEDAJ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EPGGrid;
