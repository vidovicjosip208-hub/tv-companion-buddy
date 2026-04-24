import { useEffect, useState } from "react";
import { User, Baby, UserCircle2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const profiles = [
  { id: "tata", name: "Tata", icon: User, gradient: "from-blue-500 to-blue-700" },
  { id: "mama", name: "Mama", icon: UserCircle2, gradient: "from-rose-500 to-rose-700" },
  { id: "deca", name: "Deca", icon: Baby, gradient: "from-emerald-500 to-emerald-700" },
  { id: "gost", name: "Gost", icon: UserPlus, gradient: "from-slate-500 to-slate-700" },
];

interface Props {
  onSelect?: (id: string) => void;
}

const KEY = "tv_profile";

const ProfileSelection = ({ onSelect }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v) setSelected(v);
    } catch {
      // ignore
    }
  }, []);

  const choose = (id: string) => {
    setSelected(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
    onSelect?.(id);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-10 p-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Ko gleda?</h2>
        <p className="mt-2 text-sm text-white/60">Izaberi svoj profil</p>
      </div>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {profiles.map((p) => {
          const Icon = p.icon;
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              className="group flex flex-col items-center gap-3"
            >
              <div
                className={cn(
                  "flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br text-white transition-all",
                  p.gradient,
                  active
                    ? "scale-105 ring-4 ring-amber-400 ring-offset-4 ring-offset-black"
                    : "group-hover:scale-105 group-hover:ring-2 group-hover:ring-white/30",
                )}
              >
                <Icon className="h-14 w-14" />
              </div>
              <div className="text-sm font-semibold text-white">{p.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileSelection;
