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
 * The scale is computed exactly ONCE, on mount, from
 * document.documentElement.clientWidth/clientHeight, and is never recomputed
 * afterwards for any reason (no ResizeObserver, no fullscreenchange, no
 * orientationchange). Anything that later changes the app's rendered content
 * (opening a dialog, leaving the player, etc.) must never re-trigger this —
 * the scale established at startup stays locked for the lifetime of the app.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
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
