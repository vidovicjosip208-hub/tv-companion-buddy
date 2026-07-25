import { useState } from "react";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  progress?: number;
}

interface ContentRowProps {
  title: string;
  titleHighlight?: string;
  items: ContentItem[];
  focusedIndex: number;
  isActive?: boolean;
  peek?: boolean;
  portrait?: boolean;
  showIndicator?: boolean;
  uniform?: boolean;
  onItemClick?: (index: number) => void;
}

const GAP = 16;

const ContentRow = ({
  title,
  titleHighlight,
  items,
  focusedIndex,
  isActive,
  peek,
  portrait,
  showIndicator,
  uniform,
  onItemClick,
}: ContentRowProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getResponsiveValues = () => {
    if (typeof window === "undefined") {
      return {
        defaultW: portrait ? 140 : 280,
        expandedW: portrait ? 300 : 650,
        cardH: 350,
        leftPad: 48,
      };
    }
    const vw = window.innerWidth;
    return {
      defaultW: portrait ? Math.min(140, vw * 0.28) : Math.min(280, vw * 0.4),
      expandedW: portrait ? Math.min(300, vw * 0.55) : Math.min(650, vw * 0.75),
      cardH: Math.min(350, vw * 0.45),
      leftPad: Math.min(48, vw * 0.05),
    };
  };

  const { defaultW, expandedW, cardH, leftPad } = getResponsiveValues();

  const translateX = uniform
    ? `${leftPad}px`
    : focusedIndex === 0
      ? `${leftPad}px`
      : `calc(${leftPad}px - ${focusedIndex} * ${defaultW + GAP}px)`;

  return (
    <div className={cn("relative z-10 mb-2", peek && "opacity-60")}>
      <h2 className="text-accent font-bold text-base sm:text-xl mb-4 px-4 sm:px-12">
        {title}
        {titleHighlight && (
          <span className="text-accent italic ml-2 font-normal text-sm sm:text-base">{titleHighlight}</span>
        )}
      </h2>
      <div className={cn("overflow-hidden", peek && "max-h-[100px]")}>
        <div
          className={cn("flex transition-transform duration-500 ease-out", peek && "px-4 sm:px-12")}
          style={
            peek
              ? {
                  gap: `${GAP}px`,
                  transform: "none",
                }
              : {
                  gap: `${GAP}px`,
                  transform: `translateX(${translateX})`,
                }
          }
        >
          {items.map((item, index) => {
            const isFocused = isActive && index === focusedIndex;
            const isHovered = hoveredIndex === index;
            const isExpanded = uniform ? false : isFocused || isHovered;

            return (
              <button
                key={item.id}
                onClick={() => onItemClick?.(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "relative rounded-lg overflow-hidden shrink-0 transition-all duration-500 ease-in-out",
                  !peek && "cursor-pointer",
                  peek && "flex-1",
                )}
                style={
                  peek
                    ? {
                        aspectRatio: portrait ? "2/3" : undefined,
                        minWidth: 0,
                      }
                    : {
                        width: isExpanded ? expandedW : defaultW,
                        height: portrait ? undefined : cardH,
                        aspectRatio: portrait ? "2/3" : undefined,
                        flexGrow: 0,
                        borderBottom: "none",
                      }
                }
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className={cn(
                    "w-full h-full transition-all duration-500",
                    isExpanded ? "object-contain bg-black" : "object-cover",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                {!peek && (item.progress !== undefined || (isFocused && showIndicator)) && (
                  <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-muted/50">
                    <div
                      className="h-full bg-accent rounded-r-sm transition-all duration-300"
                      style={{ width: `${item.progress ?? 35}%` }}
                    />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3
                    className={cn(
                      "font-black text-foreground tracking-tight drop-shadow-lg transition-all duration-500",
                      isExpanded ? "text-base sm:text-xl" : "text-xs sm:text-sm",
                    )}
                  >
                    {item.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContentRow;
