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

    const apply = () => {
      raf = 0;
      const rect = host.getBoundingClientRect();
      const w = rect.width || host.clientWidth || window.innerWidth;
      const h = rect.height || host.clientHeight || window.innerHeight;
      if (w < 1 || h < 1) return;
      setScale((prev) => {
        const next = { x: w / CANVAS_WIDTH, y: h / CANVAS_HEIGHT };
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


    // TV browsers often settle on the final viewport a few frames late.
    const timers = [50, 250, 800, 2000].map((ms) => window.setTimeout(measure, ms));

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
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
