import { Search } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
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
          const idx = activeIndex >= 0 ? activeIndex : 0;
          setFocusedIndex(idx);
          onFocusChange?.(true);
          setTimeout(() => buttonRefs.current[idx]?.focus(), 0);
        }
      },
    }));

    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const totalButtons = navTabs.length + 1;

    const activateTab = (tabId: string) => {
      if (tabId === "My List") navigate("/videoteka/my-list");
      else onTabChange?.(tabId);
    };

    const focusButton = (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalButtons - 1));
      setFocusedIndex(clamped);
      onFocusChange?.(true, clamped);
      buttonRefs.current[clamped]?.focus();

      if (clamped < navTabs.length && navTabs[clamped].id !== "My List") {
        onTabChange?.(navTabs[clamped].id);
      }
    };

    const handleButtonFocus = (index: number) => {
      setFocusedIndex(index);
      onFocusChange?.(true, index);

      if (index < navTabs.length && navTabs[index].id !== "My List") {
        onTabChange?.(navTabs[index].id);
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
            e.stopPropagation();
            navigate("/");
            break;
        }
      },
      [focusedIndex, totalButtons, focusButton, onFocusChange, navigate],

    );


    useZoneKeys("videoteka-header", handleKeyDown, focusedIndex !== null, 10);

    return (
      <header className="relative z-10 px-12 -mt-[65px] pb-0">
        <div className="flex items-center">
          {/* Logo — slot zadržava izvornu visinu (221px) da layout headera,
              navigacije i sadržaja ispod ostanu nepromijenjeni; slika je manja
              i vertikalno centrirana u istom centru kao prije. */}
          <div className="flex items-center gap-3 h-[221px]">
            <img src={logo} alt="Max Ovizija" className="h-[120px] w-auto" />
          </div>

          {/* Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 flex-wrap justify-center">
            {/* Nav tabs — indeksi 0, 1, 2, 3 */}
            {navTabs.map((tab, index) => {
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (buttonRefs.current[index] = el)}
                  onClick={() => activateTab(tab.id)}
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

          {/* Search — index 4 */}
          <div className="ml-auto flex items-center gap-2">
            <button
              ref={(el) => (buttonRefs.current[4] = el)}
              onClick={() => {
                if (onSearchOpen) onSearchOpen();
                else navigate("/videoteka/search");
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
