import { Clock, CloudRain } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const TVHeader = () => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
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
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4"
    >
      {/* Logo */}
      <div className="flex items-center">
        <img src={logo} alt="Max Ovizija" className="h-16 sm:h-20 lg:h-28 w-auto -mt-2 sm:-mt-3 lg:-mt-5" />
      </div>

      {/* Center - Subscription Notice */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-accent/40 flex items-center justify-center">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
        </div>
        <span className="text-accent font-medium text-xs sm:text-sm hidden sm:block">
          {t("header.subscriptionExpiring")}
        </span>
        <span className="text-accent font-medium text-xs sm:hidden">{t("header.subscriptionShort")}</span>
      </div>

      {/* Right - Time & Weather */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="text-right">
          <div className="text-foreground font-bold text-lg sm:text-xl lg:text-2xl leading-none">
            {hours}:{minutes}
          </div>
          <div className="text-muted-foreground text-[10px] sm:text-xs">{dateStr}</div>
        </div>
        <div className="w-px h-6 sm:h-8 bg-border" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CloudRain className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <div className="text-right">
            <div className="text-foreground font-semibold text-xs sm:text-sm">12°C</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">{t("header.location")}</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default TVHeader;
