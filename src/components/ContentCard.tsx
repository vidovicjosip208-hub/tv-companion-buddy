import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ChannelCardProps {
  title: string;
  channel: string;
  channelLogo?: string;
  timeSlot: string;
  thumbnail: string;
  isFocused?: boolean;
  isLive?: boolean;
  onClick?: () => void;
}

function calculateProgress(timeSlot: string): number {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const [, startH, startM, endH, endM] = match;
  const start = parseInt(startH) * 60 + parseInt(startM);
  const end = parseInt(endH) * 60 + parseInt(endM);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const effective = current >= start && current <= end ? current : start + (end - start) * 0.4;
  const total = end - start;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((effective - start) / total) * 100));
}

export function ChannelCard({
  title,
  channel,
  channelLogo,
  timeSlot,
  thumbnail,
  isFocused = false,
  onClick,
}: ChannelCardProps) {
  const progress = useMemo(() => calculateProgress(timeSlot), [timeSlot]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        "focus:outline-none bg-card/60 backdrop-blur-sm w-full h-full",
        isFocused && "scale-105 z-10",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none">
          <div className="w-full bg-muted/70" style={{ height: "3px" }} />
          <div
            className={cn(
              "absolute bottom-0 left-0 bg-primary transition-all duration-300",
              isFocused && "shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)]",
            )}
            style={{ width: `${progress}%`, height: isFocused ? "5px" : "3px" }}
          />
        </div>
      </div>
      <div className="p-3.5 flex items-center gap-3 bg-card/70">
        <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {channelLogo ? (
            <img src={channelLogo} alt={channel} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-foreground leading-tight text-center">
              {channel.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-base font-medium text-foreground truncate">{title}</h3>
          <p className="text-sm text-muted-foreground">{timeSlot}</p>
        </div>
      </div>
    </button>
  );
}
