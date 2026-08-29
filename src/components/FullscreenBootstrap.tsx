import { useEffect, useRef } from "react";
import { debugLog } from "@/lib/debugOverlay";

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
  if (!req) {
    debugLog("[FullscreenBootstrap] requestFullscreen not available");
    return;
  }
  try {
    await Promise.resolve(req());
    debugLog("[FullscreenBootstrap] requestFullscreen OK");
  } catch (e) {
    debugLog("[FullscreenBootstrap] requestFullscreen FAILED", String(e));
  }

  try {
    const nav = navigator as KeyboardLockNav;
    debugLog("[FullscreenBootstrap] keyboard.lock available?", !!nav.keyboard?.lock);
    await nav.keyboard?.lock?.(["Escape"]);
    debugLog("[FullscreenBootstrap] keyboard.lock OK");
  } catch (e) {
    debugLog("[FullscreenBootstrap] keyboard.lock FAILED", String(e));
  }
};

const FullscreenBootstrap = () => {
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    const onGesture = () => {
      void requestFs();
    };
    const autoTimers = [0, 100, 500, 1500].map((ms) => window.setTimeout(() => void requestFs(), ms));
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("pointerdown", onGesture, { once: true });

    const onFsChange = () => {
      debugLog("[FullscreenBootstrap] fsChange", {
        isFullscreen: isFullscreen(),
        wasFullscreen: wasFullscreenRef.current,
      });

      if (isFullscreen()) {
        wasFullscreenRef.current = true;
      } else if (wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        window.dispatchEvent(new CustomEvent("app:fullscreen-back"));
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
