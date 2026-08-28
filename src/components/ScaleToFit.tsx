import { useEffect, useRef, useState, type ReactNode } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

const isFullscreen = () => {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
};

const FULLSCREEN_SETTLE_MS = 1500;
const FULLSCREEN_MAX_WAIT_MS = 2500;

interface ScaleToFitProps {
  children: ReactNode;
}

/**
 * Stretches the fixed reference canvas (CANVAS_WIDTH x CANVAS_HEIGHT) onto the
 * real available area so the composition is always edge to edge — identical on
 * a laptop, a phone or a TV.
 *
 * The available area is measured from the wrapper element itself (via
 * ResizeObserver) instead of window.innerWidth/innerHeight, because TV browsers
 * frequently report a wrong or stale window size (overscan, late viewport
 * resolution, visualViewport differences), which is exactly what makes the UI
 * appear zoomed in or shrunken there.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let settleTimer = 0;
    let maxWaitTimer = 0;
    let fullscreenLocked = false;

    // TVs lie about the viewport in different ways: with overscan the window is
    // reported LARGER than what is actually painted on the panel (which cuts off
    // the right/bottom edge — e.g. the "E" in "Belgrade"), while during a
    // fullscreen transition one of the sources is momentarily stale. Taking the
    // SMALLEST of every credible source, and flooring it, guarantees the canvas
    // never overflows the visible area.
    const measureViewport = () => {
      const rect = host.getBoundingClientRect();
      const doc = document.documentElement;
      const vv = window.visualViewport;

      const widths = [rect.width, host.clientWidth, doc.clientWidth, window.innerWidth, vv?.width].filter(
        (n): n is number => typeof n === "number" && n > 1,
      );
      const heights = [rect.height, host.clientHeight, doc.clientHeight, window.innerHeight, vv?.height].filter(
        (n): n is number => typeof n === "number" && n > 1,
      );
      if (!widths.length || !heights.length) return null;

      return { w: Math.floor(Math.min(...widths)), h: Math.floor(Math.min(...heights)) };
    };

    const apply = (lockFullscreen = false) => {
      raf = 0;
      const vp = measureViewport();
      if (!vp) return;
      setScale((prev) => {
        const next = { x: vp.w / CANVAS_WIDTH, y: vp.h / CANVAS_HEIGHT };
        if (Math.abs(prev.x - next.x) < 0.0005 && Math.abs(prev.y - next.y) < 0.0005) return prev;
        return next;
      });
      if (lockFullscreen && isFullscreen()) {
        fullscreenLocked = true;
        window.clearTimeout(settleTimer);
        window.clearTimeout(maxWaitTimer);
      }
    };

    const lockFullscreenScale = () => {
      if (!isFullscreen() || fullscreenLocked) return;
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => apply(true));
    };

    const scheduleFullscreenLock = () => {
      if (!isFullscreen() || fullscreenLocked) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(lockFullscreenScale, FULLSCREEN_SETTLE_MS);
      if (!maxWaitTimer) {
        maxWaitTimer = window.setTimeout(lockFullscreenScale, FULLSCREEN_MAX_WAIT_MS);
      }
    };

    // TV browsers fire resize/fullscreenchange/visualViewport storms (several
    // events per frame when entering or leaving a player). Coalescing them into
    // one rAF keeps layout reads out of the middle of those bursts.
    const measure = () => {
      // Once fullscreen has reached a stable size, freeze that exact scale for
      // the entire fullscreen session. Focus changes, dialogs, player teardown,
      // visibility events and unreliable TV visualViewport updates must not be
      // allowed to resize the application afterwards.
      if (isFullscreen()) {
        if (fullscreenLocked) return;
        scheduleFullscreenLock();
        return;
      }
      window.clearTimeout(settleTimer);
      window.clearTimeout(maxWaitTimer);
      maxWaitTimer = 0;
      if (raf) return;
      raf = window.requestAnimationFrame(() => apply());
    };

    const handleFullscreenChange = () => {
      if (isFullscreen()) {
        fullscreenLocked = false;
        window.clearTimeout(maxWaitTimer);
        maxWaitTimer = 0;
        scheduleFullscreenLock();
        return;
      }

      fullscreenLocked = false;
      measure();
    };

    apply();

    if (isFullscreen()) scheduleFullscreenLock();

    const ro = new ResizeObserver(measure);
    ro.observe(host);
    ro.observe(document.documentElement);

    // TV browsers often settle on the final viewport a few frames late — and
    // sometimes only after the fullscreen animation ends (~2-6s after boot).
    const timers = [50, 150, 400, 800, 1500, 2500, 4000, 6000].map((ms) => window.setTimeout(measure, ms));

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);

    return () => {
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
      window.clearTimeout(maxWaitTimer);
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };

  }, []);


  return (
    <div ref={hostRef} className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="scale-to-fit-canvas"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: `scale(${scale.x}, ${scale.y})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
