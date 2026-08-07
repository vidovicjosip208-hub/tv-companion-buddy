import { Home, Search } from "lucide-react";
import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-videoteka-logo.png";

export interface VideotekaHeaderHandle {
  focus: (index?: number) => void;
}

const navTabs = [
  { id: "Home", labelKey: "videoteka.home" },
  { id: "Shows", labelKey: "videoteka.shows" },
  { id: "Movies", labelKey: "videoteka.movies" },
  { id: "My List", labelKey: "videoteka.myList" },
];

interface VideotekaHeaderProps {
  activeTab?: string;
  onSearchOpen?: () => void;
  onFocusChange?: (focused: boolean, index?: number) => void;
  onTabChange?: (tab: string) => void;
}

const VideotekaHeader = forwardRef<VideotekaHeaderHandle, VideotekaHeaderProps>(
  ({ activeTab, onSearchOpen, onFocusChange, onTabChange }, ref) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
      focus: (index?: number) => {
        if (index !== undefined) {
          const clamped = Math.max(0, Math.min(index, totalButtons - 1));
          setFocusedIndex(clamped);
          onFocusChange?.(true);
          setTimeout(() => buttonRefs.current[clamped]?.focus(), 0);
        } else {
          const activeIndex = navTabs.findIndex((t) => t.id === activeTab);
          const idx = activeIndex >= 0 ? activeIndex + 1 : 1;
          setFocusedIndex(idx);
          onFocusChange?.(true);
          setTimeout(() => buttonRefs.current[idx]?.focus(), 0);
        }
      },
    }));

    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const totalButtons = 1 + navTabs.length + 1;

    const focusButton = (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalButtons - 1));
      setFocusedIndex(clamped);
      onFocusChange?.(true, clamped);
      buttonRefs.current[clamped]?.focus();

      if (clamped >= 1 && clamped <= navTabs.length) {
        onTabChange?.(navTabs[clamped - 1].id);
      }
    };

    const handleButtonFocus = (index: number) => {
      setFocusedIndex(index);
      onFocusChange?.(true, index);

      if (index >= 1 && index <= navTabs.length) {
        onTabChange?.(navTabs[index - 1].id);
      }
    };

    const handleButtonBlur = () => {
      setTimeout(() => {
        if (!buttonRefs.current.some((ref) => ref === document.activeElement)) {
          setFocusedIndex(null);
          onFocusChange?.(false, undefined);
        }
      }, 100);
    };

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            e.stopPropagation();
            focusButton(focusedIndex + 1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            e.stopPropagation();
            focusButton(focusedIndex - 1);
            break;
          case "ArrowDown":
            e.preventDefault();
            e.stopPropagation();
            setFocusedIndex(null);
            onFocusChange?.(false, undefined);
            buttonRefs.current[focusedIndex]?.blur();
            break;
          case "Enter":
            e.preventDefault();
            e.stopPropagation();
            if (focusedIndex !== null) {
              buttonRefs.current[focusedIndex]?.click();
            }
            break;
          case "Escape":
          case "XF86Back":
            e.preventDefault();
            if (searchOpen) {
              setSearchOpen(false);
              setSearchQuery("");
              focusButton(totalButtons - 1);
            }
            break;
        }
      },
      [focusedIndex, searchOpen, totalButtons, focusButton, onFocusChange],
    );

    useZoneKeys("videoteka-header", handleKeyDown, focusedIndex !== null, 10);

    return (
      <header className="relative z-10 px-12 -mt-[65px] pb-0">
        <div className="flex items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Max Ovizija" className="h-[221px] w-auto" />
          </div>

          {/* Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 flex-wrap justify-center">
            {/* Home button — index 0 */}
            <button
              ref={(el) => (buttonRefs.current[0] = el)}
              onClick={() => navigate("/")}
              onFocus={() => handleButtonFocus(0)}
              onBlur={handleButtonBlur}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all outline-none border",
                focusedIndex === 0
                  ? "bg-white border-white/20 scale-105"
                  : "border-white/20 bg-muted/40 hover:opacity-90",
              )}
            >
              <Home
                className={cn(
                  "w-[18px] h-[18px]",
                  focusedIndex === 0 ? "text-black" : "text-white",
                )}
              />
            </button>

            {/* Nav tabs — indeksi 1, 2, 3, 4 */}
            {navTabs.map((tab, i) => {
              const index = i + 1;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (buttonRefs.current[index] = el)}
                  onClick={() => onTabChange?.(tab.id)}
                  onFocus={() => handleButtonFocus(index)}
                  onBlur={handleButtonBlur}
                  className={cn(
                    "px-[18px] py-[7px] rounded-xl text-[18px] font-bold transition-all outline-none border",
                    isFocused
                      ? "bg-white border-white/20 text-black scale-105"
                      : activeTab === tab.id
                        ? "border-white/20 bg-muted/40 text-white"
                        : "border-white/20 bg-muted/40 text-white/60 hover:text-white",
                  )}
                >
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </nav>

          {/* Search — index 5 */}
          <div className="ml-auto flex items-center gap-2">
            {searchOpen && (
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("videoteka.search")}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-[7px] text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 w-48 transition-all"
              />
            )}
            <button
              ref={(el) => (buttonRefs.current[4] = el)}
              onClick={() => {
                if (onSearchOpen) onSearchOpen();
                else setSearchOpen((prev) => !prev);
              }}
              onFocus={() => handleButtonFocus(4)}
              onBlur={handleButtonBlur}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all outline-none border",
                focusedIndex === 4
                  ? "bg-white border-white/20 scale-105"
                  : "border-white/20 bg-muted/40 text-white/60 hover:text-white",
              )}
            >
              <Search
                className={cn(
                  "w-[18px] h-[18px]",
                  focusedIndex === 4 ? "text-black" : "text-white",
                )}
              />
            </button>
          </div>
        </div>
      </header>
    );
  },
);

export default VideotekaHeader;
