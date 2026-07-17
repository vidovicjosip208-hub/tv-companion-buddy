import { useEffect } from "react";

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
  useEffect(() => {
    const onFirstGesture = () => {
      requestFs();
    };
    // Any first user gesture triggers fullscreen (browsers require gesture).
    window.addEventListener("keydown", onFirstGesture, { once: true });
    window.addEventListener("pointerdown", onFirstGesture, { once: true });

    return () => {
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("pointerdown", onFirstGesture);
    };
  }, []);

  return null;
};

export default FullscreenBootstrap;
