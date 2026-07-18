import { useEffect, useRef } from "react";
import { requestAppExit } from "./ExitAppDialog";

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
  const hasEnteredRef = useRef(false);

  useEffect(() => {
    // Any user gesture ensures fullscreen (browsers require a gesture).
    // Keep re-entering on every gesture so the app stays fullscreen while used.
    const onGesture = () => {
      requestFs();
    };
    window.addEventListener("keydown", onGesture);
    window.addEventListener("pointerdown", onGesture);

    const onFsChange = () => {
      if (isFullscreen()) {
        hasEnteredRef.current = true;
      } else if (hasEnteredRef.current) {
        // User exited fullscreen (e.g. Esc) — offer the TV-style exit popup.
        requestAppExit();
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    return () => {
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  return null;
};

export default FullscreenBootstrap;
