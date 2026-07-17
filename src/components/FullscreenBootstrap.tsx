import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";

type FSDoc = Document & {
  webkitFullscreenElement?: Element | null;
};
type FSEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const isFullscreen = () => {
  const d = document as FSDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

const isInstalledApp = () =>
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

const FullscreenBootstrap = () => {
  const [fs, setFs] = useState<boolean>(() => isFullscreen() || isInstalledApp());
  const autoAttemptedRef = useRef(false);
  const requestPendingRef = useRef(false);

  const requestFs = useCallback(async () => {
    if (isFullscreen() || isInstalledApp() || requestPendingRef.current) return;

    const el = document.documentElement as FSEl;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (!request) return;

    requestPendingRef.current = true;
    try {
      await Promise.resolve(request());
      setFs(isFullscreen());
    } catch {
      // Ugrađeni preview može zabraniti fullscreen; gumb ostaje dostupan za novi pokušaj.
    } finally {
      requestPendingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      setFs(isFullscreen() || isInstalledApp());
      requestPendingRef.current = false;
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);

    const onFirstGesture = () => {
      if (autoAttemptedRef.current) return;
      autoAttemptedRef.current = true;
      void requestFs();
    };
    if (!isInstalledApp()) {
      window.addEventListener("keydown", onFirstGesture, { once: true, capture: true });
      window.addEventListener("click", onFirstGesture, { once: true, capture: true });
    }

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("click", onFirstGesture, true);
    };
  }, [requestFs]);

  if (fs) return null;

  return (
    <button
      onClick={() => void requestFs()}
      aria-label="Uđi u fullscreen"
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 hover:bg-black/85"
    >
      <Maximize2 className="h-4 w-4" />
      Fullscreen
    </button>
  );
};

export default FullscreenBootstrap;
