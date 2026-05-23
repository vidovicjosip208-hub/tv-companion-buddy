import { useEffect, useState, ReactNode } from "react";
import { DESIGN_VIEWPORT_HEIGHT, DESIGN_VIEWPORT_WIDTH } from "@/lib/viewport";

interface Props {
  children: ReactNode;
}

const ViewportScaler = ({ children }: Props) => {
  const [dims, setDims] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : DESIGN_VIEWPORT_WIDTH,
    h: typeof window !== "undefined" ? window.innerHeight : DESIGN_VIEWPORT_HEIGHT,
  }));

  useEffect(() => {
    const onResize = () =>
      setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const scaled = dims.w < NATIVE_BREAKPOINT;

  useEffect(() => {
    if (scaled) {
      document.documentElement.dataset.viewportScaler = "active";
    } else {
      delete document.documentElement.dataset.viewportScaler;
    }
    return () => {
      delete document.documentElement.dataset.viewportScaler;
    };
  }, [scaled]);

  if (!scaled) return <>{children}</>;

  const scale = Math.min(
    dims.w / DESIGN_VIEWPORT_WIDTH,
    dims.h / DESIGN_VIEWPORT_HEIGHT,
  );
  const scaledW = DESIGN_VIEWPORT_WIDTH * scale;
  const scaledH = DESIGN_VIEWPORT_HEIGHT * scale;
  const offsetX = (dims.w - scaledW) / 2;
  const offsetY = (dims.h - scaledH) / 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsl(var(--background))",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${DESIGN_VIEWPORT_WIDTH}px`,
          height: `${DESIGN_VIEWPORT_HEIGHT}px`,
          transformOrigin: "top left",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewportScaler;
