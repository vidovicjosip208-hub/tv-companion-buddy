import { useEffect, useRef, useState, type ReactNode } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

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

    const apply = () => {
      raf = 0;
      const vp = measureViewport();
      if (!vp) return;
      setScale((prev) => {
        const next = { x: vp.w / CANVAS_WIDTH, y: vp.h / CANVAS_HEIGHT };
        if (Math.abs(prev.x - next.x) < 0.0005 && Math.abs(prev.y - next.y) < 0.0005) return prev;
        return next;
      });
    };

    // TV browsers fire resize/fullscreenchange/visualViewport storms (several
    // events per frame when entering or leaving a player). Coalescing them into
    // one rAF keeps layout reads out of the middle of those bursts.
    const measure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    apply();

    const ro = new ResizeObserver(measure);
    ro.observe(host);
    ro.observe(document.documentElement);

    // TV browsers often settle on the final viewport a few frames late — and
    // sometimes only after the fullscreen animation ends (~2-6s after boot).
    const timers = [50, 150, 400, 800, 1500, 2500, 4000, 6000].map((ms) => window.setTimeout(measure, ms));

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    document.addEventListener("fullscreenchange", measure);
    document.addEventListener("visibilitychange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);

    return () => {
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("fullscreenchange", measure);
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
