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
 * The scale is derived from screen.width/screen.height, not from
 * window.innerWidth/innerHeight or getBoundingClientRect(). On some TV/mirrored
 * browser environments the reported viewport size fluctuates on its own within
 * a second of load (address bar, mirroring renegotiation, etc.) even with no
 * user interaction — screen.width/height stays stable across those same
 * fluctuations. The scale is computed exactly once, on mount, and is never
 * recomputed afterwards for any reason.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.screen.width;
    const h = window.screen.height;

    // TEMP DEBUG LOG — remove once confirmed stable.
    console.log("[ScaleToFit]", { w, h, scaleX: w / CANVAS_WIDTH, scaleY: h / CANVAS_HEIGHT, time: Date.now() });

    if (w < 1 || h < 1) return;
    canvas.style.transform = `scale(${w / CANVAS_WIDTH}, ${h / CANVAS_HEIGHT})`;
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
