import { useEffect, useState, ReactNode } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
// Above this viewport width we render the app at its native size (laptop/desktop/TV).
// Below it (tablets/phones), we scale the whole 1920x1080 canvas to fit so nothing is cut off.
const NATIVE_BREAKPOINT = 1280;

interface Props {
  children: ReactNode;
}

const ViewportScaler = ({ children }: Props) => {
  const [dims, setDims] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : DESIGN_WIDTH,
    h: typeof window !== "undefined" ? window.innerHeight : DESIGN_HEIGHT,
  }));

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Laptop / desktop / TV: render natively, no changes.
  if (dims.w >= NATIVE_BREAKPOINT) {
    return <>{children}</>;
  }

  // Smaller screens: scale the full 1920x1080 design uniformly to fit, centered (letterboxed).
  const scale = Math.min(dims.w / DESIGN_WIDTH, dims.h / DESIGN_HEIGHT);
  const scaledW = DESIGN_WIDTH * scale;
  const scaledH = DESIGN_HEIGHT * scale;
  const offsetX = (dims.w - scaledW) / 2;
  const offsetY = (dims.h - scaledH) / 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsl(var(--background))",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transformOrigin: "top left",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewportScaler;
