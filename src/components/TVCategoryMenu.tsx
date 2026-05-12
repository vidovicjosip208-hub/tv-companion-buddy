import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Baby, Film, Trophy, PartyPopper, MonitorPlay, MapPin, Globe, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const categoryDefs: { id: string; icon: React.ReactNode }[] = [
  { id: "documentary", icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "kids", icon: <Baby className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "film", icon: <Film className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "sports", icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "entertainment", icon: <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "4k", icon: <MonitorPlay className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "local", icon: <MapPin className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "international", icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> },
  {
    id: "adult",
    icon: (
      <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold text-xs rounded-full border-2 border-white text-white">
        18+
      </span>
    ),
  },
  { id: "youtube", icon: <Youtube className="w-5 h-5 sm:w-6 sm:h-6" /> },
];

export const tvCategories: CategoryItem[] = categoryDefs.map((c) => ({ ...c, label: c.id }));

interface TVCategoryMenuProps {
  isVisible: boolean;
  focusedIndex: number;
  onItemClick: (index: number) => void;
}

const TVCategoryMenu = ({ isVisible, focusedIndex, onItemClick }: TVCategoryMenuProps) => {
  const { t } = useTranslation();

  const menuWidth = 300;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{
        width: isVisible ? menuWidth : 0,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen overflow-hidden flex-shrink-0 relative z-10 bg-transparent border-r border-border/30"
    >
      <div
        className="h-full flex flex-col mt-24 sm:mt-32 lg:mt-40"
        style={{
          width: `${menuWidth}px`,
          height: "calc(100vh - 96px)",
        }}
      >
        <nav className="flex-1 flex flex-col gap-0.5 px-2 sm:px-3 pt-3 sm:pt-5 pb-4 sm:pb-6 overflow-y-auto scrollbar-hide">
          {tvCategories.map((item, index) => {
            const isFocused = focusedIndex === index;
            return (
              <motion.button
                key={item.id}
                onClick={() => onItemClick(index)}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                  isFocused ? "text-white bg-muted" : "text-sidebar-foreground hover:bg-muted hover:text-white",
                )}
              >
                <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{item.icon}</span>
                <span className="text-xs sm:text-sm whitespace-nowrap">{t(`tvCategories.${item.id}`)}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
};

export default TVCategoryMenu;
