import { cn } from "@/lib/utils";

export const tvCategories = [
  { id: "sve", label: "Sve" },
  { id: "sport", label: "Sport" },
  { id: "film", label: "Film" },
  { id: "deciji", label: "Dečiji" },
  { id: "vesti", label: "Vesti" },
  { id: "zabava", label: "Zabava" },
] as const;

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

const TVCategoryMenu = ({ selected, onSelect }: Props) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tvCategories.map((c) => {
        const active = c.id === selected;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
};

export default TVCategoryMenu;
