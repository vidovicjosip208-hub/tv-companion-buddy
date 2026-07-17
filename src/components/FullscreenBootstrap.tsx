import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";

type FSDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FSEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

const isFullscreen = () => {
  const d = document as FSDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

const requestFs = () => {
  if (isFullscreen()) return;
  const el = document.documentElement as FSEl;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return;
  try {
    Promise.resolve(req()).catch(() => {});
  } catch {
    // ignore
  }
};

const FullscreenBootstrap = () => {
  const [fs, setFs] = useState<boolean>(isFullscreen());

  useEffect(() => {
    const onChange = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);

    const onFirstGesture = () => {
      requestFs();
    };
    // Any first user gesture triggers fullscreen (browsers require gesture).
    window.addEventListener("keydown", onFirstGesture, { once: true });
    window.addEventListener("pointerdown", onFirstGesture, { once: true });

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("pointerdown", onFirstGesture);
    };
  }, []);

  if (fs) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-black/95 text-white backdrop-blur-md"
      onClick={requestFs}
    >
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <Maximize2 className="h-16 w-16 text-[#F5C518]" />
        <h1 className="text-3xl font-bold">Uđi u fullscreen</h1>
        <p className="text-base text-white/70 max-w-md">
          Aplikacija je dizajnirana za prikaz preko cijelog ekrana. Klikni bilo gdje ili pritisni bilo koju tipku.
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          requestFs();
        }}
        className="flex items-center gap-2 rounded-full bg-[#F5C518] px-8 py-3 text-base font-semibold text-black shadow-lg hover:bg-[#e0b315] transition-colors"
      >
        <Maximize2 className="h-5 w-5" />
        Pokreni fullscreen
      </button>
    </div>
  );
};

export default FullscreenBootstrap;
