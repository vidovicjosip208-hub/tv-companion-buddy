import { Home, Tv, Radio, Heart, Film, Cctv, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import logo from "@/assets/max-ovizija-logo.png";

interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { id: "home", labelKey: "sidebar.home", icon: <Home className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "tv", labelKey: "sidebar.tv", icon: <Tv className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "radio", labelKey: "sidebar.radio", icon: <Radio className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "favorites", labelKey: "sidebar.favorites", icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "movies", labelKey: "sidebar.videoteka", icon: <Film className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "news", labelKey: "sidebar.cameras", icon: <Cctv className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { id: "settings", labelKey: "sidebar.settings", icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" /> },
];

const PROFILE_INDEX = sidebarItems.length;

interface TVSidebarProps {
  focusedIndex: number;
  isExpanded: boolean;
  isMini?: boolean;
  onItemClick: (index: number) => void;
  onItemHover?: (index: number) => void;
}

const TVSidebar = ({ focusedIndex, isExpanded, isMini = false, onItemClick, onItemHover }: TVSidebarProps) => {
  const { t } = useTranslation();
  const showLabels = isExpanded && !isMini;

  const sidebarWidth =
    typeof window !== "undefined"
      ? isMini
        ? Math.min(72, window.innerWidth * 0.12)
        : isExpanded
          ? Math.min(240, window.innerWidth * 0.4)
          : Math.min(80, window.innerWidth * 0.14)
      : isMini
        ? 72
        : isExpanded
          ? 240
          : 80;

  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col pt-4 sm:pt-6 lg:pt-8 pb-4 sm:pb-6 bg-transparent border-r border-sidebar-border relative z-20 flex-shrink-0"
    >
      {/* Logo at top */}
      <div className="px-2 sm:px-3 mb-4 sm:mb-6 lg:mb-8 flex justify-center">
        <img
          src={logo}
          alt="Max Ovizija"
          className={cn(
            "w-auto transition-all duration-300",
            isMini ? "h-10 sm:h-12" : "h-16 sm:h-20 lg:h-28",
          )}
        />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-0.5 sm:gap-1 px-1.5 sm:px-2">
        {sidebarItems.map((item, index) => {
          const isFocused = focusedIndex === index;
          return (
            <motion.button
              key={item.id}
              onClick={() => onItemClick(index)}
              onMouseEnter={() => {
                if (item.id !== "movies") {
                  onItemHover ? onItemHover(index) : onItemClick(index);
                }
              }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-xl transition-all duration-200 w-full",
                isMini && "justify-center px-1.5 sm:px-2",
                isFocused ? "text-white bg-muted" : "text-sidebar-foreground hover:bg-muted hover:text-white",
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-medium text-sm sm:text-base whitespace-nowrap"
                >
                  {t(item.labelKey)}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Profile Button */}
      <div className="px-1.5 sm:px-2 mt-auto pt-3 sm:pt-4 border-t border-sidebar-border mx-1.5 sm:mx-2">
        <motion.button
          onClick={() => onItemClick(PROFILE_INDEX)}
          onMouseEnter={() => onItemClick(PROFILE_INDEX)}
          whileHover={{ scale: 1.02 }}
          className={cn(
            "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-xl transition-all duration-200",
            isMini && "justify-center px-1.5 sm:px-2",
            focusedIndex === PROFILE_INDEX
              ? "text-white bg-muted"
              : "text-sidebar-foreground hover:bg-muted hover:text-white",
          )}
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          {showLabels && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-medium text-sm sm:text-base whitespace-nowrap"
            >
              {t("sidebar.profile")}
            </motion.span>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default TVSidebar;
