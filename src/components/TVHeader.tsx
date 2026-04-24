import { useEffect, useState } from "react";
import { Volume2, Wifi, Search } from "lucide-react";

const TVHeader = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-black/40 px-8 py-4 backdrop-blur-md">
      <div>
        <h1 className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
          LovableTV
        </h1>
        <p className="mt-0.5 text-xs capitalize text-white/50">{date}</p>
      </div>
      <div className="flex items-center gap-6 text-white/70">
        <Search className="h-5 w-5 cursor-pointer transition hover:text-white" />
        <Volume2 className="h-5 w-5" />
        <Wifi className="h-5 w-5" />
        <div className="font-mono text-lg font-semibold tabular-nums text-white">{time}</div>
      </div>
    </header>
  );
};

export default TVHeader;
