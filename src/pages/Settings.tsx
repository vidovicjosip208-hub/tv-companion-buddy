import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Wifi, Monitor, Languages, ChevronRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import StarryBackground from "@/components/StarryBackground";
import { cn } from "@/lib/utils";
import settingsGearbox from "@/assets/settings-gearbox.png";
import { LANGUAGE_OPTIONS } from "@/i18n";

const languages = LANGUAGE_OPTIONS;

const VISIBLE_COUNT = 4;

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const menuItems = [
    { icon: ShieldCheck, label: t("settings.parental"), key: "parental" },
    { icon: Wifi, label: t("settings.internet"), key: "internet" },
    { icon: Monitor, label: t("settings.device"), key: "device" },
    { icon: Languages, label: t("settings.language"), key: "language" },
  ];

  const initialLangIdx = Math.max(
    0,
    languages.findIndex((l) => l.code === i18n.language),
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [view, setView] = useState<"menu" | "language">("menu");
  const [langFocused, setLangFocused] = useState(initialLangIdx);
  const [selectedLang, setSelectedLang] = useState(initialLangIdx);
  const [scrollStart, setScrollStart] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const applyLang = (idx: number) => {
    setSelectedLang(idx);
    i18n.changeLanguage(languages[idx].code);
  };

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
            applyLang(langFocused);
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
          if (menuItems[focusedIndex].key === "language") {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-col lg:flex-row relative overflow-hidden"
    >
      <StarryBackground />

      {/* Left side - Welcome */}
      <div className="relative z-10 flex-1 flex flex-col justify-start pt-10 sm:pt-16 lg:pt-24 px-6 sm:px-10 lg:px-16">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-foreground mb-3">
          {view === "language" ? t("settings.languageTitle") : t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-sm">
          {view === "language" ? t("settings.languageSubtitle") : t("settings.subtitle")}
        </p>
        <img
          src={settingsGearbox}
          alt="Settings gearbox"
          width={320}
          height={320}
          className="mt-[-60px] sm:mt-[-90px] lg:mt-[-120px] w-[300px] sm:w-[450px] lg:w-[600px] h-auto object-fill hidden sm:block"
        />
      </div>

      {/* Right side */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:pr-16 lg:pl-8">
        {view === "menu" ? (
          <div className="flex flex-col gap-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setFocusedIndex(index);
                    if (item.key === "language") {
                      setView("language");
                      setLangFocused(selectedLang);
                      setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg transition-all text-left group",
                    isFocused
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 shrink-0",
                      isFocused ? "text-accent" : "text-muted-foreground",
                    )}
                  />
                  <span className={cn("flex-1 text-sm sm:text-[18px]", isFocused && "font-medium")}>{item.label}</span>
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-opacity",
                      isFocused ? "opacity-100" : "opacity-40",
                    )}
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
                    key={lang.code}
                    ref={(el) => (itemRefs.current[index] = el)}
                    onClick={() => {
                      setLangFocused(index);
                      applyLang(index);
                    }}
                    className={cn(
                      "flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg transition-all text-left h-[52px]",
                      isFocused
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    <Check
                      className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5 shrink-0",
                        isSelected ? "text-accent opacity-100" : "opacity-0",
                      )}
                    />
                    <span className={cn("flex-1 text-sm sm:text-[18px]", isFocused && "font-medium")}>
                      {lang.label}
                    </span>
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
