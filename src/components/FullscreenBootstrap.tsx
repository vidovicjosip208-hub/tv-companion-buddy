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

const lockLandscape = async () => {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // ignore — desktop and iOS Safari don't support this
  }
};

const requestFs = async () => {
  if (!isFullscreen()) {
    const el = document.documentElement as FSEl;
    const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (req) {
      try {
        await Promise.resolve(req());
      } catch {
        // ignore
      }
    }
  }
  await lockLandscape();
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
    <button
      onClick={requestFs}
      aria-label="Uđi u fullscreen"
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 hover:bg-black/85"
    >
      <Maximize2 className="h-4 w-4" />
      Fullscreen
    </button>
  );
};

export default FullscreenBootstrap;
