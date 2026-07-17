import { useEffect, useRef, useState } from "react";
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

const tryLockLandscape = () => {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    // Fire-and-forget. Odbijanje NE smije prekinuti fullscreen tok.
    orientation?.lock?.("landscape").catch(() => {});
  } catch {
    // ignore
  }
};

const requestFs = async (withOrientationLock: boolean) => {
  if (isFullscreen()) {
    if (withOrientationLock) tryLockLandscape();
    return true;
  }
  const el = document.documentElement as FSEl;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return false;
  try {
    await Promise.resolve(req());
  } catch {
    return false;
  }
  if (withOrientationLock) tryLockLandscape();
  return true;
};

const FullscreenBootstrap = () => {
  const [fs, setFs] = useState<boolean>(isFullscreen());
  // Nakon što jednom uđemo pa izađemo (npr. preview iframe ne dopušta), ne pokušavamo automatski ponovno.
  const autoAttemptedRef = useRef(false);
  const hasEnteredOnceRef = useRef(false);

  useEffect(() => {
    const onChange = () => {
      const nowFs = isFullscreen();
      if (nowFs) hasEnteredOnceRef.current = true;
      setFs(nowFs);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);

    const onFirstGesture = () => {
      if (autoAttemptedRef.current) return;
      autoAttemptedRef.current = true;
      // Bez orientation locka — na nekim Android/preview iframe okruženjima odmah izbacuje iz fullscreena.
      requestFs(false);
    };
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
      onClick={() => requestFs(true)}
      aria-label="Uđi u fullscreen"
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 hover:bg-black/85"
    >
      <Maximize2 className="h-4 w-4" />
      Fullscreen
    </button>
  );
};

export default FullscreenBootstrap;
