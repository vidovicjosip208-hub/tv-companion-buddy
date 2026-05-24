import { cn } from "@/lib/utils";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface TVChannelCardProps {
  title: string;
  thumbnail: string;
  channelName: string;
  timeSlot: string;
  logoUrl?: string | null;
  isFocused?: boolean;
  onClick?: () => void;
  index?: number;
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

function getChannelAbbr(channel: string): string {
  const abbrs: Record<string, string> = {
    "Adria Info": "AI",
    "EX-YU Rock": "EX",
    B92: "B92",
    PTC1: "PTC1",
    "Adria Hits": "AH",
    HRT: "HRT",
    Pink: "Pink",
    PTC2: "PTC2",
    "Nova TV": "NTV",
    RTL: "RTL",
    HTV2: "HTV2",
    "Al Jazeera": "AJB",
    N1: "N1",
    "Sport Klub": "SK",
    "Arena Sport": "AS",
    Cinemax: "CMX",
    HBO: "HBO",
    FOX: "FOX",
    "National Geo": "NGO",
    Discovery: "DIS",
    "Cartoon Net": "CN",
    Nick: "NICK",
    "MTV Adria": "MTV",
    VH1: "VH1",
    Eurosport: "EUR",
    TV1: "TV1",
    OBN: "OBN",
    FTV: "FTV",
    "Hayat TV": "HAY",
    K1: "K1",
    "Pink BH": "PBH",
    RTS1: "RTS",
  };
  return abbrs[channel] || channel.slice(0, 3).toUpperCase();
}

const TVChannelCard = ({
  title,
  thumbnail,
  channelName,
  timeSlot,
  logoUrl,
  isFocused = false,
  onClick,
  index = 0,
}: TVChannelCardProps) => {
  const progress = useMemo(() => calculateProgress(timeSlot), [timeSlot]);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.6) }}
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-[box-shadow,border-color,filter] duration-200 ease-out",
        "focus:outline-none bg-card/60 backdrop-blur-sm w-full h-full border-2 flex flex-col",
        isFocused
          ? "border-white/60 shadow-[0_0_40px_10px_rgba(255,255,255,0.22)]"
          : "border-white/15 hover:brightness-110",
      )}
    >
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full">
          <div className="w-full bg-muted/70" style={{ height: "3px" }} />
          <div
            className={cn(
              "absolute bottom-0 left-0 bg-accent transition-all duration-300",
              isFocused && "shadow-[0_0_8px_2px_hsl(var(--accent)/0.6)]",
            )}
            style={{ width: `${progress}%`, height: isFocused ? "5px" : "3px" }}
          />
        </div>
      </div>
      <div className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 bg-card/70">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={channelName}
              className="w-full h-full object-contain p-1"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[10px] sm:text-[11px] font-bold text-foreground">{getChannelAbbr(channelName)}</span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-foreground truncate">{title}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{timeSlot}</p>
        </div>
      </div>
    </motion.button>
  );
};

// --- Placeholder channel data (32 entries) ---

export const PLACEHOLDER_CHANNELS = [
  {
    title: "Jutarnji program",
    channelName: "Adria Info",
    timeSlot: "07:00 - 09:30",
    thumbnail: "https://picsum.photos/seed/tv01/520/292",
  },
  {
    title: "Rock klasici večeras",
    channelName: "EX-YU Rock",
    timeSlot: "08:00 - 10:00",
    thumbnail: "https://picsum.photos/seed/tv02/520/292",
  },
  {
    title: "Vijesti u podne",
    channelName: "B92",
    timeSlot: "12:00 - 12:30",
    thumbnail: "https://picsum.photos/seed/tv03/520/292",
  },
  {
    title: "Popularna serija",
    channelName: "PTC1",
    timeSlot: "14:00 - 15:00",
    thumbnail: "https://picsum.photos/seed/tv04/520/292",
  },
  {
    title: "Top 40 hitovi",
    channelName: "Adria Hits",
    timeSlot: "10:00 - 13:00",
    thumbnail: "https://picsum.photos/seed/tv05/520/292",
  },
  {
    title: "Dnevnik",
    channelName: "HRT",
    timeSlot: "19:00 - 19:30",
    thumbnail: "https://picsum.photos/seed/tv06/520/292",
  },
  {
    title: "Reality show",
    channelName: "Pink",
    timeSlot: "20:00 - 22:00",
    thumbnail: "https://picsum.photos/seed/tv07/520/292",
  },
  {
    title: "Film večeri",
    channelName: "PTC2",
    timeSlot: "21:00 - 23:30",
    thumbnail: "https://picsum.photos/seed/tv08/520/292",
  },
  {
    title: "Dobro jutro, Hrvatska",
    channelName: "Nova TV",
    timeSlot: "06:30 - 09:00",
    thumbnail: "https://picsum.photos/seed/tv09/520/292",
  },
  {
    title: "Vijesti RTL danas",
    channelName: "RTL",
    timeSlot: "13:00 - 13:30",
    thumbnail: "https://picsum.photos/seed/tv10/520/292",
  },
  {
    title: "Kulturna baština",
    channelName: "HTV2",
    timeSlot: "15:00 - 16:00",
    thumbnail: "https://picsum.photos/seed/tv11/520/292",
  },
  {
    title: "Balkanski izvještaj",
    channelName: "Al Jazeera",
    timeSlot: "16:00 - 17:00",
    thumbnail: "https://picsum.photos/seed/tv12/520/292",
  },
  {
    title: "N1 Studio uživo",
    channelName: "N1",
    timeSlot: "11:00 - 13:00",
    thumbnail: "https://picsum.photos/seed/tv13/520/292",
  },
  {
    title: "Liga prvaka uživo",
    channelName: "Sport Klub",
    timeSlot: "20:45 - 23:00",
    thumbnail: "https://picsum.photos/seed/tv14/520/292",
  },
  {
    title: "Superliga pregled",
    channelName: "Arena Sport",
    timeSlot: "18:00 - 19:30",
    thumbnail: "https://picsum.photos/seed/tv15/520/292",
  },
  {
    title: "Akcijski film",
    channelName: "Cinemax",
    timeSlot: "22:00 - 00:00",
    thumbnail: "https://picsum.photos/seed/tv16/520/292",
  },
  {
    title: "HBO originalna serija",
    channelName: "HBO",
    timeSlot: "21:00 - 22:00",
    thumbnail: "https://picsum.photos/seed/tv17/520/292",
  },
  {
    title: "FOX crime drama",
    channelName: "FOX",
    timeSlot: "20:00 - 21:00",
    thumbnail: "https://picsum.photos/seed/tv18/520/292",
  },
  {
    title: "Divlja priroda",
    channelName: "National Geo",
    timeSlot: "17:00 - 18:00",
    thumbnail: "https://picsum.photos/seed/tv19/520/292",
  },
  {
    title: "Kako to rade?",
    channelName: "Discovery",
    timeSlot: "14:30 - 15:30",
    thumbnail: "https://picsum.photos/seed/tv20/520/292",
  },
  {
    title: "Animirani maraton",
    channelName: "Cartoon Net",
    timeSlot: "09:00 - 12:00",
    thumbnail: "https://picsum.photos/seed/tv21/520/292",
  },
  {
    title: "SpongeBob maraton",
    channelName: "Nick",
    timeSlot: "08:30 - 10:00",
    thumbnail: "https://picsum.photos/seed/tv22/520/292",
  },
  {
    title: "MTV Top 20",
    channelName: "MTV Adria",
    timeSlot: "16:00 - 18:00",
    thumbnail: "https://picsum.photos/seed/tv23/520/292",
  },
  {
    title: "VH1 klasici 80ih",
    channelName: "VH1",
    timeSlot: "15:00 - 17:00",
    thumbnail: "https://picsum.photos/seed/tv24/520/292",
  },
  {
    title: "Formula 1 trka",
    channelName: "Eurosport",
    timeSlot: "14:00 - 17:00",
    thumbnail: "https://picsum.photos/seed/tv25/520/292",
  },
  {
    title: "Jutarnje vijesti",
    channelName: "TV1",
    timeSlot: "07:30 - 09:00",
    thumbnail: "https://picsum.photos/seed/tv26/520/292",
  },
  {
    title: "OBN info",
    channelName: "OBN",
    timeSlot: "12:30 - 13:00",
    thumbnail: "https://picsum.photos/seed/tv27/520/292",
  },
  {
    title: "FTV dnevnik",
    channelName: "FTV",
    timeSlot: "19:30 - 20:00",
    thumbnail: "https://picsum.photos/seed/tv28/520/292",
  },
  {
    title: "Hayat music show",
    channelName: "Hayat TV",
    timeSlot: "20:00 - 22:00",
    thumbnail: "https://picsum.photos/seed/tv29/520/292",
  },
  {
    title: "K1 Magazin",
    channelName: "K1",
    timeSlot: "18:30 - 19:30",
    thumbnail: "https://picsum.photos/seed/tv30/520/292",
  },
  {
    title: "Pink BH film",
    channelName: "Pink BH",
    timeSlot: "21:30 - 23:30",
    thumbnail: "https://picsum.photos/seed/tv31/520/292",
  },
  {
    title: "RTS Dnevnik 2",
    channelName: "RTS1",
    timeSlot: "19:00 - 19:30",
    thumbnail: "https://picsum.photos/seed/tv32/520/292",
  },
];

// --- TV Channel Grid with keyboard + scroll navigation ---

interface TVChannelGridProps {
  channels: {
    title: string;
    thumbnail: string;
    channelName: string;
    timeSlot: string;
  }[];
  cardWidth?: number;
}

export const TVChannelGrid = ({ channels, cardWidth }: TVChannelGridProps) => {
  const [focused, setFocused] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const responsiveCardWidth =
    cardWidth ?? (typeof window !== "undefined" ? Math.min(280, window.innerWidth * 0.75) : 280);

  const moveFocus = useCallback(
    (delta: number) => {
      setFocused((prev) => Math.max(0, Math.min(channels.length - 1, prev + delta)));
    },
    [channels.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveFocus(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveFocus]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[focused] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [focused]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {channels.map((ch, i) => (
        <div key={i} className="flex-none snap-start" style={{ width: responsiveCardWidth }}>
          <TVChannelCard {...ch} index={i} isFocused={focused === i} onClick={() => setFocused(i)} />
        </div>
      ))}
    </div>
  );
};

export default TVChannelCard;
