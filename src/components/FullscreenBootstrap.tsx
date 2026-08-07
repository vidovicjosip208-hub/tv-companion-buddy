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

    window.addEventListener("keydown", onGesture);
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("pointermove", onGesture, { once: true });
    window.addEventListener("focus", onGesture);
    document.addEventListener("visibilitychange", onGesture);

    const onFsChange = () => {
      if (isFullscreen()) {
        wasFullscreenRef.current = true;
      } else if (wasFullscreenRef.current) {
        // If we somehow leave fullscreen (e.g. OS-level gesture), try to re-enter
        // on the next user gesture. Do NOT auto-open the exit popup here —
        // the exit popup is driven exclusively by the app's back-navigation logic.
        // requestFs will run again from the gesture listeners above.
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    return () => {
      autoTimers.forEach(window.clearTimeout);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("pointermove", onGesture);
      window.removeEventListener("focus", onGesture);
      document.removeEventListener("visibilitychange", onGesture);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  return null;
};

export default FullscreenBootstrap;
