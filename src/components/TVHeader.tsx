import { Clock, CloudRain } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import maxOvizijaLogo from "@/assets/max-ovizija-logo.png";

const TVHeader = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const dateStr = `${time.getDate().toString().padStart(2, "0")}.${(time.getMonth() + 1).toString().padStart(2, "0")}. ${["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"][time.getDay()]}`;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex items-center justify-between px-8 py-4"
    >
      {/* Logo */}
      <div className="flex items-center">
        <img
          src={maxOvizijaLogo}
          alt="MaxOvizija - Internet televizija"
          className="h-14 w-auto object-contain"
        />
      </div>

      {/* Center - Subscription Notice */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border border-accent/40 flex items-center justify-center">
          <Clock className="w-4 h-4 text-accent" />
        </div>
        <span className="text-accent font-medium text-sm">Vaša pretplata ističe za 30 dan/a</span>
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
            <div className="text-muted-foreground text-xs">Belgrade</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default TVHeader;
