import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Baby, Film, Trophy, PartyPopper, MonitorPlay, MapPin, Globe, Youtube } from "lucide-react";

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const tvCategories: CategoryItem[] = [
  { id: "documentary", label: "Dokumentarni", icon: <FileText className="w-6 h-6" /> },
  { id: "kids", label: "Dečiji", icon: <Baby className="w-6 h-6" /> },
  { id: "film", label: "Filmski", icon: <Film className="w-6 h-6" /> },
  { id: "sports", label: "Sportski", icon: <Trophy className="w-6 h-6" /> },
  { id: "entertainment", label: "Zabavni", icon: <PartyPopper className="w-6 h-6" /> },
  { id: "4k", label: "4K/UHD", icon: <MonitorPlay className="w-6 h-6" /> },
  { id: "local", label: "Lokalni Kanali", icon: <MapPin className="w-6 h-6" /> },
  { id: "international", label: "Međunarodni FTA", icon: <Globe className="w-6 h-6" /> },
  {
    id: "adult",
    label: "Kanali za odrasle",
    icon: (
      <span className="w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full border-2 border-white text-white">
        18+
      </span>
    ),
  },
  { id: "youtube", label: "YouTube", icon: <Youtube className="w-6 h-6" /> },
];

interface TVCategoryMenuProps {
  isVisible: boolean;
  focusedIndex: number;
  onItemClick: (index: number) => void;
}

const TVCategoryMenu = ({ isVisible, focusedIndex, onItemClick }: TVCategoryMenuProps) => {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{
        width: isVisible ? 300 : 0,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen overflow-hidden flex-shrink-0 relative z-10 bg-transparent border-r border-border/30"
    >
      <div className="h-full w-[300px] mt-40 flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
        <nav className="flex-1 flex flex-col gap-0.5 px-3 pt-5 pb-6 overflow-y-auto scrollbar-hide">
          {tvCategories.map((item, index) => {
            const isFocused = focusedIndex === index;
            return (
              <motion.button
                key={item.id}
                onClick={() => onItemClick(index)}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                  isFocused ? "text-white bg-muted" : "text-sidebar-foreground hover:bg-muted hover:text-white",
                )}
              >
                <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
};

export default TVCategoryMenu;
