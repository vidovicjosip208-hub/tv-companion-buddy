import { Home, Search, Film } from "lucide-react";
import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface VideotekaHeaderHandle {
  focus: (index?: number) => void;
}

const navTabs = [{ label: "Home" }, { label: "Shows" }, { label: "Movies" }, { label: "My List" }];

interface VideotekaHeaderProps {
  activeTab?: string;
  onSearchOpen?: () => void;
  onFocusChange?: (focused: boolean, index?: number) => void;
  onTabChange?: (tab: string) => void;
}

const VideotekaHeader = forwardRef<VideotekaHeaderHandle, VideotekaHeaderProps>(
  ({ activeTab, onSearchOpen, onFocusChange, onTabChange }, ref) => {
    const navigate = useNavigate();
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
          const activeIndex = navTabs.findIndex((t) => t.label === activeTab);
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
        onTabChange?.(navTabs[clamped - 1].label);
      }
    };

    const handleButtonFocus = (index: number) => {
      setFocusedIndex(index);
      onFocusChange?.(true, index);

      if (index >= 1 && index <= navTabs.length) {
        onTabChange?.(navTabs[index - 1].label);
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

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (focusedIndex === null) return;

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
      };

      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [focusedIndex, searchOpen, totalButtons]);

    return (
      <header className="relative z-10 px-12 -mt-[65px] pb-0">
        <div className="flex items-center">
          {/* Logo - text fallback until image asset is added */}
          <div className="flex items-center gap-2">
            <Film className="w-8 h-8 text-accent" />
            <span className="text-foreground font-bold text-2xl tracking-wide">
              Max<span className="text-accent">Videoteka</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
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
              <Home className={cn("w-[18px] h-[18px]", focusedIndex === 0 ? "text-black" : "text-white")} />
            </button>

            {/* Nav tabs — indeksi 1, 2, 3 */}
            {navTabs.map((tab, i) => {
              const index = i + 1;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={tab.label}
                  ref={(el) => (buttonRefs.current[index] = el)}
                  onClick={() => onTabChange?.(tab.label)}
                  onFocus={() => handleButtonFocus(index)}
                  onBlur={handleButtonBlur}
                  className={cn(
                    "px-[18px] py-[7px] rounded-xl text-[15px] font-bold transition-all outline-none border",
                    isFocused
                      ? "bg-white border-white/20 text-black scale-105"
                      : activeTab === tab.label
                        ? "border-white/20 bg-muted/40 text-white"
                        : "border-white/20 bg-muted/40 text-white/60 hover:text-white",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Search — index 4 */}
          <div className="ml-auto flex items-center gap-2">
            {searchOpen && (
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
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
              <Search className={cn("w-[18px] h-[18px]", focusedIndex === 4 ? "text-black" : "text-white")} />
            </button>
          </div>
        </div>
      </header>
    );
  },
);

export default VideotekaHeader;
