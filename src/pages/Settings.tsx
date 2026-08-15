import { useState, useEffect, useCallback, useRef } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Wifi, Monitor, Languages, ListOrdered, ChevronRight, Check, Lock, Delete, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import StarryBackground from "@/components/StarryBackground";
import { cn } from "@/lib/utils";
import settingsGearbox from "@/assets/settings-gearbox.png";
import { LANGUAGE_OPTIONS } from "@/i18n";

const languages = LANGUAGE_OPTIONS;

const VISIBLE_COUNT = 4;
const PIN_LENGTH = 4;

// Raspored numeričke tipkovnice: prazno polje na mjestu gdje nema tipke
const PIN_KEYS: { label: string; type: "digit" | "back" | "empty" }[] = [
  { label: "1", type: "digit" },
  { label: "2", type: "digit" },
  { label: "3", type: "digit" },
  { label: "4", type: "digit" },
  { label: "5", type: "digit" },
  { label: "6", type: "digit" },
  { label: "7", type: "digit" },
  { label: "8", type: "digit" },
  { label: "9", type: "digit" },
  { label: "", type: "empty" },
  { label: "0", type: "digit" },
  { label: "back", type: "back" },
];
const PIN_GRID_COLS = 3;

// ─────────────────────────────────────────────────────────────
// TODO: Zamijeni ova tri placeholdera stvarnim pozivima prema Supabase
// kad povežeš bazu putem Lovable chata (tablica npr. profiles.parental_pin_hash).
// currentProfile bi trebao doći iz auth/profile konteksta aplikacije.
// ─────────────────────────────────────────────────────────────

async function hasPinSet(currentProfile: string | null): Promise<boolean> {
  // TODO: dohvati iz Supabase je li parental_pin_hash postavljen za currentProfile
  // npr: const { data } = await supabase.from('profiles').select('parental_pin_hash').eq('id', currentProfile).single();
  // return Boolean(data?.parental_pin_hash);
  return false;
}

async function checkAccess(enteredPin: string, currentProfile: string | null): Promise<boolean> {
  // Funkcija provjerava uneseni PIN s onim iz profila
  // TODO: pozovi Supabase (npr. supabase.rpc('check_parental_pin', { pin: enteredPin, profile_id: currentProfile }))
  return false;
}

async function savePin(newPin: string, currentProfile: string | null): Promise<void> {
  // TODO: spremi (hashirano) u Supabase
  // npr: await supabase.from('profiles').update({ parental_pin_hash: hash(newPin) }).eq('id', currentProfile);
}

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // TODO: zamijeni pravim ID-em trenutnog profila iz auth/profile konteksta
  const currentProfile: string | null = null;

  const menuItems = [
    { icon: ShieldCheck, label: t("settings.parental"), key: "parental" },
    { icon: Wifi, label: t("settings.internet"), key: "internet" },
    { icon: Monitor, label: t("settings.device"), key: "device" },
    { icon: Languages, label: t("settings.language"), key: "language" },
    { icon: ListOrdered, label: t("settings.changeList"), key: "changeList" },
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
  const [menuScrollStart, setMenuScrollStart] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinFocusedKey, setPinFocusedKey] = useState(0);
  const [pinSuccess, setPinSuccess] = useState(false);
  // "loading" dok provjeravamo ima li profil već postavljen PIN,
  // "verify" traži postojeći PIN prije nego dopusti promjenu,
  // "set" je korak upisa novog PIN-a
  const [pinStage, setPinStage] = useState<"loading" | "verify" | "set">("loading");
  const [pinError, setPinError] = useState("");
  const [isPinBusy, setIsPinBusy] = useState(false);

  const applyLang = (idx: number) => {
    setSelectedLang(idx);
    i18n.changeLanguage(languages[idx].code);
  };

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
    setPinValue("");
    setPinFocusedKey(0);
    setPinSuccess(false);
    setPinStage("loading");
    setPinError("");
    setIsPinBusy(false);
  }, []);

  const openParentalControls = useCallback(async () => {
    setShowPinModal(true);
    setPinValue("");
    setPinFocusedKey(0);
    setPinSuccess(false);
    setPinError("");
    setPinStage("loading");
    const alreadySet = await hasPinSet(currentProfile);
    setPinStage(alreadySet ? "verify" : "set");
  }, [currentProfile]);

  const appendPinDigit = useCallback((digit: string) => {
    setPinValue((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
  }, []);

  const removePinDigit = useCallback(() => {
    setPinValue((prev) => prev.slice(0, -1));
  }, []);

  const handlePinKeyPress = useCallback(
    (key: { label: string; type: "digit" | "back" | "empty" }) => {
      if (pinSuccess || isPinBusy || pinStage === "loading") return;
      if (key.type === "digit") {
        appendPinDigit(key.label);
      } else if (key.type === "back") {
        removePinDigit();
      }
    },
    [pinSuccess, isPinBusy, pinStage, appendPinDigit, removePinDigit],
  );

  // Kad se skupi puni PIN, provjeri (stage "verify") ili spremi novi (stage "set")
  useEffect(() => {
    if (pinValue.length !== PIN_LENGTH || pinStage === "loading" || pinSuccess) return;

    let cancelled = false;

    const process = async () => {
      setIsPinBusy(true);
      setPinError("");

      if (pinStage === "verify") {
        // Bez unosa ispravnog starog PIN-a se ne može ići dalje na postavljanje novog
        const isPinCorrect = await checkAccess(pinValue, currentProfile);
        if (cancelled) return;
        if (isPinCorrect) {
          setPinStage("set");
          setPinValue("");
        } else {
          setPinError("Pogrešan PIN, pokušajte ponovno.");
          setPinValue("");
        }
      } else if (pinStage === "set") {
        await savePin(pinValue, currentProfile);
        if (cancelled) return;
        setPinSuccess(true);
        window.setTimeout(() => {
          if (!cancelled) closePinModal();
        }, 900);
      }

      if (!cancelled) setIsPinBusy(false);
    };

    process();

    return () => {
      cancelled = true;
    };
  }, [pinValue, pinStage, pinSuccess, currentProfile, closePinModal]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // PIN popup ima prioritet nad ostalom navigacijom
      if (showPinModal) {
        if (pinSuccess || isPinBusy || pinStage === "loading") return;

        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          appendPinDigit(e.key);
          return;
        }

        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.min(prev + 1, PIN_KEYS.length - 1));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.max(prev - 1, 0));
            break;
          case "ArrowDown":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.min(prev + PIN_GRID_COLS, PIN_KEYS.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.max(prev - PIN_GRID_COLS, 0));
            break;
          case "Enter":
            e.preventDefault();
            handlePinKeyPress(PIN_KEYS[pinFocusedKey]);
            break;
          case "Backspace":
            e.preventDefault();
            removePinDigit();
            break;
          case "Escape":
            e.preventDefault();
            closePinModal();
            break;
        }
        return;
      }

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
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, menuItems.length - 1);
            setMenuScrollStart((s) => (next >= s + VISIBLE_COUNT ? next - VISIBLE_COUNT + 1 : s));
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            setMenuScrollStart((s) => (next < s ? next : s));
            return next;
          });
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
          } else if (menuItems[focusedIndex].key === "parental") {
            openParentalControls();
          }
          break;
      }
    },
    [
      focusedIndex,
      navigate,
      view,
      langFocused,
      selectedLang,
      showPinModal,
      pinSuccess,
      isPinBusy,
      pinStage,
      pinFocusedKey,
      appendPinDigit,
      removePinDigit,
      closePinModal,
      handlePinKeyPress,
      openParentalControls,
    ],
  );

  useZoneKeys("settings", handleKeyDown, true, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-row relative overflow-hidden"
    >
      <StarryBackground />

      {/* Left side - Welcome */}
      <div className="relative z-10 flex-1 pt-16 px-16">
        <h1 className="text-4xl font-light text-foreground mb-3">
          {view === "language" ? t("settings.languageTitle") : t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
          {view === "language" ? t("settings.languageSubtitle") : t("settings.subtitle")}
        </p>
        <img
          src={settingsGearbox}
          alt="Settings gearbox"
          width={320}
          height={320}
          className="absolute left-16 top-[-30px] w-[600px] h-auto object-fill"
        />
      </div>

      {/* Right side */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pr-16 pl-8">
        {view === "menu" ? (
          <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
            <div
              className="flex flex-col gap-1 transition-transform duration-200"
              style={{ transform: `translateY(-${menuScrollStart * 56}px)` }}
            >
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isFocused = focusedIndex === index;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setFocusedIndex(index);
                      setMenuScrollStart(Math.max(0, Math.min(index, menuItems.length - VISIBLE_COUNT)));
                      if (item.key === "language") {
                        setView("language");
                        setLangFocused(selectedLang);
                        setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
                      } else if (item.key === "parental") {
                        openParentalControls();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left group h-[52px]",
                      isFocused
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    <Icon className={cn("w-5 h-5 shrink-0", isFocused ? "text-accent" : "text-muted-foreground")} />
                    <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{item.label}</span>
                    <ChevronRight
                      className={cn("w-4 h-4 shrink-0 transition-opacity", isFocused ? "opacity-100" : "opacity-40")}
                    />
                  </button>
                );
              })}
            </div>
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
                      "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left h-[52px]",
                      isFocused
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    <Check className={cn("w-5 h-5 shrink-0", isSelected ? "text-accent opacity-100" : "opacity-0")} />
                    <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-sm mx-4 rounded-3xl border border-border/40 bg-[#0d0d0f] shadow-2xl shadow-black/60 px-8 py-10 flex flex-col items-center"
            >
              {/* Close button */}
              <button
                onClick={closePinModal}
                aria-label="Zatvori"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Lock icon */}
              <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center shadow-lg shadow-accent/20 mb-5">
                <Lock className="w-9 h-9 text-accent" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1.5">Roditeljska kontrola</h2>
              <p className="text-sm text-muted-foreground text-center mb-2">
                {pinSuccess
                  ? "PIN uspješno postavljen"
                  : pinStage === "loading"
                    ? "Provjera..."
                    : pinStage === "verify"
                      ? "Unesite trenutni PIN kod"
                      : "Postavite novi četveroznamenkasti PIN kod"}
              </p>

              {pinError && !pinSuccess && <p className="text-sm text-red-400 text-center mb-2">{pinError}</p>}

              {/* PIN dots */}
              <div className="flex items-center gap-4 mb-8 mt-2">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                  const filled = i < pinValue.length;
                  return (
                    <motion.div
                      key={i}
                      animate={{ scale: filled ? 1 : 0.85 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-colors duration-150",
                        pinSuccess || filled ? "bg-accent border-accent" : "bg-transparent border-border/60",
                      )}
                    />
                  );
                })}
              </div>

              {pinSuccess ? (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 border-2 border-accent">
                  <Check className="w-8 h-8 text-accent" />
                </div>
              ) : (
                <div
                  className={cn(
                    "grid grid-cols-3 gap-3",
                    (isPinBusy || pinStage === "loading") && "opacity-50 pointer-events-none",
                  )}
                >
                  {PIN_KEYS.map((key, index) => {
                    if (key.type === "empty") {
                      return <div key={index} className="w-16 h-16" />;
                    }
                    const isFocused = pinFocusedKey === index;
                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setPinFocusedKey(index);
                          handlePinKeyPress(key);
                        }}
                        className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-150 border",
                          isFocused
                            ? "bg-accent text-black border-accent ring-2 ring-accent/40"
                            : "bg-muted/30 text-foreground border-border/40 hover:border-border hover:bg-muted/50",
                        )}
                      >
                        {key.type === "back" ? <Delete className="w-5 h-5" /> : key.label}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
