import { Clock, CloudRain } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import logo from "@/assets/max-ovizija-logo.png";


const TVHeader = () => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let timer: number;
    const updateAtNextMinute = () => {
      const delay = 60_000 - (Date.now() % 60_000) + 50;
      timer = window.setTimeout(() => {
        setTime(new Date());
        updateAtNextMinute();
      }, delay);
    };
    updateAtNextMinute();
    return () => window.clearTimeout(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dateStr = `${time.getDate().toString().padStart(2, "0")}.${(time.getMonth() + 1)
    .toString()
    .padStart(2, "0")}. ${t(`weekdays.${weekdayKeys[time.getDay()]}`)}`;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex items-center justify-between gap-4 px-8 pt-2 pb-0 border-b border-border/30 relative z-30"
    >
      {/* Left - Logo */}
      <img src={logo} alt="Max Ovizija" className="h-32 w-auto flex-shrink-0 -mt-5" />

      {/* Center - Subscription Notice */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border border-accent/40 flex items-center justify-center">
          <Clock className="w-4 h-4 text-accent" />
        </div>
        <span className="text-accent font-medium text-sm hidden">
          {t("header.subscriptionExpiring")}
        </span>
        <span className="text-accent font-medium text-xs">{t("header.subscriptionShort")}</span>
      </div>


      {/* Right - Time & Weather */}
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-foreground font-bold text-2xl leading-none">
            {hours}:{minutes}
          </div>
          <div className="text-muted-foreground text-xs">{dateStr}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-muted-foreground" />
          <div className="text-right">
            <div className="text-foreground font-semibold text-sm">12°C</div>
            <div className="text-muted-foreground text-xs">{t("header.location")}</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default TVHeader;
