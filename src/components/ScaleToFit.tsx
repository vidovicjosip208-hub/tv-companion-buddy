import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

interface ScaleToFitProps {
  children: ReactNode;
}

/**
 * Stretches the fixed reference canvas (CANVAS_WIDTH x CANVAS_HEIGHT) onto the
 * real available area so the composition is always edge to edge — identical on
 * a laptop, a phone or a TV.
 *
 * The available area is measured from the fixed wrapper instead of
 * window.innerWidth/innerHeight. A debounced ResizeObserver re-establishes the
 * scale on real size changes (window resize, fullscreen enter/exit, orientation
 * change) while the debounce filters out the transient viewport reports Android
 * TV WebViews emit while compositing overlays or releasing a video surface.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const rect = host.getBoundingClientRect();
      const w = rect.width || host.clientWidth || document.documentElement.clientWidth;
      const h = rect.height || host.clientHeight || document.documentElement.clientHeight;
      if (w < 1 || h < 1) return;
      canvas.style.transform = `scale(${w / CANVAS_WIDTH}, ${h / CANVAS_HEIGHT})`;
    };

    const measure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    // Debounced ResizeObserver: TV WebViews emit several transient viewport
    // sizes in quick succession (compositing overlays, releasing a video
    // surface). Waiting for a quiet period before applying filters those out,
    // while still picking up real size changes on desktop and TV (window
    // resize, fullscreen enter/exit, etc).
    let resizeTimer: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 250);
    });
    ro.observe(host);

    apply();
    window.addEventListener("orientationchange", measure);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return (
    <div ref={hostRef} className="fixed inset-0 overflow-hidden bg-background">
      <div
        ref={canvasRef}
        className="scale-to-fit-canvas"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: "scale(1, 1)",
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
