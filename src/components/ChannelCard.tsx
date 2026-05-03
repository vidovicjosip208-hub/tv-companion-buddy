import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import type { EPGChannel } from "./EPGGrid";

interface Props {
  channel: EPGChannel;
  isFocused?: boolean;
  onClick?: () => void;
}

const gradients = [
  "from-rose-500/40 to-rose-900/40",
  "from-blue-500/40 to-blue-900/40",
  "from-emerald-500/40 to-emerald-900/40",
  "from-violet-500/40 to-violet-900/40",
  "from-amber-500/40 to-amber-900/40",
  "from-cyan-500/40 to-cyan-900/40",
];

const ChannelCard = ({ channel, isFocused, onClick }: Props) => {
  const live = channel.programs.find((p) => p.isLive) ?? channel.programs[0];
  const grad = gradients[channel.number % gradients.length];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex aspect-video w-40 sm:w-48 lg:w-56 shrink-0 flex-col justify-end overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br p-3 text-left transition-all",
        grad,
        isFocused
          ? "scale-105 ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
          : "hover:scale-[1.02] hover:ring-1 hover:ring-white/20",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {live?.isLive && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Live</span>
        )}
        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {channel.abbreviation}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
        <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-white text-white drop-shadow-lg" />
      </div>
      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-white">{channel.name}</div>
        <div className="truncate text-[10px] sm:text-[11px] text-white/70">{live?.title}</div>
      </div>
    </button>
  );
};

export default ChannelCard;
