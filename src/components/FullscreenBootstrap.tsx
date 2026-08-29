import { useEffect, useRef } from "react";

type FSDoc = Document & {
  webkitFullscreenElement?: Element | null;
};
type FSEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};
type KeyboardLockNav = Navigator & {
  keyboard?: {
    lock?: (keys?: string[]) => Promise<void>;
    unlock?: () => void;
  };
};

const isFullscreen = () => {
  const d = document as FSDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

const requestFs = async () => {
  if (isFullscreen()) return;
  const el = document.documentElement as FSEl;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return;
  try {
    await Promise.resolve(req());
  } catch {
    // ignore
  }
  // Lock Escape so the browser doesn't leave fullscreen on Esc —
  // we handle Escape ourselves (back navigation / exit popup).
  try {
    const nav = navigator as KeyboardLockNav;
    await nav.keyboard?.lock?.(["Escape"]);
  } catch {
    // ignore
  }
};

const FullscreenBootstrap = () => {
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    const onGesture = () => {
      void requestFs();
    };
    // Try immediately on load (works on TV browsers / kiosk & app launchers where
    // fullscreen doesn't require a user gesture). If the browser rejects it,
    // the gesture listeners below take over.
    const autoTimers = [0, 100, 500, 1500].map((ms) => window.setTimeout(() => void requestFs(), ms));
    // Only the first real interaction may complete startup fullscreen. Keeping
    // these listeners active made an arbitrary later keypress (notably Back,
    // which opens the exit dialog) re-enter fullscreen and change the TV
    // viewport while the app was already running.
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("pointerdown", onGesture, { once: true });

    const onFsChange = () => {
      if (isFullscreen()) {
        wasFullscreenRef.current = true;
      } else if (wasFullscreenRef.current) {
        // Android/Smart TV preglednici često potroše prvi Back samo na izlazak
        // iz browser fullscreena i uopće ne pošalju keydown aplikaciji. Prevedi
        // taj fullscreen izlaz u isti, deduplicirani aplikacijski Back događaj.
        wasFullscreenRef.current = false;
        window.dispatchEvent(new CustomEvent("app:fullscreen-back"));
        // Back button samo nusprodukno gasi fullscreen dok se guta prvi
        // fizički pritisak. Odmah ga vrati da host container stvarno nikad
        // ne smanji svoju veličinu (umjesto da canvas ostane "prevelik" za
        // smanjeni host, što izgleda kao sužavanje/odsijecanje prikaza).
        void requestFs();
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    return () => {
      autoTimers.forEach(window.clearTimeout);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  return null;
};

export default FullscreenBootstrap;
