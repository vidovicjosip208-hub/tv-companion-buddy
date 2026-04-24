import { Link, useLocation } from "@tanstack/react-router";
import { Tv, Radio, Film, Heart, Camera, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "TV", to: "/", icon: Tv },
  { label: "Radio", to: "/radio", icon: Radio },
  { label: "Filmovi", to: "/videoteka", icon: Film },
  { label: "Omiljeni", to: "/omiljeni", icon: Heart },
  { label: "Kamere", to: "/kamere", icon: Camera },
  { label: "Profil", to: "/profili", icon: User },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const TVSidebar = () => {
  const { pathname } = useLocation();

  return (
    <aside className="flex w-20 flex-col items-center gap-2 border-r border-white/5 bg-black/40 py-6 backdrop-blur-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-black">
        TV
      </div>
      {items.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "group flex w-14 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all",
              active
                ? "bg-primary/15 text-amber-400"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
};

export default TVSidebar;
