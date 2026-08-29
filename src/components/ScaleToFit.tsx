import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

interface ScaleToFitProps {
  children: ReactNode;
}

const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.screen.width;
    const h = window.screen.height;
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
