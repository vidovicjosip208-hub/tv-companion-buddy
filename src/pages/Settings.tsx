import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Wifi, Monitor, Languages, ChevronRight } from "lucide-react";
import StarryBackground from "@/components/StarryBackground";
import { cn } from "@/lib/utils";
import settingsGearbox from "@/assets/settings-gearbox.png";

const menuItems = [
  { icon: ShieldCheck, label: "Parental Controls" },
  { icon: Wifi, label: "Internet Settings" },
  { icon: Monitor, label: "Device Controls" },
  { icon: Languages, label: "Language" },
];

const Settings = () => {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
          console.log("Selected:", menuItems[focusedIndex].label);
          break;
      }
    },
    [focusedIndex, navigate],
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
        <h1 className="text-4xl font-light text-foreground mb-3">Podešavanja</h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
          Pritisnite opciju za upravljanje postavkama vašeg uređaja.
        </p>
        <img
          src={settingsGearbox}
          alt="Settings gearbox"
          width={320}
          height={320}
          className="mt-[-120px] w-[600px] h-[585px] object-fill"
        />
      </div>
      {/* Right side - Menu */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pr-16 pl-8">
        <div className="flex flex-col gap-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isFocused = focusedIndex === index;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setFocusedIndex(index);
                  console.log("Selected:", item.label);
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
      </div>
    </motion.div>
  );
};

export default Settings;
