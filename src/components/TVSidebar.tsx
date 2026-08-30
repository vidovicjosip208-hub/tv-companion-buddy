import { memo, useCallback } from "react";
import { Home, Tv, Radio, Heart, Film, Cctv, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CANVAS_WIDTH } from "@/lib/canvas";

interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { id: "home", labelKey: "sidebar.home", icon: <Home className="w-6 h-6" /> },
  { id: "tv", labelKey: "sidebar.tv", icon: <Tv className="w-6 h-6" /> },
  { id: "radio", labelKey: "sidebar.radio", icon: <Radio className="w-6 h-6" /> },
  { id: "favorites", labelKey: "sidebar.favorites", icon: <Heart className="w-6 h-6" /> },
  { id: "movies", labelKey: "sidebar.videoteka", icon: <Film className="w-6 h-6" /> },
  { id: "news", labelKey: "sidebar.cameras", icon: <Cctv className="w-6 h-6" /> },
  { id: "settings", labelKey: "sidebar.settings", icon: <Settings className="w-6 h-6" /> },
];

const PROFILE_INDEX = sidebarItems.length;

interface TVSidebarProps {
  focusedIndex: number;
  isExpanded: boolean;
  isMini?: boolean;
  onItemClick: (index: number) => void;
  onItemHover?: (index: number) => void;
  /**
   * Rasterećenje (TV, slabiji CPU): dok video svira u pozadini, nefokusirane
   * stavke sidebara su statični DOM elementi — bez Framer Motion animacija,
   * hover listenera i CSS tranzicija.
   */
  lightweight?: boolean;
}


// NAPOMENA (performanse): izdvojeno u vlastitu memo komponentu tako da promjena fokusa
// (focusedIndex) re-renderira SAMO onaj gumb čiji se fokus stvarno promijenio (stari i
// novi fokusirani), a ne svih 7 gumba u nizu. Handleri su useCallback da se ne stvaraju
// iznova pri svakom renderu (14+ novih closure-a po renderu prije ove izmjene).
interface SidebarNavItemProps {
  item: SidebarItem;
  index: number;
  isFocused: boolean;
  isMini: boolean;
  showLabels: boolean;
  label: string;
  onItemClick: (index: number) => void;
  onItemHover?: (index: number) => void;
  lightweight?: boolean;
}

const SidebarNavItem = memo(function SidebarNavItem({
  item,
  index,
  isFocused,
  isMini,
  showLabels,
  label,
  onItemClick,
  onItemHover,
  lightweight = false,
}: SidebarNavItemProps) {
  const handleClick = useCallback(() => {
    onItemClick(index);
  }, [onItemClick, index]);

  const handleMouseEnter = useCallback(() => {
    if (item.id !== "movies") {
      onItemHover ? onItemHover(index) : onItemClick(index);
    }
  }, [item.id, onItemHover, onItemClick, index]);

  const className = cn(
    "flex items-center gap-3 px-3 py-3 rounded-xl w-full",
    !lightweight && "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200",
    isMini && "justify-center px-2",
    isFocused
      ? "text-white bg-muted"
      : lightweight
        ? "text-sidebar-foreground"
        : "text-sidebar-foreground hover:bg-muted hover:text-white",
  );

  const inner = (
    <>
      <span className="flex-shrink-0">{item.icon}</span>
      {showLabels &&
        (lightweight && !isFocused ? (
          <span className="font-medium text-base whitespace-nowrap">{label}</span>
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-medium text-base whitespace-nowrap"
          >
            {label}
          </motion.span>
        ))}
    </>
  );

  // Statična stavka: nefokusirana dok svira pozadinski video.
  if (lightweight && !isFocused) {
    return (
      <button type="button" onClick={handleClick} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      {inner}
    </motion.button>
  );
});

SidebarNavItem.displayName = "SidebarNavItem";

const TVSidebar = memo(function TVSidebar({
  focusedIndex,
  isExpanded,
  isMini = false,
  onItemClick,
  onItemHover,
  lightweight = false,
}: TVSidebarProps) {

  const { t } = useTranslation();
  const showLabels = isExpanded && !isMini;

  // Sized against the fixed reference canvas — never the device viewport.
  const sidebarWidth = isMini
    ? Math.min(72, CANVAS_WIDTH * 0.12)
    : isExpanded
      ? Math.min(240, CANVAS_WIDTH * 0.4)
      : Math.min(80, CANVAS_WIDTH * 0.14);

  const handleProfileClick = useCallback(() => {
    onItemClick(PROFILE_INDEX);
  }, [onItemClick]);

  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col pt-8 pb-6 bg-transparent border-r border-sidebar-border relative z-20 flex-shrink-0"
    >
      {/* Logo moved to header */}

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {sidebarItems.map((item, index) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            index={index}
            isFocused={focusedIndex === index}
            isMini={isMini}
            showLabels={showLabels}
            label={t(item.labelKey)}
            onItemClick={onItemClick}
            onItemHover={onItemHover}
          />
        ))}
      </nav>

      {/* Profile Button */}
      <div className="px-2 mt-auto pt-4 mx-2">
        <motion.button
          onClick={handleProfileClick}
          onMouseEnter={handleProfileClick}
          whileHover={{ scale: 1.02 }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200",
            isMini && "justify-center px-2",
            focusedIndex === PROFILE_INDEX
              ? "text-white bg-muted"
              : "text-sidebar-foreground hover:bg-muted hover:text-white",
          )}
        >
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          {showLabels && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-medium text-base whitespace-nowrap"
            >
              {t("sidebar.profile")}
            </motion.span>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
});
TVSidebar.displayName = "TVSidebar";

export default TVSidebar;
