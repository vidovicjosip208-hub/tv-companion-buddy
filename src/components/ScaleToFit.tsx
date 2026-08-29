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
 * window.innerWidth/innerHeight. A ResizeObserver re-establishes the scale on
 * real size changes (window resize, fullscreen enter/exit, orientation change,
 * player teardown). Applying is rAF-batched (not delayed by a timer) so the
 * correction happens on the very next frame instead of visibly lagging behind
 * the size change.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let raf = 0;
    let lastW = 0;
    let lastH = 0;

    const apply = () => {
      raf = 0;
      const rect = host.getBoundingClientRect();
      const w = rect.width || host.clientWidth || document.documentElement.clientWidth;
      const h = rect.height || host.clientHeight || document.documentElement.clientHeight;
      if (w < 1 || h < 1) return;
      // Skip no-op re-applies (sub-pixel noise from TV WebViews compositing
      // overlays or tearing down the video surface) so we don't keep touching
      // the transform when nothing actually changed.
      if (Math.abs(w - lastW) < 0.5 && Math.abs(h - lastH) < 0.5) return;
      lastW = w;
      lastH = h;
      canvas.style.transform = `scale(${w / CANVAS_WIDTH}, ${h / CANVAS_HEIGHT})`;
      console.log("[ScaleToFit]", { w, h, scaleX: w / CANVAS_WIDTH, scaleY: h / CANVAS_HEIGHT, time: Date.now() });
    };

    const measure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(host);
    apply();

    window.addEventListener("orientationchange", measure);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
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
