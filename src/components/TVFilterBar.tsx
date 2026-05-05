import { cn } from "@/lib/utils";

const filters = ["Uživo", "TV Raspored"];

interface TVFilterBarProps {
  focusedFilter: number;
}

const TVFilterBar = ({ focusedFilter }: TVFilterBarProps) => {
  return (
    <div className="flex gap-3 mb-6 mt-2">
      {filters.map((filter, index) => (
        <button
          key={filter}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
            focusedFilter === index
              ? "bg-accent text-accent-foreground border-accent tv-focus-glow"
              : "bg-card/40 text-muted-foreground border-border/50 hover:bg-card/60",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default TVFilterBar;
