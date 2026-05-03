import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Wifi, Monitor, Languages, ChevronRight, Check } from "lucide-react";
import StarryBackground from "@/components/StarryBackground";
import { cn } from "@/lib/utils";
import settingsGearbox from "@/assets/settings-gearbox.png";

const menuItems = [
  { icon: ShieldCheck, label: "Parental Controls" },
  { icon: Wifi, label: "Internet Settings" },
  { icon: Monitor, label: "Device Controls" },
  { icon: Languages, label: "Language" },
];

const languages = [
  "Hrvatski",
  "English",
  "Deutsch",
  "Français",
  "Español",
  "Italiano",
  "Português",
  "Nederlands",
  "Polski",
  "Čeština",
  "Slovenščina",
  "Srpski",
  "Bosanski",
  "Magyar",
  "Русский",
  "Türkçe",
];

const VISIBLE_COUNT = 4;

const Settings = () => {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [view, setView] = useState<"menu" | "language">("menu");
  const [langFocused, setLangFocused] = useState(0);
  const [selectedLang, setSelectedLang] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (view === "language") {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setLangFocused((prev) => {
              const next = Math.min(prev + 1, languages.length - 1);
              setScrollStart((s) => {
                if (next >= s + VISIBLE_COUNT) return next - VISIBLE_COUNT + 1;
                return s;
              });
              return next;
            });
            break;
          case "ArrowUp":
            e.preventDefault();
            setLangFocused((prev) => {
              const next = Math.max(prev - 1, 0);
              setScrollStart((s) => (next < s ? next : s));
              return next;
            });
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            setView("menu");
            break;
          case "Enter":
            e.preventDefault();
            setSelectedLang(langFocused);
            break;
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Backspace":
        case "Escape":
          e.preventDefault();
          navigate("/");
          break;
        case "Enter":
          e.preventDefault();
          if (menuItems[focusedIndex].label === "Language") {
            setView("language");
            setLangFocused(selectedLang);
            setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
          }
          break;
      }
    },
    [focusedIndex, navigate, view, langFocused, selectedLang],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen flex relative overflow-hidden">
      <StarryBackground />
      {/* Left side - Welcome */}
      <div className="relative z-10 flex-1 flex flex-col justify-start pt-24 px-16">
        <h1 className="text-4xl font-light text-foreground mb-3">
          {view === "language" ? "Jezik" : "Podešavanja"}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
          {view === "language"
            ? "Odaberite željeni jezik sučelja."
            : "Pritisnite opciju za upravljanje postavkama vašeg uređaja."}
        </p>
        <img
          src={settingsGearbox}
          alt="Settings gearbox"
          width={320}
          height={320}
          className="mt-[-120px] w-[600px] h-[585px] object-fill"
        />
      </div>
      {/* Right side */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pr-16 pl-8">
        {view === "menu" ? (
          <div className="flex flex-col gap-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setFocusedIndex(index);
                    if (item.label === "Language") {
                      setView("language");
                      setLangFocused(selectedLang);
                      setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left group",
                    isFocused
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", isFocused ? "text-accent" : "text-muted-foreground")} />
                  <span className={cn("flex-1 text-[15px]", isFocused && "font-medium")}>{item.label}</span>
                  <ChevronRight
                    className={cn("w-4 h-4 shrink-0 transition-opacity", isFocused ? "opacity-100" : "opacity-40")}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
            <div
              className="flex flex-col gap-1 transition-transform duration-200"
              style={{ transform: `translateY(-${scrollStart * 56}px)` }}
            >
              {languages.map((lang, index) => {
                const isFocused = langFocused === index;
                const isSelected = selectedLang === index;
                return (
                  <button
                    key={lang}
                    ref={(el) => (itemRefs.current[index] = el)}
                    onClick={() => {
                      setLangFocused(index);
                      setSelectedLang(index);
                    }}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left h-[52px]",
                      isFocused
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    <Check
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isSelected ? "text-accent opacity-100" : "opacity-0",
                      )}
                    />
                    <span className={cn("flex-1 text-[15px]", isFocused && "font-medium")}>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Settings;
