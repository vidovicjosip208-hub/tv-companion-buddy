import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { CANVAS_WIDTH } from "@/lib/canvas";

interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  backdrop?: string;
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
    // Fixed reference canvas width, so the row looks identical on every screen.
    const vw = CANVAS_WIDTH;
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

  // Windowing (TV box ima 2GB RAM-a): kartice izvan vidljivog okvira renderiramo kao
  // prazne "spacer" kutije iste širine/visine — layout i pozicije ostaju identični,
  // ali se posteri/backdropovi za njih ne dekodiraju niti drže u memoriji.
  const WINDOW_BEFORE = 3;
  const WINDOW_AFTER = 7;
  const shouldWindow = !peek && items.length > 14;
  const windowStart = shouldWindow ? Math.max(0, focusedIndex - WINDOW_BEFORE) : 0;
  const windowEnd = shouldWindow ? Math.min(items.length - 1, focusedIndex + WINDOW_AFTER) : items.length - 1;

  return (
    <div className={cn("relative z-10 mb-2", peek && "opacity-60")}>
      <h2 className="text-accent font-bold text-xl mb-4 px-12">
        {title}
        {titleHighlight && (
          <span className="text-accent italic ml-2 font-normal text-base">{titleHighlight}</span>
        )}
      </h2>
      <div className={cn("overflow-hidden", peek && "max-h-[100px]")}>
        <div
          className={cn("flex duration-300 ease-in-out", !peek && "transition-transform", peek && "px-12")}
          style={
            peek
              ? {
                  gap: `${GAP}px`,
                  transform: "none",
                }
              : {
                  gap: `${GAP}px`,
                  transform: `translate3d(${translateX}, 0, 0)`,
                  willChange: "transform",
                }
          }
        >
          {items.map((item, index) => {
            const isFocused = isActive && index === focusedIndex;
            const isHovered = hoveredIndex === index;
            const isExpanded = uniform ? false : isFocused || isHovered;

            if (index < windowStart || index > windowEnd) {
              return (
                <div
                  key={item.id}
                  aria-hidden="true"
                  className="relative rounded-lg overflow-hidden shrink-0 bg-muted"
                  style={{
                    width: defaultW,
                    height: portrait ? undefined : cardH,
                    aspectRatio: portrait ? "2/3" : undefined,
                    flexGrow: 0,
                  }}
                />
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onItemClick?.(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "relative rounded-lg overflow-hidden shrink-0 transition-[width,height,opacity] duration-300 ease-in-out",
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
                        aspectRatio: portrait ? (isExpanded ? "16/9" : "2/3") : undefined,
                        flexGrow: 0,
                        borderBottom: "none",
                      }
                }
              >
                <div className="absolute inset-0 bg-muted" aria-hidden="true" />
                {/* Portrait poster: always mounted so the swap is instant */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="eager"
                  decoding="async"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover object-center",
                    isExpanded && item.backdrop && "opacity-0",
                  )}
                />
                {/* Landscape backdrop: preloaded, revealed on focus */}
                {item.backdrop && (
                  <img
                    src={item.backdrop}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover object-center",
                      isExpanded ? "opacity-100" : "opacity-0",
                    )}
                  />
                )}



                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {!peek && (item.progress !== undefined || (isFocused && showIndicator)) && (
                  <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-muted/50">
                    <div
                      className="h-full bg-accent rounded-r-sm"
                      style={{ width: `${item.progress ?? 35}%` }}
                    />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3
                    className={cn(
                      "font-black text-foreground tracking-tight",
                      isExpanded ? "text-xl" : "text-sm",
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

export default memo(ContentRow);
