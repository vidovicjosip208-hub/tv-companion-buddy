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
 * The scale is derived from document.documentElement.clientWidth/clientHeight
 * (not from a ResizeObserver on the host, and not from window.innerWidth/Height)
 * because clientWidth/clientHeight excludes the scrollbar and is not affected
 * by transient layout noise (e.g. a modal mounting/unmounting, a scrollbar
 * appearing/disappearing). The scale is established at mount and on orientation
 * change only, and remains locked otherwise so transient Android TV viewport
 * reports cannot resize the whole interface during normal use.
 */
const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.clientHeight;
      if (w < 1 || h < 1) return;
      canvas.style.transform = `scale(${w / CANVAS_WIDTH}, ${h / CANVAS_HEIGHT})`;
    };

    const measure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("orientationchange", measure);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("orientationchange", measure);
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
