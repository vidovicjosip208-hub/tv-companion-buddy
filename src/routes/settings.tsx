import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Podešavanja — LovableTV" },
      { name: "description", content: "Podešavanja aplikacije." },
    ],
  }),
  component: Settings,
});

function Settings() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-8 text-white">
      <SettingsIcon className="h-16 w-16 text-amber-400" />
      <h1 className="text-4xl font-bold">Podešavanja</h1>
      <p className="text-white/60">Uskoro.</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazad na TV
      </Link>
    </div>
  );
}
