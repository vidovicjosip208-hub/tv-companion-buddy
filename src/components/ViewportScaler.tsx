import { useEffect, useState, ReactNode } from "react";
import { DESIGN_VIEWPORT_HEIGHT, DESIGN_VIEWPORT_WIDTH } from "@/lib/viewport";

interface Props {
  children: ReactNode;
}

const getViewportDims = () => {
  if (typeof window === "undefined") {
    return { w: DESIGN_VIEWPORT_WIDTH, h: DESIGN_VIEWPORT_HEIGHT };
  }
  // Use documentElement.clientWidth/Height — these are the layout viewport
  // values that CSS 100vw/100vh resolve to, and they are reliable on Android
  // Chrome across rotations (unlike visualViewport which can lag/include
  // browser chrome).
  const docEl = document.documentElement;
  const w = Math.round(
    docEl.clientWidth || window.innerWidth || DESIGN_VIEWPORT_WIDTH,
  );
  const h = Math.round(
    docEl.clientHeight || window.innerHeight || DESIGN_VIEWPORT_HEIGHT,
  );
  return { w, h };
};

const ViewportScaler = ({ children }: Props) => {
  const [dims, setDims] = useState(getViewportDims);

  useEffect(() => {
    const onResize = () => {
      setDims(getViewportDims());
      requestAnimationFrame(() => setDims(getViewportDims()));
      window.setTimeout(() => setDims(getViewportDims()), 150);
      window.setTimeout(() => setDims(getViewportDims()), 500);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  // Scale whenever the viewport is smaller than the native design in either
  // dimension. This guarantees mobile + tablet always see the full 1920×1080
  // layout, proportionally shrunk to fit.
  const smallerThanDesign =
    dims.w < DESIGN_VIEWPORT_WIDTH || dims.h < DESIGN_VIEWPORT_HEIGHT;
  const scaled = smallerThanDesign;

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

  // If the device is in portrait (taller than wide), rotate the 1920x1080
  // landscape design 90° so it fills the screen as landscape — exactly what
  // the user wants: identical layout to laptop, just rotated to fit the phone.
  const portrait = dims.h > dims.w;
  const availW = portrait ? dims.h : dims.w;
  const availH = portrait ? dims.w : dims.h;

  const scale = Math.min(
    availW / DESIGN_VIEWPORT_WIDTH,
    availH / DESIGN_VIEWPORT_HEIGHT,
  );
  const scaledW = DESIGN_VIEWPORT_WIDTH * scale;
  const scaledH = DESIGN_VIEWPORT_HEIGHT * scale;

  // After rotation the bounding box swaps; center within the actual viewport.
  const boxW = portrait ? scaledH : scaledW;
  const boxH = portrait ? scaledW : scaledH;
  const offsetX = (dims.w - boxW) / 2;
  const offsetY = (dims.h - boxH) / 2;

  // Build the transform. Order: translate to position, then rotate (around
  // top-left), then translate to bring rotated content back into view, then scale.
  const transform = portrait
    ? `translate(${offsetX + boxW}px, ${offsetY}px) rotate(90deg) scale(${scale})`
    : `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

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
          transform,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewportScaler;
