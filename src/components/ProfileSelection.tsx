import { useState, useEffect, useCallback } from "react";
import { User, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProfileSelectionProps {
  onBack: () => void;
}

const profiles = [{ id: "1", name: "Nomo", color: "bg-primary" }];

type FocusArea = "profiles" | "manage";

const ProfileSelection = ({ onBack }: ProfileSelectionProps) => {
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

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-screen w-screen bg-transparent relative z-10 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4"
    >
      {/* Logo area */}
      <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-accent-foreground fill-current">
              <polygon points="9.5,7.5 16,12 9.5,16.5" />
            </svg>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-foreground">MAX</span>
            <span className="text-xl sm:text-2xl font-bold text-accent">ovizija</span>
          </div>
        </div>
        <span className="text-xs font-semibold tracking-widest text-accent uppercase">Videoteka</span>
      </div>

      {/* Title */}
      <h1 className="text-lg sm:text-2xl font-light text-muted-foreground">Choose an account</h1>

      {/* Profile cards */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
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
                "w-32 h-36 sm:w-44 sm:h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 border-2 overflow-hidden",
                isFocused
                  ? "bg-primary border-primary ring-2 ring-primary/60 shadow-lg shadow-primary/30"
                  : "bg-muted/30 border-border/40 hover:border-border",
              )}
            >
              <User
                className={cn(
                  "w-10 h-10 sm:w-16 sm:h-16",
                  isFocused ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-sm sm:text-base font-medium px-4 py-1.5 rounded-md w-full text-center",
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
                "w-32 h-36 sm:w-44 sm:h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 border-2 overflow-hidden",
                isFocused
                  ? "bg-muted border-border ring-2 ring-accent/40"
                  : "bg-muted/20 border-border/30 hover:border-border/60",
              )}
            >
              <div className="flex items-center">
                <User className="w-10 h-10 sm:w-14 sm:h-14 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold text-muted-foreground -ml-1">+</span>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">+ Add account</span>
            </motion.button>
          );
        })()}
      </div>

      {/* Manage accounts button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={() => setFocusArea("manage")}
        className={cn(
          "flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full transition-all duration-200 mt-4 sm:mt-8",
          focusArea === "manage"
            ? "bg-muted border border-border ring-2 ring-accent/40"
            : "bg-muted/40 border border-border/30 hover:bg-muted/60",
        )}
      >
        <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        <span className="text-xs sm:text-sm font-medium text-foreground">Manage accounts</span>
      </motion.button>
    </motion.div>
  );
};

export default ProfileSelection;
