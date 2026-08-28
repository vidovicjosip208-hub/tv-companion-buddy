import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useZoneKeys } from "@/lib/focusZone";
import { exitTvApp } from "@/components/RemoteBackKey";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const EXIT_ALLOWED_PATHS = ["/", "/auth"];

export const requestAppExit = () => {
  window.dispatchEvent(new CustomEvent("app:request-exit"));
};

const ExitAppDialog = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isExitAllowed = EXIT_ALLOWED_PATHS.includes(location.pathname);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<0 | 1>(1); // 0 = exit, 1 = cancel (default safe)

  useEffect(() => {
    const onReq = () => {
      if (!isExitAllowed) return;
      setSelected(1);
      setOpen(true);
    };
    window.addEventListener("app:request-exit", onReq as EventListener);
    return () => window.removeEventListener("app:request-exit", onReq as EventListener);
  }, []);

  // Ako korisnik napusti / ili /auth dok je dialog otvoren, zatvori ga.
  useEffect(() => {
    if (!isExitAllowed) setOpen(false);
  }, [isExitAllowed]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const exitApp = useCallback(() => {
    setOpen(false);
    // Native TV app exit (Tizen / webOS) first, then browser fallbacks.
    exitTvApp();
    try {
      window.close();
    } catch {
      // ignore
    }
    // Fallback: navigate away if window.close is blocked
    setTimeout(() => {
      try {
        window.location.href = "about:blank";
      } catch {
        // ignore
      }
    }, 100);
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          setSelected((s) => (s === 0 ? 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (selected === 0) exitApp();
          else close();
          break;
        case "Escape":
        case "Backspace":
        case "XF86Back":
          e.preventDefault();
          e.stopPropagation();
          close();
          break;
      }
    },
    [selected, close, exitApp],
  );

  useZoneKeys("exit-dialog", onKey, open, 1000);

  if (!open || !isExitAllowed) return null;

  const title = t("exit.title", "Izlaz iz aplikacije");
  const message = t("exit.message", "Jeste li sigurni da želite izaći iz aplikacije?");
  const exitLabel = t("exit.confirm", "Izađi");
  const cancelLabel = t("exit.cancel", "Odustani");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      // Promote the dim layer to its own GPU layer so showing/hiding it is a
      // pure composite step — otherwise the translucent overlay forces a full
      // repaint of the upscaled canvas beneath it on TV hardware.
      style={{ transform: "translateZ(0)", willChange: "opacity", contain: "layout paint style" }}
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/15 bg-black p-8 shadow-2xl">

        <h2 className="text-2xl font-bold text-white text-center">{title}</h2>
        <p className="mt-3 text-center text-white/70">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={exitApp}
            onMouseEnter={() => setSelected(0)}
            className={cn(
              "min-w-[130px] rounded-xl border px-6 py-3 text-sm font-bold uppercase tracking-wide outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity]",
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
              "min-w-[130px] rounded-xl border px-6 py-3 text-sm font-bold uppercase tracking-wide outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity]",
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
};

export default ExitAppDialog;
