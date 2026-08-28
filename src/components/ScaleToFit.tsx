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
 * The available area is measured from the wrapper element itself (via
 * ResizeObserver) instead of window.innerWidth/innerHeight, because TV browsers
 * frequently report a wrong or stale window size (overscan, late viewport
 * resolution, visualViewport differences), which is exactly what makes the UI
 * appear zoomed in or shrunken there.
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

    // Do not listen to resize, ResizeObserver or visualViewport here. Android TV
    // WebViews emit transient viewport sizes while compositing overlays and while
    // releasing a video surface. Those events used to rewrite the scale of the
    // entire app, which looked like the home screen randomly changed dimensions.
    // The physical TV orientation is stable; only a real orientation/fullscreen
    // transition is allowed to establish a new scale.
    const measure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("orientationchange", measure);
    document.addEventListener("fullscreenchange", measure);
    document.addEventListener("webkitfullscreenchange", measure);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("fullscreenchange", measure);
      document.removeEventListener("webkitfullscreenchange", measure);
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
