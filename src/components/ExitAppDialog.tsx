import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useZoneKeys } from "@/lib/focusZone";
import { exitTvApp } from "@/components/RemoteBackKey";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ... (sve iznad return ostaje identično) ...

return (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
    {/*
        Sizing je namjerno vezan uz vw (a ne rem/px) i sve je izraženo u "em" relativno na
        taj vw font-size. Ostatak app-a (sidebar, kartice...) skalira se s viewportom, ali
        su Tailwind rem-klase (max-w-md, p-8, text-2xl...) ovisile o root font-sizeu, koji se
        na TV pregledniku ponaša drugačije nego na laptopu — pa je isti "broj" ispadao
        vizualno veći na TV-u. Vezanjem uz vw dialog dobiva identičan omjer prema ekranu na
        svakom uređaju, neovisno o razlikama u root font-sizeu/DPI-u.
      */}
    <div
      className="mx-4 w-full rounded-[0.6em] border border-white/15 bg-black p-[1.6em] shadow-2xl"
      style={{ fontSize: "clamp(12px, 1.15vw, 20px)", maxWidth: "26em" }}
    >
      <h2 className="text-[1.35em] font-bold text-white text-center">{title}</h2>
      <p className="mt-[0.6em] text-center text-[0.85em] text-white/70">{message}</p>
      <div className="mt-[1.6em] flex items-center justify-center gap-[0.8em]">
        <button
          onClick={exitApp}
          onMouseEnter={() => setSelected(0)}
          className={cn(
            "min-w-[6.5em] rounded-[0.5em] border px-[1.2em] py-[0.6em] text-[0.85em] font-bold uppercase tracking-wide outline-none transition-all",
            selected === 0
              ? "border-[#F5C518] bg-[#F5C518] text-black scale-105"
              : "border-white/20 bg-white/5 text-white/70 hover:text-white",
          )}
        >
          {exitLabel}
        </button>
        <button
          onClick={close}
          onMouseEnter={() => setSelected(1)}
          className={cn(
            "min-w-[6.5em] rounded-[0.5em] border px-[1.2em] py-[0.6em] text-[0.85em] font-bold uppercase tracking-wide outline-none transition-all",
            selected === 1
              ? "border-[#F5C518] bg-[#F5C518] text-black scale-105"
              : "border-white/20 bg-white/5 text-white/70 hover:text-white",
          )}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ExitAppDialog;
