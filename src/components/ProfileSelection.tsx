import { useState, useEffect, useCallback } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { User, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-logo.png";

interface ProfileSelectionProps {
  onBack: () => void;
}

const profiles = [{ id: "1", name: "Nomo", color: "bg-primary" }];

type FocusArea = "profiles" | "manage";

const ProfileSelection = ({ onBack }: ProfileSelectionProps) => {
  const { t } = useTranslation();
  const [focusArea, setFocusArea] = useState<FocusArea>("profiles");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const totalItems = profiles.length + 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusedIndex((p) => Math.min(p + 1, totalItems - 1));
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusedIndex((p) => Math.max(p - 1, 0));
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusArea("manage");
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusArea === "manage") {
            setFocusArea("profiles");
          }
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onBack();
          break;
        case "Enter":
          e.preventDefault();
          if (focusArea === "profiles" && focusedIndex < profiles.length) {
            onBack();
          }
          break;
      }
    },
    [focusArea, focusedIndex, totalItems, onBack],
  );

  useZoneKeys("profile-selection", handleKeyDown, true, 20);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-screen w-screen bg-transparent relative z-10 flex flex-col items-center justify-center gap-8 px-4"
    >
      {/* Logo area */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <img src={logo} alt="Max Ovizija" className="h-28 w-auto" />
        <span className="text-xs font-semibold tracking-widest text-accent uppercase">{t("profile.brand")}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-light text-muted-foreground">{t("profile.choose")}</h1>

      {/* Profile cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((profile, index) => {
          const isFocused = focusArea === "profiles" && focusedIndex === index;
          return (
            <motion.button
              key={profile.id}
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                setFocusArea("profiles");
                setFocusedIndex(index);
              }}
              className={cn(
                "w-44 h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 border-2 overflow-hidden",
                isFocused
                  ? "bg-primary border-primary ring-2 ring-primary/60 shadow-lg shadow-primary/30"
                  : "bg-muted/30 border-border/40 hover:border-border",
              )}
            >
              <User
                className={cn(
                  "w-16 h-16",
                  isFocused ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-base font-medium px-4 py-1.5 rounded-md w-full text-center",
                  isFocused ? "bg-primary-foreground/10 text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {profile.name}
              </span>
            </motion.button>
          );
        })}

        {/* Add account */}
        {(() => {
          const addIndex = profiles.length;
          const isFocused = focusArea === "profiles" && focusedIndex === addIndex;
          return (
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                setFocusArea("profiles");
                setFocusedIndex(addIndex);
              }}
              className={cn(
                "w-44 h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 border-2 overflow-hidden",
                isFocused
                  ? "bg-muted border-border ring-2 ring-accent/40"
                  : "bg-muted/20 border-border/30 hover:border-border/60",
              )}
            >
              <div className="flex items-center">
                <User className="w-14 h-14 text-muted-foreground" />
                <span className="text-2xl font-bold text-muted-foreground -ml-1">+</span>
              </div>
              <span className="text-sm text-muted-foreground">+ Add account</span>
            </motion.button>
          );
        })()}
      </div>

      {/* Manage accounts button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={() => setFocusArea("manage")}
        className={cn(
          "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200 mt-8",
          focusArea === "manage"
            ? "bg-muted border border-border ring-2 ring-accent/40"
            : "bg-muted/40 border border-border/30 hover:bg-muted/60",
        )}
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Manage accounts</span>
      </motion.button>
    </motion.div>
  );
};

export default ProfileSelection;
