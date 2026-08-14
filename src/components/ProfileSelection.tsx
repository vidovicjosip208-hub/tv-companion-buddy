import { useState, useEffect, useCallback } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { User, Settings, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-logo.png";

interface ProfileSelectionProps {
  onBack: () => void;
  onSelect?: () => void;
  onLogout?: () => void;
}

const profiles = [{ id: "1", name: "Nomo", color: "bg-primary" }];

type FocusArea = "profiles" | "manage" | "logout";

const ProfileSelection = ({ onBack, onSelect, onLogout }: ProfileSelectionProps) => {
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
          } else if (focusArea === "manage") {
            setFocusArea("logout");
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusArea === "profiles") {
            setFocusedIndex((p) => Math.max(p - 1, 0));
          } else if (focusArea === "logout") {
            setFocusArea("manage");
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
          if (focusArea === "manage" || focusArea === "logout") {
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
            (onSelect ?? onBack)();
          } else if (focusArea === "logout") {
            onLogout?.();
          }
          break;
      }
    },
    [focusArea, focusedIndex, totalItems, onBack, onSelect, onLogout],
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
        <img src={logo} alt="Max Ovizija" className="h-56 w-auto" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-light text-muted-foreground">{t("profile.choose")}</h1>

      {/* Profile cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((profile, index) => {
          const isFocused = focusArea === "profiles" && focusedIndex === index;
          return (
            <div key={profile.id} className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setFocusArea("profiles");
                  setFocusedIndex(index);
                }}
                className={cn(
                  "w-44 h-44 rounded-full flex items-center justify-center transition-all duration-200 border-2 overflow-hidden",
                  isFocused
                    ? "bg-accent border-accent ring-2 ring-accent/60 shadow-lg shadow-accent/30"
                    : "bg-muted/30 border-border/40 hover:border-border",
                )}
              >
                <User className={cn("w-20 h-20", isFocused ? "text-black" : "text-muted-foreground")} />
              </motion.button>
              <span
                className={cn(
                  "text-base font-medium text-center",
                  isFocused ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {profile.name}
              </span>
            </div>
          );
        })}

        {/* Add account */}
        {(() => {
          const addIndex = profiles.length;
          const isFocused = focusArea === "profiles" && focusedIndex === addIndex;
          return (
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setFocusArea("profiles");
                  setFocusedIndex(addIndex);
                }}
                className={cn(
                  "w-44 h-44 rounded-full flex items-center justify-center transition-all duration-200 border-2 overflow-hidden",
                  isFocused
                    ? "bg-muted border-border ring-2 ring-accent/40"
                    : "bg-muted/20 border-border/30 hover:border-border/60",
                )}
              >
                <div className="flex items-center">
                  <User className="w-20 h-20 text-muted-foreground" />
                  <span className="text-2xl font-bold text-muted-foreground -ml-1">+</span>
                </div>
              </motion.button>
              <span className="text-sm text-muted-foreground">Add account</span>
            </div>
          );
        })()}
      </div>

      {/* Manage accounts / Logout buttons */}
      <div className="flex items-center gap-4 mt-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setFocusArea("manage")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
            focusArea === "manage"
              ? "bg-muted border border-border ring-2 ring-accent/40"
              : "bg-muted/40 border border-border/30 hover:bg-muted/60",
          )}
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Manage accounts</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => {
            setFocusArea("logout");
            onLogout?.();
          }}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-200",
            focusArea === "logout"
              ? "bg-muted border border-border ring-2 ring-accent/40"
              : "bg-muted/40 border border-border/30 hover:bg-muted/60",
          )}
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Logout</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileSelection;
