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
 * Mobile/TV browsers report a smaller viewport height on the very first paint
 * (address bar / system UI still visible) than their steady-state height once
 * that chrome settles a moment later. Measuring immediately on mount can lock
 * in that transient, too-small height and produce a visibly "zoomed in" /
 * cropped layout. To avoid that, the scale is computed once, after a short
 * settle delay, and is never recomputed afterwards for any reason.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const apply = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w < 1 || h < 1) return;
      canvas.style.transform = `scale(${w / CANVAS_WIDTH}, ${h / CANVAS_HEIGHT})`;
    };

    // Let the browser chrome (address bar, system bars) settle to its
    // steady-state size before taking the one-and-only measurement.
    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(apply);
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
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
